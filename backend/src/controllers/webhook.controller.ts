import { Request, Response } from 'express';
import Stripe from 'stripe';
import { stripeRepository } from '../repositories/stripe.repository';
import { subscriptionService } from '../services/subscription.service';

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 *
 * IMPORTANT: This endpoint must receive raw body (not parsed JSON)
 * Configure express.raw() middleware before this route
 */
export const handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error('[Webhook] STRIPE_WEBHOOK_SECRET not configured');
    res.status(500).send('Webhook secret not configured');
    return;
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripeRepository.constructWebhookEvent(
      req.body, // This must be the raw body (Buffer)
      sig,
      endpointSecret
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Webhook] Signature verification failed: ${message}`);
    res.status(400).send(`Webhook Error: ${message}`);
    return;
  }

  // Log event type for debugging
  console.log(`[Webhook] Received event: ${event.type}`);

  try {
    // Handle the event based on type
    // Using 'any' for Stripe objects to avoid SDK version type conflicts
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;

        if (session.mode === 'subscription' && session.subscription) {
          await subscriptionService.handleCheckoutCompleted({
            id: session.id,
            customer: session.customer as string,
            subscription: session.subscription as string,
            metadata: session.metadata || {},
          });
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;

        await subscriptionService.handleSubscriptionUpdated({
          id: subscription.id,
          status: subscription.status,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: subscription.cancel_at_period_end,
          canceled_at: subscription.canceled_at,
          metadata: subscription.metadata || {},
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;

        await subscriptionService.handleSubscriptionDeleted({
          id: subscription.id,
          metadata: subscription.metadata || {},
        });
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as any;

        if (invoice.subscription) {
          const subId = typeof invoice.subscription === 'string'
            ? invoice.subscription
            : invoice.subscription.id;

          const custId = typeof invoice.customer === 'string'
            ? invoice.customer
            : invoice.customer?.id || '';

          await subscriptionService.handleInvoicePaid({
            id: invoice.id,
            subscription: subId,
            customer: custId,
            amount_due: invoice.amount_due,
            amount_paid: invoice.amount_paid,
            currency: invoice.currency,
            status: invoice.status || 'paid',
            hosted_invoice_url: invoice.hosted_invoice_url || null,
            invoice_pdf: invoice.invoice_pdf || null,
            period_start: invoice.period_start,
            period_end: invoice.period_end,
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;

        if (invoice.subscription) {
          const subscriptionId = typeof invoice.subscription === 'string'
            ? invoice.subscription
            : invoice.subscription.id;

          await subscriptionService.handlePaymentFailed({
            id: invoice.id,
            subscription: subscriptionId,
          });
        }
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    // Acknowledge receipt of the event
    res.json({ received: true });
  } catch (error) {
    console.error(`[Webhook] Error processing ${event.type}:`, error);
    // Return 200 to acknowledge receipt (Stripe will not retry)
    // Log the error for investigation
    res.json({ received: true, error: 'Processing error logged' });
  }
};

import Stripe from 'stripe';
import { stripe, STRIPE_CONFIG } from '../config/stripe';

// ==========================================
// Retry Configuration
// ==========================================

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;

async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on client errors (4xx)
      if (error instanceof Stripe.errors.StripeError) {
        if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
          throw error;
        }
      }

      if (attempt < MAX_RETRIES) {
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(
          `[Stripe] ${operationName} failed (attempt ${attempt}/${MAX_RETRIES}). Retrying in ${delay}ms...`,
          error
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`[Stripe] ${operationName} failed after ${MAX_RETRIES} attempts`);
  throw lastError;
}

// ==========================================
// Stripe Repository
// ==========================================

export class StripeRepository {
  // ==========================================
  // Customer Operations
  // ==========================================

  async findOrCreateCustomer(params: {
    email: string;
    name: string;
    patientId: string;
    existingStripeCustomerId?: string | null;
  }): Promise<Stripe.Customer> {
    const { email, name, patientId, existingStripeCustomerId } = params;

    // If customer already exists, return it
    if (existingStripeCustomerId) {
      return withRetry(
        () => stripe.customers.retrieve(existingStripeCustomerId) as Promise<Stripe.Customer>,
        'retrieveCustomer'
      );
    }

    // Search for existing customer by email
    const existingCustomers = await withRetry(
      () => stripe.customers.list({ email, limit: 1 }),
      'searchCustomerByEmail'
    );

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0];
    }

    // Create new customer
    return withRetry(
      () =>
        stripe.customers.create({
          email,
          name,
          metadata: {
            patientId,
            source: 'dermicapro',
          },
        }),
      'createCustomer'
    );
  }

  async updateCustomer(
    customerId: string,
    params: Stripe.CustomerUpdateParams
  ): Promise<Stripe.Customer> {
    return withRetry(
      () => stripe.customers.update(customerId, params),
      'updateCustomer'
    );
  }

  // ==========================================
  // Product & Price Operations
  // ==========================================

  async createProduct(params: {
    name: string;
    description?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Product> {
    return withRetry(
      () =>
        stripe.products.create({
          name: params.name,
          description: params.description,
          metadata: params.metadata,
        }),
      'createProduct'
    );
  }

  async createPrice(params: {
    productId: string;
    unitAmountCents: number;
    currency: string;
    interval: 'month' | 'year';
  }): Promise<Stripe.Price> {
    return withRetry(
      () =>
        stripe.prices.create({
          product: params.productId,
          unit_amount: params.unitAmountCents,
          currency: params.currency.toLowerCase(),
          recurring: {
            interval: params.interval,
          },
        }),
      'createPrice'
    );
  }

  // ==========================================
  // Checkout Session Operations
  // ==========================================

  async createCheckoutSession(params: {
    customerId: string;
    priceId: string;
    patientId: string;
    planId: string;
    successUrl?: string;
    cancelUrl?: string;
  }): Promise<Stripe.Checkout.Session> {
    const idempotencyKey = `checkout_${params.patientId}_${params.planId}_${Date.now()}`;

    return withRetry(
      () =>
        stripe.checkout.sessions.create(
          {
            customer: params.customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
              {
                price: params.priceId,
                quantity: 1,
              },
            ],
            success_url: params.successUrl || STRIPE_CONFIG.successUrl,
            cancel_url: params.cancelUrl || STRIPE_CONFIG.cancelUrl,
            metadata: {
              patientId: params.patientId,
              planId: params.planId,
            },
            subscription_data: {
              metadata: {
                patientId: params.patientId,
                planId: params.planId,
              },
            },
          },
          { idempotencyKey }
        ),
      'createCheckoutSession'
    );
  }

  // ==========================================
  // Customer Portal Operations
  // ==========================================

  async createPortalSession(params: {
    customerId: string;
    returnUrl?: string;
  }): Promise<Stripe.BillingPortal.Session> {
    return withRetry(
      () =>
        stripe.billingPortal.sessions.create({
          customer: params.customerId,
          return_url: params.returnUrl || STRIPE_CONFIG.customerPortalReturnUrl,
        }),
      'createPortalSession'
    );
  }

  // ==========================================
  // Subscription Operations
  // ==========================================

  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return withRetry(
      () => stripe.subscriptions.retrieve(subscriptionId),
      'getSubscription'
    );
  }

  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true
  ): Promise<Stripe.Subscription> {
    if (cancelAtPeriodEnd) {
      return withRetry(
        () =>
          stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
          }),
        'cancelSubscriptionAtPeriodEnd'
      );
    }

    return withRetry(
      () => stripe.subscriptions.cancel(subscriptionId),
      'cancelSubscriptionImmediately'
    );
  }

  async reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return withRetry(
      () =>
        stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: false,
        }),
      'reactivateSubscription'
    );
  }

  async updateSubscription(
    subscriptionId: string,
    params: Stripe.SubscriptionUpdateParams
  ): Promise<Stripe.Subscription> {
    return withRetry(
      () => stripe.subscriptions.update(subscriptionId, params),
      'updateSubscription'
    );
  }

  // ==========================================
  // Invoice Operations
  // ==========================================

  async getInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    return withRetry(
      () => stripe.invoices.retrieve(invoiceId),
      'getInvoice'
    );
  }

  async listInvoices(params: {
    customerId?: string;
    subscriptionId?: string;
    limit?: number;
  }): Promise<Stripe.ApiList<Stripe.Invoice>> {
    return withRetry(
      () =>
        stripe.invoices.list({
          customer: params.customerId,
          subscription: params.subscriptionId,
          limit: params.limit || 10,
        }),
      'listInvoices'
    );
  }

  // ==========================================
  // Webhook Verification
  // ==========================================

  constructWebhookEvent(
    payload: Buffer,
    signature: string,
    endpointSecret: string
  ): Stripe.Event {
    return stripe.webhooks.constructEvent(payload, signature, endpointSecret);
  }
}

// Singleton instance
export const stripeRepository = new StripeRepository();

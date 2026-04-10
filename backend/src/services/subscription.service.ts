import { PrismaClient, SubscriptionStatus, Prisma } from '@prisma/client';
import { stripeRepository } from '../repositories/stripe.repository';
import {
  SubscriptionDTO,
  SubscriptionPlanDTO,
  SubscriptionInvoiceDTO,
  CheckoutSessionResponse,
  PortalSessionResponse,
  formatCurrency,
  calculateDaysUntilRenewal,
  mapSubscriptionStatus,
  CreatePlanInput,
  UpdatePlanInput,
} from '../types/subscription.types';

const prisma = new PrismaClient();

// ==========================================
// Plan Mappers
// ==========================================

function mapPlanToDTO(plan: Prisma.SubscriptionPlanGetPayload<{}>): SubscriptionPlanDTO {
  return {
    id: plan.id,
    name: plan.name,
    displayName: plan.displayName,
    description: plan.description,
    tier: plan.tier,
    priceAmountCents: plan.priceAmountCents,
    priceFormatted: formatCurrency(plan.priceAmountCents, plan.currency),
    currency: plan.currency,
    billingInterval: plan.billingInterval,
    discountPercentage: Number(plan.discountPercentage),
    includedSessions: plan.includedSessions,
    priorityBooking: plan.priorityBooking,
    features: plan.features as Record<string, unknown> | null,
    isActive: plan.isActive,
  };
}

function mapSubscriptionToDTO(
  subscription: Prisma.SubscriptionGetPayload<{ include: { plan: true } }>
): SubscriptionDTO {
  const sessionsRemaining = Math.max(
    0,
    subscription.plan.includedSessions - subscription.sessionsUsedThisPeriod
  );

  return {
    id: subscription.id,
    patientId: subscription.patientId,
    planId: subscription.planId,
    plan: mapPlanToDTO(subscription.plan),
    status: subscription.status,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    canceledAt: subscription.canceledAt,
    sessionsUsedThisPeriod: subscription.sessionsUsedThisPeriod,
    sessionsRemaining,
    daysUntilRenewal: calculateDaysUntilRenewal(subscription.currentPeriodEnd),
    createdAt: subscription.createdAt,
  };
}

function mapInvoiceToDTO(
  invoice: Prisma.SubscriptionInvoiceGetPayload<{}>
): SubscriptionInvoiceDTO {
  return {
    id: invoice.id,
    subscriptionId: invoice.subscriptionId,
    stripeInvoiceId: invoice.stripeInvoiceId,
    amountDue: invoice.amountDue,
    amountPaid: invoice.amountPaid,
    amountDueFormatted: formatCurrency(invoice.amountDue, invoice.currency),
    amountPaidFormatted: formatCurrency(invoice.amountPaid, invoice.currency),
    currency: invoice.currency,
    status: invoice.status,
    paid: invoice.paid,
    hostedInvoiceUrl: invoice.hostedInvoiceUrl,
    invoicePdfUrl: invoice.invoicePdfUrl,
    periodStart: invoice.periodStart,
    periodEnd: invoice.periodEnd,
    dueDate: invoice.dueDate,
    paidAt: invoice.paidAt,
    createdAt: invoice.createdAt,
  };
}

// ==========================================
// Subscription Service
// ==========================================

export class SubscriptionService {
  // ==========================================
  // Plan Operations
  // ==========================================

  async getActivePlans(): Promise<SubscriptionPlanDTO[]> {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return plans.map(mapPlanToDTO);
  }

  async getPlanById(planId: string): Promise<SubscriptionPlanDTO | null> {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    return plan ? mapPlanToDTO(plan) : null;
  }

  async createPlan(input: CreatePlanInput): Promise<SubscriptionPlanDTO> {
    // Create product and price in Stripe
    const stripeProduct = await stripeRepository.createProduct({
      name: input.displayName,
      description: input.description || undefined,
      metadata: {
        tier: input.tier,
        planName: input.name,
      },
    });

    const stripePrice = await stripeRepository.createPrice({
      productId: stripeProduct.id,
      unitAmountCents: input.priceAmountCents,
      currency: input.currency || 'PEN',
      interval: (input.billingInterval as 'month' | 'year') || 'month',
    });

    // Create plan in database
    const plan = await prisma.subscriptionPlan.create({
      data: {
        name: input.name,
        displayName: input.displayName,
        description: input.description,
        tier: input.tier,
        priceAmountCents: input.priceAmountCents,
        currency: input.currency || 'PEN',
        billingInterval: input.billingInterval || 'month',
        discountPercentage: input.discountPercentage || 0,
        includedSessions: input.includedSessions || 0,
        priorityBooking: input.priorityBooking || false,
        features: input.features as Prisma.InputJsonValue | undefined,
        stripeProductId: stripeProduct.id,
        stripePriceId: stripePrice.id,
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder || 0,
      },
    });

    return mapPlanToDTO(plan);
  }

  async updatePlan(planId: string, input: UpdatePlanInput): Promise<SubscriptionPlanDTO> {
    const plan = await prisma.subscriptionPlan.update({
      where: { id: planId },
      data: {
        displayName: input.displayName,
        description: input.description,
        discountPercentage: input.discountPercentage,
        includedSessions: input.includedSessions,
        priorityBooking: input.priorityBooking,
        features: input.features as Prisma.InputJsonValue | undefined,
        isActive: input.isActive,
        sortOrder: input.sortOrder,
      },
    });

    return mapPlanToDTO(plan);
  }

  // ==========================================
  // Patient Subscription Operations
  // ==========================================

  async getPatientSubscription(patientId: string): Promise<SubscriptionDTO | null> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        patientId,
        status: {
          in: ['active', 'past_due', 'incomplete'],
        },
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    return subscription ? mapSubscriptionToDTO(subscription) : null;
  }

  async getPatientSubscriptionHistory(patientId: string): Promise<SubscriptionDTO[]> {
    const subscriptions = await prisma.subscription.findMany({
      where: { patientId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    return subscriptions.map(mapSubscriptionToDTO);
  }

  async createCheckoutSession(
    patientId: string,
    planId: string
  ): Promise<CheckoutSessionResponse> {
    // Get patient
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new Error('Paciente no encontrado');
    }

    // Check if patient already has an active subscription
    const existingSubscription = await this.getPatientSubscription(patientId);
    if (existingSubscription && existingSubscription.status === 'active') {
      throw new Error('Ya tienes una suscripción activa');
    }

    // Get plan
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.isActive) {
      throw new Error('Plan no disponible');
    }

    if (!plan.stripePriceId) {
      throw new Error('Plan no configurado en Stripe');
    }

    // Find or create Stripe customer
    const stripeCustomer = await stripeRepository.findOrCreateCustomer({
      email: patient.email || `${patient.dni}@dermicapro.local`,
      name: `${patient.firstName} ${patient.lastName}`,
      patientId: patient.id,
      existingStripeCustomerId: patient.stripeCustomerId,
    });

    // Update patient with Stripe customer ID if new
    if (!patient.stripeCustomerId) {
      await prisma.patient.update({
        where: { id: patientId },
        data: { stripeCustomerId: stripeCustomer.id },
      });
    }

    // Create checkout session
    const session = await stripeRepository.createCheckoutSession({
      customerId: stripeCustomer.id,
      priceId: plan.stripePriceId,
      patientId,
      planId,
    });

    return {
      sessionId: session.id,
      url: session.url!,
    };
  }

  async createPortalSession(patientId: string): Promise<PortalSessionResponse> {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient?.stripeCustomerId) {
      throw new Error('No tienes una cuenta de facturación configurada');
    }

    const session = await stripeRepository.createPortalSession({
      customerId: patient.stripeCustomerId,
    });

    return { url: session.url };
  }

  async cancelSubscription(
    patientId: string,
    reason?: string
  ): Promise<SubscriptionDTO> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        patientId,
        status: 'active',
      },
      include: { plan: true },
    });

    if (!subscription) {
      throw new Error('No tienes una suscripción activa');
    }

    if (!subscription.stripeSubscriptionId) {
      throw new Error('Suscripción no vinculada a Stripe');
    }

    // Cancel in Stripe (at period end)
    await stripeRepository.cancelSubscription(
      subscription.stripeSubscriptionId,
      true // cancelAtPeriodEnd
    );

    // Update local record
    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: true,
        cancellationReason: reason,
      },
      include: { plan: true },
    });

    return mapSubscriptionToDTO(updated);
  }

  async reactivateSubscription(patientId: string): Promise<SubscriptionDTO> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        patientId,
        status: 'active',
        cancelAtPeriodEnd: true,
      },
      include: { plan: true },
    });

    if (!subscription) {
      throw new Error('No tienes una suscripción pendiente de cancelación');
    }

    if (!subscription.stripeSubscriptionId) {
      throw new Error('Suscripción no vinculada a Stripe');
    }

    // Reactivate in Stripe
    await stripeRepository.reactivateSubscription(subscription.stripeSubscriptionId);

    // Update local record
    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: false,
        cancellationReason: null,
      },
      include: { plan: true },
    });

    return mapSubscriptionToDTO(updated);
  }

  // ==========================================
  // Invoice Operations
  // ==========================================

  async getPatientInvoices(patientId: string): Promise<SubscriptionInvoiceDTO[]> {
    const subscription = await prisma.subscription.findFirst({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return [];
    }

    const invoices = await prisma.subscriptionInvoice.findMany({
      where: { subscriptionId: subscription.id },
      orderBy: { createdAt: 'desc' },
    });

    return invoices.map(mapInvoiceToDTO);
  }

  // ==========================================
  // Webhook Handlers
  // ==========================================

  async handleCheckoutCompleted(session: {
    id: string;
    customer: string;
    subscription: string;
    metadata: Record<string, string>;
  }): Promise<void> {
    const { patientId, planId } = session.metadata;

    if (!patientId || !planId) {
      console.error('[Webhook] Missing metadata in checkout session');
      return;
    }

    // Get subscription details from Stripe
    // Using any to avoid Stripe SDK version type conflicts
    const stripeSubscription = await stripeRepository.getSubscription(
      session.subscription
    ) as any;

    // Create or update subscription in database
    await prisma.subscription.upsert({
      where: {
        stripeSubscriptionId: session.subscription,
      },
      create: {
        patientId,
        planId,
        status: mapSubscriptionStatus(stripeSubscription.status),
        stripeSubscriptionId: session.subscription,
        stripeCustomerId: session.customer,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      },
      update: {
        status: mapSubscriptionStatus(stripeSubscription.status),
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      },
    });

    // Update patient's Stripe customer ID if needed
    await prisma.patient.update({
      where: { id: patientId },
      data: { stripeCustomerId: session.customer },
    });

    console.log(`[Webhook] Subscription created for patient ${patientId}`);
  }

  async handleSubscriptionUpdated(subscription: {
    id: string;
    status: string;
    current_period_start: number;
    current_period_end: number;
    cancel_at_period_end: boolean;
    canceled_at: number | null;
    metadata: Record<string, string>;
  }): Promise<void> {
    const existingSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!existingSubscription) {
      console.warn(`[Webhook] Subscription ${subscription.id} not found in database`);
      return;
    }

    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: mapSubscriptionStatus(subscription.status),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : null,
      },
    });

    console.log(`[Webhook] Subscription ${subscription.id} updated`);
  }

  async handleSubscriptionDeleted(subscription: {
    id: string;
    metadata: Record<string, string>;
  }): Promise<void> {
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: 'canceled',
        canceledAt: new Date(),
      },
    });

    console.log(`[Webhook] Subscription ${subscription.id} canceled`);
  }

  async handleInvoicePaid(invoice: {
    id: string;
    subscription: string;
    customer: string;
    amount_due: number;
    amount_paid: number;
    currency: string;
    status: string;
    hosted_invoice_url: string | null;
    invoice_pdf: string | null;
    period_start: number;
    period_end: number;
  }): Promise<void> {
    const subscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: invoice.subscription },
    });

    if (!subscription) {
      console.warn(`[Webhook] Subscription for invoice ${invoice.id} not found`);
      return;
    }

    // Create invoice record
    await prisma.subscriptionInvoice.upsert({
      where: { stripeInvoiceId: invoice.id },
      create: {
        subscriptionId: subscription.id,
        stripeInvoiceId: invoice.id,
        amountDue: invoice.amount_due,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency.toUpperCase(),
        status: invoice.status,
        paid: true,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        invoicePdfUrl: invoice.invoice_pdf,
        periodStart: new Date(invoice.period_start * 1000),
        periodEnd: new Date(invoice.period_end * 1000),
        paidAt: new Date(),
      },
      update: {
        amountPaid: invoice.amount_paid,
        status: invoice.status,
        paid: true,
        paidAt: new Date(),
      },
    });

    // Reset sessions used for new period
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        sessionsUsedThisPeriod: 0,
        currentPeriodStart: new Date(invoice.period_start * 1000),
        currentPeriodEnd: new Date(invoice.period_end * 1000),
      },
    });

    console.log(`[Webhook] Invoice ${invoice.id} paid`);
  }

  async handlePaymentFailed(invoice: {
    id: string;
    subscription: string;
  }): Promise<void> {
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: invoice.subscription },
      data: { status: 'past_due' },
    });

    console.log(`[Webhook] Payment failed for subscription ${invoice.subscription}`);
  }

  // ==========================================
  // Benefit Operations
  // ==========================================

  async useIncludedSession(patientId: string): Promise<{
    success: boolean;
    sessionsRemaining: number;
  }> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        patientId,
        status: 'active',
      },
      include: { plan: true },
    });

    if (!subscription) {
      return { success: false, sessionsRemaining: 0 };
    }

    const sessionsRemaining =
      subscription.plan.includedSessions - subscription.sessionsUsedThisPeriod;

    if (sessionsRemaining <= 0) {
      return { success: false, sessionsRemaining: 0 };
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        sessionsUsedThisPeriod: { increment: 1 },
      },
    });

    return {
      success: true,
      sessionsRemaining: sessionsRemaining - 1,
    };
  }

  async getPatientDiscount(patientId: string): Promise<number> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        patientId,
        status: 'active',
      },
      include: { plan: true },
    });

    if (!subscription) {
      return 0;
    }

    return Number(subscription.plan.discountPercentage);
  }

  // ==========================================
  // Admin Operations
  // ==========================================

  async getAllSubscriptions(params: {
    status?: SubscriptionStatus;
    page?: number;
    limit?: number;
  }): Promise<{
    data: SubscriptionDTO[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const where = params.status ? { status: params.status } : {};

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.subscription.count({ where }),
    ]);

    return {
      data: subscriptions.map(mapSubscriptionToDTO),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}

// Singleton instance
export const subscriptionService = new SubscriptionService();

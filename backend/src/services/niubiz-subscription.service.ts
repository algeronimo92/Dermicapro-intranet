/**
 * Niubiz Subscription Service
 *
 * Maneja suscripciones con pagos recurrentes usando Niubiz.
 * A diferencia de Stripe, Niubiz no maneja la recurrencia automáticamente,
 * por lo que implementamos nuestro propio sistema de cobros programados.
 *
 * Flujo:
 * 1. Usuario selecciona plan -> createPaymentSession()
 * 2. Usuario completa pago en frontend -> processInitialPayment()
 * 3. Se guarda token de tarjeta y se crea suscripción activa
 * 4. Cron job diario -> processRecurringPayments()
 */

import { PrismaClient, SubscriptionStatus, Prisma } from '@prisma/client';
import { niubizRepository, NiubizAuthorizationResponse } from '../repositories/niubiz.repository';
import {
  SubscriptionDTO,
  SubscriptionPlanDTO,
  SubscriptionInvoiceDTO,
  formatCurrency,
  calculateDaysUntilRenewal,
} from '../types/subscription.types';
import { NIUBIZ_CONFIG } from '../config/niubiz';

const prisma = new PrismaClient();

// ==========================================
// Types
// ==========================================

export interface NiubizPaymentSessionResponse {
  sessionKey: string;
  merchantId: string;
  purchaseNumber: string;
  amount: string;
  checkoutJs: string;
  callbackUrl: string;
  expiresAt: number;
}

export interface ProcessPaymentParams {
  patientId: string;
  planId: string;
  transactionToken: string; // Token retornado por el formulario Niubiz
  clientIp: string;
}

// ==========================================
// Mappers
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
    stripeInvoiceId: invoice.niubizTransactionId || invoice.stripeInvoiceId || '',
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
// Niubiz Subscription Service
// ==========================================

export class NiubizSubscriptionService {
  // ==========================================
  // Plan Operations (same as before)
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

  // ==========================================
  // Patient Subscription Operations
  // ==========================================

  async getPatientSubscription(patientId: string): Promise<SubscriptionDTO | null> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        patientId,
        status: { in: ['active', 'past_due', 'incomplete'] },
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    return subscription ? mapSubscriptionToDTO(subscription) : null;
  }

  /**
   * Crear sesión de pago para el frontend
   * El frontend usará estos datos para mostrar el formulario Niubiz
   */
  async createPaymentSession(
    patientId: string,
    planId: string,
    clientIp: string
  ): Promise<NiubizPaymentSessionResponse> {
    // Verificar paciente
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new Error('Paciente no encontrado');
    }

    // Verificar si ya tiene suscripción activa
    const existingSubscription = await this.getPatientSubscription(patientId);
    if (existingSubscription && existingSubscription.status === 'active') {
      throw new Error('Ya tienes una suscripción activa');
    }

    // Obtener plan
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.isActive) {
      throw new Error('Plan no disponible');
    }

    // Generar número de orden único
    const purchaseNumber = this.generatePurchaseNumber();
    const amount = plan.priceAmountCents / 100; // Convertir de céntimos a soles

    // Crear sesión en Niubiz
    const session = await niubizRepository.createSessionToken({
      amount,
      clientIp,
      email: patient.email || undefined,
      firstName: patient.firstName,
      lastName: patient.lastName,
      documentNumber: patient.dni,
    });

    // Obtener config para frontend
    const checkoutConfig = niubizRepository.getCheckoutConfig(
      session.sessionKey,
      amount,
      purchaseNumber
    );

    // Guardar datos de sesión para validar después (en metadata de una suscripción temporal)
    await prisma.subscription.upsert({
      where: {
        id: `temp_${patientId}_${planId}`,
      },
      create: {
        id: `temp_${patientId}_${planId}`,
        patientId,
        planId,
        status: 'incomplete',
        paymentGateway: 'niubiz',
        metadata: {
          purchaseNumber,
          sessionKey: session.sessionKey,
          amount,
          createdAt: new Date().toISOString(),
        },
      },
      update: {
        metadata: {
          purchaseNumber,
          sessionKey: session.sessionKey,
          amount,
          createdAt: new Date().toISOString(),
        },
      },
    });

    return {
      sessionKey: checkoutConfig.sessionKey,
      merchantId: checkoutConfig.merchantId,
      purchaseNumber,
      amount: checkoutConfig.amount,
      checkoutJs: checkoutConfig.checkoutJs,
      callbackUrl: checkoutConfig.callbackUrl,
      expiresAt: session.expirationTime,
    };
  }

  /**
   * Procesar pago inicial (llamado después de que el usuario completa el formulario)
   */
  async processInitialPayment(params: ProcessPaymentParams): Promise<SubscriptionDTO> {
    const { patientId, planId, transactionToken, clientIp } = params;

    // Obtener paciente y plan
    const [patient, plan] = await Promise.all([
      prisma.patient.findUnique({ where: { id: patientId } }),
      prisma.subscriptionPlan.findUnique({ where: { id: planId } }),
    ]);

    if (!patient) throw new Error('Paciente no encontrado');
    if (!plan) throw new Error('Plan no encontrado');

    // Obtener datos de la sesión temporal
    const tempSubscription = await prisma.subscription.findUnique({
      where: { id: `temp_${patientId}_${planId}` },
    });

    const metadata = tempSubscription?.metadata as Record<string, unknown> | null;
    const purchaseNumber = metadata?.purchaseNumber as string || this.generatePurchaseNumber();
    const amount = plan.priceAmountCents / 100;

    // Realizar cobro con Niubiz
    let authResponse: NiubizAuthorizationResponse;
    try {
      authResponse = await niubizRepository.authorizePayment({
        sessionKey: transactionToken,
        purchaseNumber,
        amount,
        clientIp,
        email: patient.email || `${patient.dni}@dermicapro.local`,
        firstName: patient.firstName,
        lastName: patient.lastName,
        documentNumber: patient.dni,
      });
    } catch (error) {
      console.error('[Niubiz] Payment authorization failed:', error);
      throw new Error('Error al procesar el pago. Por favor intenta nuevamente.');
    }

    // Calcular fechas del período
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Crear/actualizar suscripción en transacción
    const subscription = await prisma.$transaction(async (tx) => {
      // Guardar token de tarjeta en paciente
      await tx.patient.update({
        where: { id: patientId },
        data: {
          niubizCardToken: authResponse.transactionToken || transactionToken,
          niubizCardBrand: authResponse.dataMap.BRAND,
          niubizCardLastFour: authResponse.dataMap.CARD,
        },
      });

      // Eliminar suscripción temporal si existe
      if (tempSubscription) {
        await tx.subscription.delete({
          where: { id: `temp_${patientId}_${planId}` },
        }).catch(() => {}); // Ignorar si no existe
      }

      // Crear suscripción activa
      const sub = await tx.subscription.create({
        data: {
          patientId,
          planId,
          status: 'active',
          paymentGateway: 'niubiz',
          niubizLastTransactionId: authResponse.transactionUUID,
          niubizLastPaymentDate: now,
          niubizNextPaymentDate: periodEnd,
          niubizRetryCount: 0,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
        include: { plan: true },
      });

      // Crear invoice del pago inicial
      await tx.subscriptionInvoice.create({
        data: {
          subscriptionId: sub.id,
          niubizTransactionId: authResponse.transactionUUID,
          niubizAuthCode: authResponse.order.authorizationCode,
          niubizTraceNumber: authResponse.order.traceNumber,
          amountDue: plan.priceAmountCents,
          amountPaid: Math.round(authResponse.order.authorizedAmount * 100),
          currency: plan.currency,
          status: 'paid',
          paid: true,
          periodStart: now,
          periodEnd: periodEnd,
          paidAt: now,
        },
      });

      return sub;
    });

    console.log(`[Niubiz] Subscription created for patient ${patientId}, next payment: ${periodEnd}`);
    return mapSubscriptionToDTO(subscription);
  }

  /**
   * Cancelar suscripción (al final del período)
   */
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

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: true,
        cancellationReason: reason,
      },
      include: { plan: true },
    });

    console.log(`[Niubiz] Subscription ${subscription.id} scheduled for cancellation`);
    return mapSubscriptionToDTO(updated);
  }

  /**
   * Reactivar suscripción cancelada
   */
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
  // Recurring Payment Processing (for Cron Job)
  // ==========================================

  /**
   * Procesar todos los cobros recurrentes pendientes
   * Llamar desde un cron job diario
   */
  async processRecurringPayments(): Promise<{
    processed: number;
    successful: number;
    failed: number;
    cancelled: number;
  }> {
    const now = new Date();
    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      cancelled: 0,
    };

    // Buscar suscripciones con pago pendiente
    const subscriptionsDue = await prisma.subscription.findMany({
      where: {
        paymentGateway: 'niubiz',
        status: 'active',
        cancelAtPeriodEnd: false,
        niubizNextPaymentDate: { lte: now },
      },
      include: {
        plan: true,
        patient: true,
      },
    });

    console.log(`[Niubiz Cron] Found ${subscriptionsDue.length} subscriptions due for payment`);

    for (const subscription of subscriptionsDue) {
      results.processed++;

      try {
        await this.processRecurringPaymentForSubscription(subscription);
        results.successful++;
      } catch (error) {
        console.error(`[Niubiz Cron] Failed to process subscription ${subscription.id}:`, error);
        results.failed++;

        // Incrementar contador de reintentos
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            niubizRetryCount: { increment: 1 },
            // Marcar como past_due después de 3 intentos
            ...(subscription.niubizRetryCount >= 2 ? { status: 'past_due' } : {}),
          },
        });
      }
    }

    // Procesar cancelaciones programadas
    const subscriptionsToCancel = await prisma.subscription.findMany({
      where: {
        status: 'active',
        cancelAtPeriodEnd: true,
        currentPeriodEnd: { lte: now },
      },
    });

    for (const subscription of subscriptionsToCancel) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'canceled',
          canceledAt: now,
        },
      });
      results.cancelled++;
    }

    console.log(`[Niubiz Cron] Results: ${JSON.stringify(results)}`);
    return results;
  }

  /**
   * Procesar pago recurrente para una suscripción específica
   */
  private async processRecurringPaymentForSubscription(
    subscription: Prisma.SubscriptionGetPayload<{
      include: { plan: true; patient: true };
    }>
  ): Promise<void> {
    const { patient, plan } = subscription;

    if (!patient.niubizCardToken) {
      throw new Error('Patient has no saved card token');
    }

    const purchaseNumber = this.generatePurchaseNumber();
    const amount = plan.priceAmountCents / 100;

    // Realizar cobro con token guardado
    const authResponse = await niubizRepository.processRecurringPayment({
      cardToken: patient.niubizCardToken,
      purchaseNumber,
      amount,
      email: patient.email || `${patient.dni}@dermicapro.local`,
      firstName: patient.firstName,
      lastName: patient.lastName,
    });

    // Calcular nuevo período
    const periodStart = subscription.currentPeriodEnd || new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Actualizar suscripción y crear invoice
    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          niubizLastTransactionId: authResponse.transactionUUID,
          niubizLastPaymentDate: new Date(),
          niubizNextPaymentDate: periodEnd,
          niubizRetryCount: 0,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          sessionsUsedThisPeriod: 0, // Reset de sesiones usadas
        },
      });

      await tx.subscriptionInvoice.create({
        data: {
          subscriptionId: subscription.id,
          niubizTransactionId: authResponse.transactionUUID,
          niubizAuthCode: authResponse.order.authorizationCode,
          niubizTraceNumber: authResponse.order.traceNumber,
          amountDue: plan.priceAmountCents,
          amountPaid: Math.round(authResponse.order.authorizedAmount * 100),
          currency: plan.currency,
          status: 'paid',
          paid: true,
          periodStart,
          periodEnd,
          paidAt: new Date(),
        },
      });
    });

    console.log(`[Niubiz] Recurring payment successful for subscription ${subscription.id}`);
  }

  // ==========================================
  // Benefit Operations (same as before)
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

  // ==========================================
  // Helpers
  // ==========================================

  private generatePurchaseNumber(): string {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `SUB${timestamp}${random}`;
  }
}

// Singleton instance
export const niubizSubscriptionService = new NiubizSubscriptionService();

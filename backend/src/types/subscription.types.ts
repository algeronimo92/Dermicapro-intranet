import { SubscriptionStatus, SubscriptionPlanTier } from '@prisma/client';
import { z } from 'zod';

// ==========================================
// DTOs / Response Types
// ==========================================

export interface SubscriptionPlanDTO {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  tier: SubscriptionPlanTier;
  priceAmountCents: number;
  priceFormatted: string; // "S/ 80.00"
  currency: string;
  billingInterval: string;
  discountPercentage: number;
  includedSessions: number;
  priorityBooking: boolean;
  features: Record<string, unknown> | null;
  isActive: boolean;
}

export interface SubscriptionDTO {
  id: string;
  patientId: string;
  planId: string;
  plan: SubscriptionPlanDTO;
  status: SubscriptionStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  sessionsUsedThisPeriod: number;
  sessionsRemaining: number;
  daysUntilRenewal: number | null;
  createdAt: Date;
}

export interface SubscriptionInvoiceDTO {
  id: string;
  subscriptionId: string;
  stripeInvoiceId: string;
  amountDue: number;
  amountPaid: number;
  amountDueFormatted: string;
  amountPaidFormatted: string;
  currency: string;
  status: string;
  paid: boolean;
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date | null;
  paidAt: Date | null;
  createdAt: Date;
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface PortalSessionResponse {
  url: string;
}

// ==========================================
// Request Validation Schemas (Zod)
// ==========================================

export const createCheckoutSessionSchema = z.object({
  planId: z.string().uuid('Plan ID inválido'),
});

export const cancelSubscriptionSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const createPlanSchema = z.object({
  name: z.string().min(1).max(50),
  displayName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  tier: z.enum(['regular', 'pro']),
  priceAmountCents: z.number().int().positive(),
  currency: z.string().length(3).default('PEN'),
  billingInterval: z.enum(['month', 'year']).default('month'),
  discountPercentage: z.number().min(0).max(100).default(0),
  includedSessions: z.number().int().min(0).default(0),
  priorityBooking: z.boolean().default(false),
  features: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const updatePlanSchema = createPlanSchema.partial();

// ==========================================
// Inferred Types from Schemas
// ==========================================

export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>;
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

// ==========================================
// Stripe Webhook Event Types
// ==========================================

export type StripeWebhookEventType =
  | 'checkout.session.completed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | 'customer.created';

// ==========================================
// Utility Functions
// ==========================================

export function formatCurrency(amountCents: number, currency: string = 'PEN'): string {
  const amount = amountCents / 100;
  if (currency === 'PEN') {
    return `S/ ${amount.toFixed(2)}`;
  }
  return `${currency} ${amount.toFixed(2)}`;
}

export function calculateDaysUntilRenewal(periodEnd: Date | null): number | null {
  if (!periodEnd) return null;
  const now = new Date();
  const diffTime = periodEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

export function mapSubscriptionStatus(stripeStatus: string): SubscriptionStatus {
  const statusMap: Record<string, SubscriptionStatus> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    incomplete: 'incomplete',
    incomplete_expired: 'incomplete_expired',
    unpaid: 'unpaid',
    paused: 'paused',
    trialing: 'active', // Treat trialing as active since we don't use trials
  };
  return statusMap[stripeStatus] || 'incomplete';
}

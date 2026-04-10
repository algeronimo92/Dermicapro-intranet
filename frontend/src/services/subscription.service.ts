import patientApi from './patientApi';

// ==========================================
// Types
// ==========================================

export interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  tier: 'regular' | 'pro';
  priceAmountCents: number;
  priceFormatted: string;
  currency: string;
  billingInterval: string;
  discountPercentage: number;
  includedSessions: number;
  priorityBooking: boolean;
  features: Record<string, unknown> | null;
  isActive: boolean;
}

export interface Subscription {
  id: string;
  patientId: string;
  planId: string;
  plan: SubscriptionPlan;
  status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid' | 'paused';
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  sessionsUsedThisPeriod: number;
  sessionsRemaining: number;
  daysUntilRenewal: number | null;
  createdAt: string;
}

export interface SubscriptionInvoice {
  id: string;
  subscriptionId: string;
  stripeInvoiceId: string; // También se usa para niubizTransactionId
  amountDue: number;
  amountPaid: number;
  amountDueFormatted: string;
  amountPaidFormatted: string;
  currency: string;
  status: string;
  paid: boolean;
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
  periodStart: string;
  periodEnd: string;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
}

// Niubiz Payment Session Response
export interface NiubizPaymentSession {
  sessionKey: string;
  merchantId: string;
  purchaseNumber: string;
  amount: string;
  checkoutJs: string;
  callbackUrl: string;
  expiresAt: number;
}

// ==========================================
// API Functions
// ==========================================

/**
 * Get all active subscription plans
 */
export async function getPlans(): Promise<SubscriptionPlan[]> {
  const response = await patientApi.get('/subscriptions/plans');
  return response.data.data;
}

/**
 * Get a specific plan by ID
 */
export async function getPlanById(planId: string): Promise<SubscriptionPlan> {
  const response = await patientApi.get(`/subscriptions/plans/${planId}`);
  return response.data.data;
}

/**
 * Get current patient's subscription
 */
export async function getMySubscription(): Promise<Subscription | null> {
  const response = await patientApi.get('/subscriptions/me');
  return response.data.data;
}

/**
 * Create a Niubiz payment session to subscribe to a plan
 * Returns data needed to render the Niubiz payment form
 */
export async function createPaymentSession(
  planId: string
): Promise<NiubizPaymentSession> {
  const response = await patientApi.post('/subscriptions/create-payment-session', {
    planId,
  });
  return response.data.data;
}

/**
 * Process payment after Niubiz form completion
 */
export async function processPayment(
  planId: string,
  transactionToken: string
): Promise<Subscription> {
  const response = await patientApi.post('/subscriptions/process-payment', {
    planId,
    transactionToken,
  });
  return response.data.data;
}

/**
 * Cancel current subscription (at period end)
 */
export async function cancelSubscription(reason?: string): Promise<Subscription> {
  const response = await patientApi.post('/subscriptions/cancel', { reason });
  return response.data.data;
}

/**
 * Reactivate a subscription that was scheduled for cancellation
 */
export async function reactivateSubscription(): Promise<Subscription> {
  const response = await patientApi.post('/subscriptions/reactivate');
  return response.data.data;
}

/**
 * Get patient's subscription invoices
 */
export async function getMyInvoices(): Promise<SubscriptionInvoice[]> {
  const response = await patientApi.get('/subscriptions/invoices');
  return response.data.data;
}

// ==========================================
// Utility Functions
// ==========================================

/**
 * Get status label in Spanish
 */
export function getStatusLabel(status: Subscription['status']): string {
  const labels: Record<Subscription['status'], string> = {
    active: 'Activa',
    past_due: 'Pago pendiente',
    canceled: 'Cancelada',
    incomplete: 'Incompleta',
    incomplete_expired: 'Expirada',
    unpaid: 'Sin pagar',
    paused: 'Pausada',
  };
  return labels[status] || status;
}

/**
 * Get status color for badge
 */
export function getStatusColor(
  status: Subscription['status']
): 'success' | 'warning' | 'error' | 'default' {
  const colors: Record<Subscription['status'], 'success' | 'warning' | 'error' | 'default'> = {
    active: 'success',
    past_due: 'warning',
    canceled: 'error',
    incomplete: 'warning',
    incomplete_expired: 'error',
    unpaid: 'error',
    paused: 'default',
  };
  return colors[status] || 'default';
}

/**
 * Format date for display
 */
export function formatSubscriptionDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Load Niubiz checkout script dynamically
 */
export function loadNiubizScript(scriptUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (document.querySelector(`script[src="${scriptUrl}"]`)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Niubiz script'));
    document.body.appendChild(script);
  });
}

export default {
  getPlans,
  getPlanById,
  getMySubscription,
  createPaymentSession,
  processPayment,
  cancelSubscription,
  reactivateSubscription,
  getMyInvoices,
  getStatusLabel,
  getStatusColor,
  formatSubscriptionDate,
  loadNiubizScript,
};

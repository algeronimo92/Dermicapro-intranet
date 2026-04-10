import { Request, Response } from 'express';
import { niubizSubscriptionService } from '../services/niubiz-subscription.service';
import {
  createCheckoutSessionSchema,
  cancelSubscriptionSchema,
} from '../types/subscription.types';

// ==========================================
// Public Endpoints
// ==========================================

/**
 * GET /api/subscriptions/plans
 * List all active subscription plans (public)
 */
export const getPlans = async (_req: Request, res: Response): Promise<void> => {
  try {
    const plans = await niubizSubscriptionService.getActivePlans();

    res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error('Error getting plans:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener los planes',
    });
  }
};

/**
 * GET /api/subscriptions/plans/:id
 * Get a specific plan by ID (public)
 */
export const getPlanById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const plan = await niubizSubscriptionService.getPlanById(id);

    if (!plan) {
      res.status(404).json({
        success: false,
        error: 'Plan no encontrado',
      });
      return;
    }

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error('Error getting plan:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el plan',
    });
  }
};

// ==========================================
// Patient Endpoints (requires authenticatePatient)
// ==========================================

/**
 * GET /api/subscriptions/me
 * Get current patient's subscription
 */
export const getMySubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const patientId = req.patient!.id;
    const subscription = await niubizSubscriptionService.getPatientSubscription(patientId);

    res.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    console.error('Error getting subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener la suscripción',
    });
  }
};

/**
 * POST /api/subscriptions/create-payment-session
 * Create a Niubiz payment session for subscription
 */
export const createPaymentSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const patientId = req.patient!.id;

    // Validate input
    const result = createCheckoutSessionSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: result.error.issues,
      });
      return;
    }

    const { planId } = result.data;
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    const session = await niubizSubscriptionService.createPaymentSession(
      patientId,
      planId,
      clientIp
    );

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Error creating payment session:', error);
    const message = error instanceof Error ? error.message : 'Error al crear la sesión de pago';
    res.status(400).json({
      success: false,
      error: message,
    });
  }
};

/**
 * POST /api/subscriptions/process-payment
 * Process the payment after user completes Niubiz form
 */
export const processPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const patientId = req.patient!.id;
    const { planId, transactionToken } = req.body;

    if (!planId || !transactionToken) {
      res.status(400).json({
        success: false,
        error: 'planId y transactionToken son requeridos',
      });
      return;
    }

    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    const subscription = await niubizSubscriptionService.processInitialPayment({
      patientId,
      planId,
      transactionToken,
      clientIp,
    });

    res.json({
      success: true,
      data: subscription,
      message: 'Suscripción activada exitosamente',
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    const message = error instanceof Error ? error.message : 'Error al procesar el pago';
    res.status(400).json({
      success: false,
      error: message,
    });
  }
};

/**
 * POST /api/subscriptions/cancel
 * Cancel current subscription (at period end)
 */
export const cancelSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const patientId = req.patient!.id;

    // Validate input
    const result = cancelSubscriptionSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: result.error.issues,
      });
      return;
    }

    const subscription = await niubizSubscriptionService.cancelSubscription(
      patientId,
      result.data.reason
    );

    res.json({
      success: true,
      data: subscription,
      message: 'Suscripción cancelada. Mantendrás acceso hasta el fin del período actual.',
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    const message = error instanceof Error ? error.message : 'Error al cancelar la suscripción';
    res.status(400).json({
      success: false,
      error: message,
    });
  }
};

/**
 * POST /api/subscriptions/reactivate
 * Reactivate a subscription that was scheduled for cancellation
 */
export const reactivateSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const patientId = req.patient!.id;
    const subscription = await niubizSubscriptionService.reactivateSubscription(patientId);

    res.json({
      success: true,
      data: subscription,
      message: 'Suscripción reactivada exitosamente.',
    });
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    const message = error instanceof Error ? error.message : 'Error al reactivar la suscripción';
    res.status(400).json({
      success: false,
      error: message,
    });
  }
};

/**
 * GET /api/subscriptions/invoices
 * Get patient's subscription invoices
 */
export const getMyInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    const patientId = req.patient!.id;
    const invoices = await niubizSubscriptionService.getPatientInvoices(patientId);

    res.json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    console.error('Error getting invoices:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener las facturas',
    });
  }
};

// ==========================================
// Admin Endpoints (requires authenticate + admin role)
// ==========================================

/**
 * GET /api/admin/subscriptions
 * List all subscriptions (admin only)
 */
export const getAllSubscriptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, page, limit } = req.query;

    const result = await niubizSubscriptionService.getAllSubscriptions({
      status: status as any,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error getting subscriptions:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener las suscripciones',
    });
  }
};

/**
 * POST /api/admin/subscriptions/process-recurring
 * Manually trigger recurring payment processing (admin only)
 * Useful for testing or manual intervention
 */
export const processRecurringPayments = async (_req: Request, res: Response): Promise<void> => {
  try {
    const results = await niubizSubscriptionService.processRecurringPayments();

    res.json({
      success: true,
      data: results,
      message: `Procesados: ${results.processed}, Exitosos: ${results.successful}, Fallidos: ${results.failed}, Cancelados: ${results.cancelled}`,
    });
  } catch (error) {
    console.error('Error processing recurring payments:', error);
    res.status(500).json({
      success: false,
      error: 'Error al procesar pagos recurrentes',
    });
  }
};

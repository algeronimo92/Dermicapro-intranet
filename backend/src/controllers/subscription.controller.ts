import { Request, Response } from 'express';
import { subscriptionService } from '../services/subscription.service';
import {
  createCheckoutSessionSchema,
  cancelSubscriptionSchema,
  createPlanSchema,
  updatePlanSchema,
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
    const plans = await subscriptionService.getActivePlans();

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
    const plan = await subscriptionService.getPlanById(id);

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
    const subscription = await subscriptionService.getPatientSubscription(patientId);

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
 * POST /api/subscriptions/create-checkout-session
 * Create a Stripe Checkout session for subscription
 */
export const createCheckoutSession = async (req: Request, res: Response): Promise<void> => {
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
    const session = await subscriptionService.createCheckoutSession(patientId, planId);

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    const message = error instanceof Error ? error.message : 'Error al crear la sesión de pago';
    res.status(400).json({
      success: false,
      error: message,
    });
  }
};

/**
 * POST /api/subscriptions/create-portal-session
 * Create a Stripe Customer Portal session
 */
export const createPortalSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const patientId = req.patient!.id;
    const session = await subscriptionService.createPortalSession(patientId);

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Error creating portal session:', error);
    const message = error instanceof Error ? error.message : 'Error al crear la sesión del portal';
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

    const subscription = await subscriptionService.cancelSubscription(
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
    const subscription = await subscriptionService.reactivateSubscription(patientId);

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
    const invoices = await subscriptionService.getPatientInvoices(patientId);

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

    const result = await subscriptionService.getAllSubscriptions({
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
 * POST /api/admin/subscription-plans
 * Create a new subscription plan (admin only)
 */
export const createPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input
    const result = createPlanSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: result.error.issues,
      });
      return;
    }

    const plan = await subscriptionService.createPlan(result.data);

    res.status(201).json({
      success: true,
      data: plan,
      message: 'Plan creado exitosamente',
    });
  } catch (error) {
    console.error('Error creating plan:', error);
    const message = error instanceof Error ? error.message : 'Error al crear el plan';
    res.status(400).json({
      success: false,
      error: message,
    });
  }
};

/**
 * PUT /api/admin/subscription-plans/:id
 * Update a subscription plan (admin only)
 */
export const updatePlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate input
    const result = updatePlanSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: result.error.issues,
      });
      return;
    }

    const plan = await subscriptionService.updatePlan(id, result.data);

    res.json({
      success: true,
      data: plan,
      message: 'Plan actualizado exitosamente',
    });
  } catch (error) {
    console.error('Error updating plan:', error);
    const message = error instanceof Error ? error.message : 'Error al actualizar el plan';
    res.status(400).json({
      success: false,
      error: message,
    });
  }
};

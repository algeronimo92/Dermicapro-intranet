import { Router } from 'express';
import { authenticatePatient } from '../middlewares/patientAuth';
import { authenticate } from '../middlewares/auth';
import { requirePermission } from '../middlewares/authorization';
import * as niubizController from '../controllers/niubiz-subscription.controller';

const router = Router();

// ==========================================
// Public Routes (no auth required)
// ==========================================

// List all active plans
router.get('/plans', niubizController.getPlans);

// Get specific plan details
router.get('/plans/:id', niubizController.getPlanById);

// ==========================================
// Patient Routes (requires patient auth)
// ==========================================

// Get my subscription
router.get('/me', authenticatePatient, niubizController.getMySubscription);

// Create payment session (Niubiz) - returns data for frontend form
router.post(
  '/create-payment-session',
  authenticatePatient,
  niubizController.createPaymentSession
);

// Process payment after Niubiz form completion
router.post(
  '/process-payment',
  authenticatePatient,
  niubizController.processPayment
);

// Cancel subscription (at period end)
router.post('/cancel', authenticatePatient, niubizController.cancelSubscription);

// Reactivate subscription
router.post(
  '/reactivate',
  authenticatePatient,
  niubizController.reactivateSubscription
);

// Get my invoices
router.get('/invoices', authenticatePatient, niubizController.getMyInvoices);

// ==========================================
// Admin Routes (requires staff auth + permissions)
// ==========================================

// List all subscriptions
router.get(
  '/admin/all',
  authenticate,
  requirePermission('subscriptions.read'),
  niubizController.getAllSubscriptions
);

// Manually trigger recurring payment processing
router.post(
  '/admin/process-recurring',
  authenticate,
  requirePermission('subscriptions.manage'),
  niubizController.processRecurringPayments
);

export default router;

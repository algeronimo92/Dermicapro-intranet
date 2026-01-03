import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import * as analyticsController from '../controllers/analytics.controller';

const router = Router();

// Middleware: solo admins
router.use(authenticate);
router.use(authorize(['admin']));

// Routes
router.get('/executive', analyticsController.getExecutiveSummary);
router.get('/financial', analyticsController.getFinancialAnalytics);
router.get('/operations', analyticsController.getOperationsAnalytics);
router.get('/sales', analyticsController.getSalesAnalytics);
router.get('/customers', analyticsController.getCustomerAnalytics);
router.get('/services', analyticsController.getServiceAnalytics);

export default router;

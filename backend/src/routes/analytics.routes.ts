import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import * as analyticsController from '../controllers/analytics.controller';

const router = Router();

router.use(authenticate);

// Routes
router.get('/executive', analyticsController.getExecutiveSummary);
router.get('/financial', analyticsController.getFinancialAnalytics);
router.get('/operations', analyticsController.getOperationsAnalytics);
router.get('/sales', analyticsController.getSalesAnalytics);
router.get('/customers', analyticsController.getCustomerAnalytics);
router.get('/services', analyticsController.getServiceAnalytics);

export default router;

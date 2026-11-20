import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { ROLES } from '../constants/roles';
import * as analyticsController from '../controllers/analytics.controller';

const router = Router();

router.use(authenticate, authorize(ROLES.ADMIN));

// Routes
router.get('/executive', analyticsController.getExecutiveSummary);
router.get('/financial', analyticsController.getFinancialAnalytics);
router.get('/operations', analyticsController.getOperationsAnalytics);
router.get('/sales', analyticsController.getSalesAnalytics);
router.get('/customers', analyticsController.getCustomerAnalytics);
router.get('/services', analyticsController.getServiceAnalytics);

export default router;

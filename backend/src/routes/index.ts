import { Router } from 'express';
import authRoutes from './auth.routes';
import patientAuthRoutes from './patientAuth.routes';
import patientsRoutes from './patients.routes';
import appointmentsRoutes from './appointments.routes';
import servicesRoutes from './services.routes';
import usersRoutes from './users.routes';
import invoicesRoutes from './invoices.routes';
import paymentsRoutes from './payments.routes';
import rolesRoutes from './roles.routes';
import permissionsRoutes from './permissions.routes';
import commissionsRoutes from './commissions.routes';
import dashboardRoutes from './dashboard.routes';
import analyticsRoutes from './analytics.routes';
import subscriptionRoutes from './subscription.routes';
import webhookRoutes from './webhook.routes';

const router = Router();

// Staff authentication
router.use('/auth', authRoutes);

// Patient authentication
router.use('/patient-auth', patientAuthRoutes);

// Staff routes
router.use('/patients', patientsRoutes);
router.use('/appointments', appointmentsRoutes);
router.use('/services', servicesRoutes);
router.use('/users', usersRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/payments', paymentsRoutes);
router.use('/roles', rolesRoutes);
router.use('/permissions', permissionsRoutes);
router.use('/commissions', commissionsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/analytics', analyticsRoutes);

// Subscription routes (patient portal)
router.use('/subscriptions', subscriptionRoutes);

// Webhooks (Stripe)
router.use('/webhooks', webhookRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

export default router;

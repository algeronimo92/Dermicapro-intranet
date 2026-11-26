import { Router } from 'express';
import authRoutes from './auth.routes';
import patientAuthRoutes from './patientAuth.routes';
import patientsRoutes from './patients.routes';
import appointmentsRoutes from './appointments.routes';
import servicesRoutes from './services.routes';
import usersRoutes from './users.routes';
import paymentOrdersRoutes from './paymentOrders.routes';
import paymentsRoutes from './payments.routes';
import invoicesRoutes from './invoices.routes';
import commissionsRoutes from './commissions.routes';
import dashboardRoutes from './dashboard.routes';
import analyticsRoutes from './analytics.routes';
import rolesRoutes from './roles.routes';
import settingsRoutes from './settings.routes';
import mailSettingsRoutes from './mailSettings.routes';
import integrationsRoutes from './integrations.routes';
import publicRoutes from './public.routes';
import inventoryRoutes from './inventory.routes';
import dbPrivilegesRoutes from './dbPrivileges.routes';
const router = Router();

// Público (sin autenticación, consumo externo)
router.use('/public', publicRoutes);

// Staff authentication
router.use('/auth', authRoutes);

// Patient authentication
router.use('/patient-auth', patientAuthRoutes);

// Staff routes
router.use('/patients', patientsRoutes);
router.use('/appointments', appointmentsRoutes);
router.use('/services', servicesRoutes);
router.use('/users', usersRoutes);
router.use('/payment-orders', paymentOrdersRoutes);
router.use('/payments', paymentsRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/commissions', commissionsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/roles', rolesRoutes);
// Antes de /settings: si no, su authenticate correría también para /settings/email.
router.use('/settings/email', mailSettingsRoutes);
router.use('/settings', settingsRoutes);
router.use('/integrations', integrationsRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/db-privileges', dbPrivilegesRoutes);

router.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

export default router;

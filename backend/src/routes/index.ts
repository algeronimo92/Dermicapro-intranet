import { Router } from 'express';
import authRoutes from './auth.routes';
import patientsRoutes from './patients.routes';
import appointmentsRoutes from './appointments.routes';
import servicesRoutes from './services.routes';
import usersRoutes from './users.routes';
import invoicesRoutes from './invoices.routes';
import paymentsRoutes from './payments.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/patients', patientsRoutes);
router.use('/appointments', appointmentsRoutes);
router.use('/services', servicesRoutes);
router.use('/users', usersRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/payments', paymentsRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

export default router;

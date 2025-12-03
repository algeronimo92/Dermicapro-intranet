import { Router } from 'express';
import authRoutes from './auth.routes';
import patientsRoutes from './patients.routes';
import appointmentsRoutes from './appointments.routes';
import sessionsRoutes from './sessions.routes';
import servicesRoutes from './services.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/patients', patientsRoutes);
router.use('/appointments', appointmentsRoutes);
router.use('/sessions', sessionsRoutes);
router.use('/services', servicesRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

export default router;

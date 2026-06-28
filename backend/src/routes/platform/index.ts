import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { platformLogin, getPlatformAdminMe } from '../../controllers/platform/auth.controller';
import {
  listTenants,
  getTenant,
  createTenantHandler,
  updateTenantHandler,
  activateTenant,
  deactivateTenant,
  getTenantMigrations,
  getTenantMetricsHandler,
  refreshTenantMetricsHandler,
} from '../../controllers/platform/tenants.controller';
import { registerTenantHandler } from '../../controllers/platform/onboarding.controller';
import { authenticatePlatformAdmin } from '../../middlewares/platformAuth';

const router = Router();

const onboardingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Demasiados intentos de registro. Intenta de nuevo en 1 hora.' });
  },
});

// Public onboarding — no auth required
router.post('/onboarding/register', onboardingLimiter, registerTenantHandler);

// Platform admin authentication
router.post('/auth/login', platformLogin);
router.get('/auth/me', authenticatePlatformAdmin, getPlatformAdminMe);

// Tenant management (all require platform admin auth)
router.get('/tenants', authenticatePlatformAdmin, listTenants);
router.post('/tenants', authenticatePlatformAdmin, createTenantHandler);
router.get('/tenants/:slug', authenticatePlatformAdmin, getTenant);
router.put('/tenants/:slug', authenticatePlatformAdmin, updateTenantHandler);
router.post('/tenants/:slug/activate', authenticatePlatformAdmin, activateTenant);
router.post('/tenants/:slug/deactivate', authenticatePlatformAdmin, deactivateTenant);
router.get('/tenants/:slug/migrations', authenticatePlatformAdmin, getTenantMigrations);
router.get('/tenants/:slug/metrics', authenticatePlatformAdmin, getTenantMetricsHandler);
router.post('/tenants/:slug/metrics/refresh', authenticatePlatformAdmin, refreshTenantMetricsHandler);

export default router;

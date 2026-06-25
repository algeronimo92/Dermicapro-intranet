import { Router } from 'express';
import { platformLogin, getPlatformAdminMe } from '../../controllers/platform/auth.controller';
import {
  listTenants,
  getTenant,
  createTenantHandler,
  updateTenantHandler,
  activateTenant,
  deactivateTenant,
  getTenantMigrations,
} from '../../controllers/platform/tenants.controller';
import { authenticatePlatformAdmin } from '../../middlewares/platformAuth';

const router = Router();

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

export default router;

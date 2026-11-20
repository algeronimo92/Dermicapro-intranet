import { Router } from 'express';
import { getSettings, updateSetting } from '../controllers/settings.controller';
import {
  createCrmToken,
  deleteCrmToken,
  getCrmIntegration,
  updateCrmIntegration,
} from '../controllers/crmIntegrationSettings.controller';
import { authenticate, authorize } from '../middlewares/auth';
import { ROLES } from '../constants/roles';

const router = Router();

router.use(authenticate);

router.get('/', getSettings);
router.patch('/', updateSetting);

// Integración con el CRM: solo administradores, también para leer. El token
// da acceso a crear pacientes, citas y pagos.
const adminOnly = authorize(ROLES.ADMIN);
router.get('/crm-integration', adminOnly, getCrmIntegration);
router.put('/crm-integration', adminOnly, updateCrmIntegration);
router.post('/crm-integration/token', adminOnly, createCrmToken);
router.delete('/crm-integration/token', adminOnly, deleteCrmToken);

export default router;

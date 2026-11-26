import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { ROLES } from '../constants/roles';
import {
  connectMailAccount,
  deleteMailSettings,
  disconnectMailAccount,
  getMailSettings,
  putMailSettings,
  sendMailTest,
} from '../controllers/mailSettings.controller';

/** Configuración -> Correo de envío. Sólo admin. */
const router = Router();

router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/', getMailSettings);
router.put('/', putMailSettings);
router.delete('/', deleteMailSettings);
router.post('/connect', connectMailAccount);
router.post('/disconnect', disconnectMailAccount);
router.post('/test', sendMailTest);

export default router;

import { Router } from 'express';
import { platformLogin, getPlatformAdminMe } from '../../controllers/platform/auth.controller';
import { authenticatePlatformAdmin } from '../../middlewares/platformAuth';

const router = Router();

router.post('/auth/login', platformLogin);
router.get('/auth/me', authenticatePlatformAdmin, getPlatformAdminMe);

export default router;

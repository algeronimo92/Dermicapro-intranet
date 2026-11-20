import { Router } from 'express';
import { getSettings, updateSetting } from '../controllers/settings.controller';
import { authenticate, authorize } from '../middlewares/auth';
import { ROLES } from '../constants/roles';

const router = Router();

router.use(authenticate);

router.get('/', getSettings);
router.patch('/', authorize(ROLES.ADMIN), updateSetting);

export default router;

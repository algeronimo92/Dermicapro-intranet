import { Router } from 'express';
import { getSettings, updateSetting } from '../controllers/settings.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', getSettings);
router.patch('/', updateSetting);

export default router;

import { Router } from 'express';
import { login, logout, refresh, me, updateMe, changePassword } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth';
import { authLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.post('/login', authLimiter, login);
router.post('/logout', authenticate, logout);
router.post('/refresh', authLimiter, refresh);
router.get('/me', authenticate, me);
router.put('/me', authenticate, updateMe);
router.put('/me/password', authenticate, changePassword);

export default router;

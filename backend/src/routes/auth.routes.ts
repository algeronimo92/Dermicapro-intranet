import { Router } from 'express';
import { login, logout, refresh, me } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth';
import { authLimiter } from '../middlewares/rateLimiter';

const router = Router();

// Aplicar rate limiting estricto a login (5 intentos por 15 min)
router.post('/login', authLimiter, login);
router.post('/logout', authenticate, logout);
router.post('/refresh', authLimiter, refresh);
router.get('/me', authenticate, me);

export default router;

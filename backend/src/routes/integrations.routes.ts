import { Router } from 'express';
import { mailOAuthCallback } from '../controllers/mailSettings.controller';
import { authLimiter } from '../middlewares/rateLimiter';

/** Retornos de proveedores externos (sin sesión: los valida su `state`). */
const router = Router();

router.get('/email/callback', authLimiter, mailOAuthCallback);

export default router;

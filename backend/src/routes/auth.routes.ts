import { Router } from 'express';
import { login, logout, refresh, me, updateMe, changePassword, loginWithPin, setPin, removePin, myModules, forgotPassword, checkPasswordResetToken, resetPasswordWithToken } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth';
import { authLimiter, passwordResetLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.post('/login', authLimiter, login);
router.post('/login-pin', authLimiter, loginWithPin);
router.post('/logout', authenticate, logout);
router.post('/refresh', authLimiter, refresh);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password/check', authLimiter, checkPasswordResetToken);
router.post('/reset-password', authLimiter, resetPasswordWithToken);
router.get('/me', authenticate, me);
router.get('/me/modules', authenticate, myModules);
router.put('/me', authenticate, updateMe);
router.put('/me/password', authenticate, changePassword);
router.put('/me/pin', authenticate, setPin);
router.delete('/me/pin', authenticate, removePin);

export default router;

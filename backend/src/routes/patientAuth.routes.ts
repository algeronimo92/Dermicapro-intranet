import { Router } from 'express';
import * as patientAuthController from '../controllers/patientAuth.controller';
import { authLimiter } from '../middlewares/rateLimiter';
import { authenticatePatient } from '../middlewares/patientAuth';

const router = Router();

// ================================
// Rutas Públicas (con rate limiting)
// ================================

/**
 * POST /api/patient-auth/login
 * Login de paciente con email y contraseña
 */
router.post('/login', authLimiter, patientAuthController.login);

/**
 * POST /api/patient-auth/refresh
 * Refrescar access token usando refresh token
 */
router.post('/refresh', authLimiter, patientAuthController.refresh);

// ================================
// Rutas Protegidas (requieren autenticación de paciente)
// ================================

/**
 * GET /api/patient-auth/me
 * Obtener información del paciente autenticado
 */
router.get('/me', authenticatePatient, patientAuthController.me);

/**
 * POST /api/patient-auth/logout
 * Logout del paciente
 */
router.post('/logout', authenticatePatient, patientAuthController.logout);

/**
 * POST /api/patient-auth/change-password
 * Cambiar contraseña del paciente
 */
router.post('/change-password', authenticatePatient, patientAuthController.changePassword);

export default router;

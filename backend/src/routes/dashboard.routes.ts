import { Router } from 'express';
import { getDashboard, getAvailableRoles } from '../controllers/dashboard.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

/**
 * Dashboard Routes
 *
 * Todas las rutas requieren autenticación
 * El tipo de dashboard se determina automáticamente por el rol del usuario
 */

// Middleware global: todas las rutas requieren autenticación
router.use(authenticate);

/**
 * GET /api/dashboard
 * Obtiene el dashboard específico del rol del usuario autenticado
 *
 * Query params:
 * - period: 'today' | 'week' | 'month' | 'year' (opcional)
 *
 * Respuesta:
 * - Admin: financials, appointments, sales, commissions
 * - Nurse: appointments today/upcoming, patients stats, top services
 * - Sales: sales stats, commissions, goals, patients
 */
router.get('/', getDashboard);

/**
 * GET /api/dashboard/available-roles
 * Obtiene la lista de roles que tienen dashboard disponible
 * (Endpoint de utilidad para debugging)
 */
router.get('/available-roles', getAvailableRoles);

export default router;

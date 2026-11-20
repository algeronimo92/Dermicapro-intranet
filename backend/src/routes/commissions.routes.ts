import express from 'express';
import {
  getAllCommissions,
  getCommissionById,
  getCommissionsSummaryBySales,
  approveCommission,
  rejectCommission,
  markAsPaid,
  batchApprove,
  batchMarkAsPaid,
  cancelCommission,
} from '../controllers/commissions.controller';
import { authenticate, authorize } from '../middlewares/auth';
import { ROLES } from '../constants/roles';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * GET /api/commissions
 * Obtener todas las comisiones (con filtros)
 * Vendedores: solo sus comisiones
 * Admin: todas las comisiones
 */
router.get('/', authorize(ROLES.ADMIN, ROLES.SALES), getAllCommissions);

/**
 * GET /api/commissions/summary
 * Obtener resumen de comisiones por vendedor
 * Solo admin
 */
router.get('/summary', authorize(ROLES.ADMIN), getCommissionsSummaryBySales);

/**
 * GET /api/commissions/:id
 * Obtener una comisión por ID
 * Vendedores: solo su comisión
 * Admin: cualquier comisión
 */
router.get('/:id', authorize(ROLES.ADMIN, ROLES.SALES), getCommissionById);

/**
 * POST /api/commissions/:id/approve
 * Aprobar una comisión
 * Solo admin
 */
router.post('/:id/approve', authorize(ROLES.ADMIN), approveCommission);

/**
 * POST /api/commissions/:id/reject
 * Rechazar una comisión
 * Solo admin
 */
router.post('/:id/reject', authorize(ROLES.ADMIN), rejectCommission);

/**
 * POST /api/commissions/:id/pay
 * Marcar comisión como pagada
 * Solo admin
 */
router.post('/:id/pay', authorize(ROLES.ADMIN), markAsPaid);

/**
 * POST /api/commissions/:id/cancel
 * Cancelar una comisión
 * Solo admin
 */
router.post('/:id/cancel', authorize(ROLES.ADMIN), cancelCommission);

/**
 * POST /api/commissions/batch/approve
 * Aprobar múltiples comisiones
 * Solo admin
 */
router.post('/batch/approve', authorize(ROLES.ADMIN), batchApprove);

/**
 * POST /api/commissions/batch/pay
 * Marcar múltiples comisiones como pagadas
 * Solo admin
 */
router.post('/batch/pay', authorize(ROLES.ADMIN), batchMarkAsPaid);

export default router;

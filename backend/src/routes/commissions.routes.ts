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
import { authenticate } from '../middlewares/auth';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * GET /api/commissions
 * Obtener todas las comisiones (con filtros)
 * Vendedores: solo sus comisiones
 * Admin: todas las comisiones
 */
router.get('/', getAllCommissions);

/**
 * GET /api/commissions/summary
 * Obtener resumen de comisiones por vendedor
 * Solo admin
 */
router.get('/summary', getCommissionsSummaryBySales);

/**
 * GET /api/commissions/:id
 * Obtener una comisión por ID
 * Vendedores: solo su comisión
 * Admin: cualquier comisión
 */
router.get('/:id', getCommissionById);

/**
 * POST /api/commissions/:id/approve
 * Aprobar una comisión
 * Solo admin
 */
router.post('/:id/approve', approveCommission);

/**
 * POST /api/commissions/:id/reject
 * Rechazar una comisión
 * Solo admin
 */
router.post('/:id/reject', rejectCommission);

/**
 * POST /api/commissions/:id/pay
 * Marcar comisión como pagada
 * Solo admin
 */
router.post('/:id/pay', markAsPaid);

/**
 * POST /api/commissions/:id/cancel
 * Cancelar una comisión
 * Solo admin
 */
router.post('/:id/cancel', cancelCommission);

/**
 * POST /api/commissions/batch/approve
 * Aprobar múltiples comisiones
 * Solo admin
 */
router.post('/batch/approve', batchApprove);

/**
 * POST /api/commissions/batch/pay
 * Marcar múltiples comisiones como pagadas
 * Solo admin
 */
router.post('/batch/pay', batchMarkAsPaid);

export default router;

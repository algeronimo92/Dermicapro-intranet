import { Router } from 'express';
import {
  getAllPaymentOrders,
  getPaymentOrderById,
  updatePaymentOrderStatus,
  getPaymentOrdersByPatient,
  getPaymentOrderSummary,
  createPaymentOrder,
  getOrdersWithoutPaymentOrder,
  cancelPaymentOrder,
  autoUpdatePaymentOrderStatus,
} from '../controllers/paymentOrders.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// GET /api/payment-orders - Listar todas las órdenes de pago (con filtros)
router.get('/', getAllPaymentOrders);

// POST /api/payment-orders - Crear una nueva orden de pago
router.post('/', createPaymentOrder);

// GET /api/payment-orders/patient/:patientId/without-payment-order - Obtener órdenes sin orden de pago
router.get('/patient/:patientId/without-payment-order', getOrdersWithoutPaymentOrder);

// GET /api/payment-orders/patient/:patientId - Obtener órdenes de pago de un paciente
router.get('/patient/:patientId', getPaymentOrdersByPatient);

// GET /api/payment-orders/patient/:patientId/summary - Resumen de órdenes de pago de un paciente
router.get('/patient/:patientId/summary', getPaymentOrderSummary);

// GET /api/payment-orders/:id - Obtener una orden de pago por ID
router.get('/:id', getPaymentOrderById);

// PUT /api/payment-orders/:id/status - Actualizar status de orden de pago manualmente
router.put('/:id/status', updatePaymentOrderStatus);

// POST /api/payment-orders/:id/auto-update-status - Actualizar status automáticamente según pagos
router.post('/:id/auto-update-status', autoUpdatePaymentOrderStatus);

// POST /api/payment-orders/:id/cancel - Cancelar una orden de pago
router.post('/:id/cancel', cancelPaymentOrder);

export default router;

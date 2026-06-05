import { Router } from 'express';
import {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  uploadReceipt,
} from '../controllers/payments.controller';
import { authenticate } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// GET /api/payments - Listar todos los pagos (con filtros)
router.get('/', getAllPayments);

// GET /api/payments/:id - Obtener un pago por ID
router.get('/:id', getPaymentById);

// POST /api/payments - Crear un nuevo pago
router.post('/', createPayment);

// POST /api/payments/:id/upload-receipt - Subir comprobante de pago
router.post('/:id/upload-receipt', upload.single('receipt'), uploadReceipt);

// PUT /api/payments/:id - Actualizar un pago
router.put('/:id', updatePayment);

// DELETE /api/payments/:id - Eliminar un pago
router.delete('/:id', deletePayment);

export default router;

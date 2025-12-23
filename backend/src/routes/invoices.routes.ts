import { Router } from 'express';
import {
  getAllInvoices,
  getInvoiceById,
  updateInvoiceStatus,
  getInvoicesByPatient,
  getInvoiceSummary,
  createInvoice,
  getUninvoicedOrders,
  cancelInvoice,
  autoUpdateInvoiceStatus,
} from '../controllers/invoices.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// GET /api/invoices - Listar todas las facturas (con filtros)
router.get('/', getAllInvoices);

// POST /api/invoices - Crear una nueva factura
router.post('/', authorize('admin', 'sales'), createInvoice);

// GET /api/invoices/patient/:patientId/uninvoiced - Obtener órdenes sin facturar
router.get('/patient/:patientId/uninvoiced', getUninvoicedOrders);

// GET /api/invoices/patient/:patientId - Obtener facturas de un paciente
router.get('/patient/:patientId', getInvoicesByPatient);

// GET /api/invoices/patient/:patientId/summary - Resumen de facturas de un paciente
router.get('/patient/:patientId/summary', getInvoiceSummary);

// GET /api/invoices/:id - Obtener una factura por ID
router.get('/:id', getInvoiceById);

// PUT /api/invoices/:id/status - Actualizar status de factura manualmente
router.put('/:id/status', authorize('admin', 'sales'), updateInvoiceStatus);

// POST /api/invoices/:id/auto-update-status - Actualizar status automáticamente según pagos
router.post('/:id/auto-update-status', autoUpdateInvoiceStatus);

// POST /api/invoices/:id/cancel - Cancelar una factura
router.post('/:id/cancel', authorize('admin'), cancelInvoice);

export default router;

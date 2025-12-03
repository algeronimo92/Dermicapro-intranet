import { Router } from 'express';
import {
  getAllAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  markAsAttended,
  uploadReceipt,
} from '../controllers/appointments.controller';
import { authenticate, authorize } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

const router = Router();

router.use(authenticate);

router.get('/', getAllAppointments);
router.get('/:id', getAppointmentById);
router.post('/', authorize('admin', 'sales'), createAppointment);
router.put('/:id', authorize('admin', 'sales'), updateAppointment);
router.delete('/:id', authorize('admin', 'sales'), deleteAppointment);
router.post('/:id/attend', authorize('admin', 'nurse'), markAsAttended);
router.post('/:id/upload-receipt', authorize('admin', 'sales'), upload.single('receipt'), uploadReceipt);

export default router;

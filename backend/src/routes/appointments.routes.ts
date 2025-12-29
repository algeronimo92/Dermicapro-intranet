import { Router } from 'express';
import {
  getAllAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  markAsAttended,
  uploadReceipt,
  uploadTreatmentPhotos,
  addPhotosToAppointment,
  updateBodyMeasurements,
  createAppointmentNote,
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
router.post('/upload-photos', authorize('admin', 'nurse'), upload.array('photos', 10), uploadTreatmentPhotos);
router.post('/:id/add-photos', authorize('admin', 'nurse'), addPhotosToAppointment);
router.put('/:id/body-measurements', authorize('admin', 'nurse'), updateBodyMeasurements);
router.post('/:id/notes', createAppointmentNote);

export default router;

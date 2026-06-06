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
import { authenticate } from '../middlewares/auth';
import { upload, receiptUpload, processUpload } from '../middlewares/upload';
import { uploadLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.use(authenticate);

router.get('/', getAllAppointments);
router.get('/:id', getAppointmentById);
router.post('/', createAppointment);
router.put('/:id', updateAppointment);
router.delete('/:id', deleteAppointment);
router.post('/:id/attend', markAsAttended);
router.post('/:id/upload-receipt', uploadLimiter, receiptUpload.single('receipt'), processUpload, uploadReceipt);
router.post('/upload-photos', uploadLimiter, upload.array('photos', 10), processUpload, uploadTreatmentPhotos);
router.post('/:id/add-photos', addPhotosToAppointment);
router.put('/:id/body-measurements', updateBodyMeasurements);
router.post('/:id/notes', createAppointmentNote);

export default router;

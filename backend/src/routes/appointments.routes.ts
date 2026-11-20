import { Router } from 'express';
import {
  getAllAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  markAsAttended,
  addAttendee,
  removeAttendee,
  uploadReceipt,
  uploadTreatmentPhotos,
  addPhotosToAppointment,
  removePhotoFromAppointment,
  updateBodyMeasurements,
  createAppointmentNote,
} from '../controllers/appointments.controller';
import { authenticate, authorize } from '../middlewares/auth';
import { ROLES } from '../constants/roles';
import { authorizeAppointment } from '../middlewares/appointmentPermissions';
import { upload, receiptUpload, processUpload } from '../middlewares/upload';
import { uploadLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.use(authenticate);

router.get('/', getAllAppointments);
router.get('/:id', getAppointmentById);
router.post('/', createAppointment);
router.put('/:id', authorizeAppointment('edit'), updateAppointment);
router.delete('/:id', authorize(ROLES.ADMIN), deleteAppointment);
router.post('/:id/attend', authorizeAppointment('attend'), markAsAttended);
router.post('/:id/attendees', authorizeAppointment('attendees'), addAttendee);
router.delete('/:id/attendees/:userId', authorizeAppointment('attendees'), removeAttendee);
router.post('/:id/upload-receipt', authorizeAppointment('receipt'), uploadLimiter, receiptUpload.array('receipts', 3), processUpload, uploadReceipt);
router.post('/upload-photos', uploadLimiter, upload.array('photos', 10), processUpload, uploadTreatmentPhotos);
router.post('/:id/add-photos', authorizeAppointment('photos'), addPhotosToAppointment);
router.delete('/:id/photos', authorizeAppointment('photos'), removePhotoFromAppointment);
router.put('/:id/body-measurements', updateBodyMeasurements);
router.post('/:id/notes', createAppointmentNote);

export default router;

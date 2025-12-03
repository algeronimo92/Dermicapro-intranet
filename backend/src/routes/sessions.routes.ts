import { Router } from 'express';
import {
  getSessionsByAppointment,
  createSession,
  updateSession,
  uploadPhotos,
} from '../controllers/sessions.controller';
import { authenticate, authorize } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

const router = Router();

router.use(authenticate);

router.get('/appointments/:appointmentId/sessions', getSessionsByAppointment);
router.post('/appointments/:appointmentId/sessions', authorize('admin', 'nurse'), createSession);
router.put('/:id', authorize('admin', 'nurse'), updateSession);
router.post('/:id/upload-photos', authorize('admin', 'nurse'), upload.array('photos', 10), uploadPhotos);

export default router;

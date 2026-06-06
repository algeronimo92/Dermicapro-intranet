import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deactivateUser,
  activateUser,
  getUserStats,
  uploadUserPhoto,
} from '../controllers/users.controller';
import { authenticate } from '../middlewares/auth';
import { upload, processUpload } from '../middlewares/upload';
import { uploadLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.use(authenticate);

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.get('/:id/stats', getUserStats);
router.post('/', createUser);
router.put('/:id', updateUser);
router.post('/:id/photo', uploadLimiter, upload.single('photo'), processUpload, uploadUserPhoto);
router.post('/:id/deactivate', deactivateUser);
router.post('/:id/activate', activateUser);

export default router;

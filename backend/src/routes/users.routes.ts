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
  getStaffDirectory,
} from '../controllers/users.controller';
import { authenticate, authorize, authorizeSelfOrAdmin } from '../middlewares/auth';
import { ROLES } from '../constants/roles';
import { upload, processUpload } from '../middlewares/upload';
import { uploadLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.use(authenticate);

router.get('/staff', getStaffDirectory);
router.post('/:id/photo', authorizeSelfOrAdmin, uploadLimiter, upload.single('photo'), processUpload, uploadUserPhoto);

router.use(authorize(ROLES.ADMIN));

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.get('/:id/stats', getUserStats);
router.post('/', createUser);
router.put('/:id', updateUser);
router.post('/:id/deactivate', deactivateUser);
router.post('/:id/activate', activateUser);

export default router;

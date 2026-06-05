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
import { upload } from '../middlewares/upload';

const router = Router();

router.use(authenticate);

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.get('/:id/stats', getUserStats);
router.post('/', createUser);
router.put('/:id', updateUser);
router.post('/:id/photo', upload.single('photo'), uploadUserPhoto);
router.post('/:id/deactivate', deactivateUser);
router.post('/:id/activate', activateUser);

export default router;

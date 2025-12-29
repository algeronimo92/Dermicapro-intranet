import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deactivateUser,
  activateUser,
  getUserStats,
} from '../controllers/users.controller';
import { authenticate } from '../middlewares/auth';
import { requireRole } from '../middlewares/authorization';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// GET /api/users - Listar todos los usuarios (solo admin)
router.get('/', requireRole('admin'), getAllUsers);

// GET /api/users/:id - Obtener un usuario por ID
router.get('/:id', getUserById);

// GET /api/users/:id/stats - Obtener estadísticas de un usuario
router.get('/:id/stats', getUserStats);

// POST /api/users - Crear nuevo usuario (solo admin)
router.post('/', requireRole('admin'), createUser);

// PUT /api/users/:id - Actualizar usuario
router.put('/:id', updateUser);

// POST /api/users/:id/deactivate - Desactivar usuario (solo admin)
router.post('/:id/deactivate', requireRole('admin'), deactivateUser);

// POST /api/users/:id/activate - Activar usuario (solo admin)
router.post('/:id/activate', requireRole('admin'), activateUser);

export default router;

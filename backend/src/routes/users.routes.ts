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
import { authenticate, authorize } from '../middlewares/auth';
import { Role } from '@prisma/client';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// GET /api/users - Listar todos los usuarios (solo admin)
router.get('/', authorize(Role.admin), getAllUsers);

// GET /api/users/:id - Obtener un usuario por ID
router.get('/:id', getUserById);

// GET /api/users/:id/stats - Obtener estadísticas de un usuario
router.get('/:id/stats', getUserStats);

// POST /api/users - Crear nuevo usuario (solo admin)
router.post('/', authorize(Role.admin), createUser);

// PUT /api/users/:id - Actualizar usuario
router.put('/:id', updateUser);

// POST /api/users/:id/deactivate - Desactivar usuario (solo admin)
router.post('/:id/deactivate', authorize(Role.admin), deactivateUser);

// POST /api/users/:id/activate - Activar usuario (solo admin)
router.post('/:id/activate', authorize(Role.admin), activateUser);

export default router;

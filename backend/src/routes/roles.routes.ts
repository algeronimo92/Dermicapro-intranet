import { Router } from 'express';
import {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getAllPermissions,
  toggleRoleStatus,
} from '../controllers/roles.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Obtener todos los permisos disponibles
router.get('/permissions', getAllPermissions);

// Obtener todos los roles
router.get('/', getAllRoles);

// Obtener un rol por ID
router.get('/:id', getRoleById);

// Crear un nuevo rol
router.post('/', createRole);

// Actualizar un rol
router.put('/:id', updateRole);

// Activar/Desactivar un rol
router.patch('/:id/toggle-status', toggleRoleStatus);

// Eliminar un rol
router.delete('/:id', deleteRole);

export default router;

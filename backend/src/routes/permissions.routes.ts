import { Router } from 'express';
import { createPermission } from '../controllers/roles.controller';
import { authenticate } from '../middlewares/auth';
import { requirePermission } from '../middlewares/authorization';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Crear un nuevo permiso (requiere permiso roles.manage)
router.post('/', requirePermission('roles.manage'), createPermission);

export default router;

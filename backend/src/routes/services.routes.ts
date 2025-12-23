import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import * as servicesController from '../controllers/services.controller';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// GET /api/services - Obtener todos los servicios
router.get('/', servicesController.getServices);

// GET /api/services/active - Obtener servicios activos
router.get('/active', servicesController.getActiveServices);

// GET /api/services/:id - Obtener un servicio específico
router.get('/:id', servicesController.getService);

// POST /api/services - Crear nuevo servicio (solo admin)
router.post('/', servicesController.createService);

// PUT /api/services/:id - Actualizar servicio (solo admin)
router.put('/:id', servicesController.updateService);

// DELETE /api/services/:id - Eliminar servicio (solo admin)
router.delete('/:id', servicesController.deleteService);

// POST /api/services/:id/restore - Restaurar servicio eliminado (solo admin)
router.post('/:id/restore', servicesController.restoreService);

export default router;

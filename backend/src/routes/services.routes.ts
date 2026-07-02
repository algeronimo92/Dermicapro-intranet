import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import * as servicesController from '../controllers/services.controller';
import * as servicePackagesController from '../controllers/servicePackages.controller';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// GET /api/services - Obtener todos los servicios (con sus paquetes)
router.get('/', servicesController.getServices);

// GET /api/services/active - Obtener servicios activos (con sus paquetes activos)
router.get('/active', servicesController.getActiveServices);

// GET /api/services/:id - Obtener un servicio específico (con sus paquetes)
router.get('/:id', servicesController.getService);

// POST /api/services - Crear nuevo servicio (solo admin)
router.post('/', servicesController.createService);

// PUT /api/services/:id - Actualizar servicio (solo admin)
router.put('/:id', servicesController.updateService);

// DELETE /api/services/:id - Eliminar servicio y sus paquetes (solo admin)
router.delete('/:id', servicesController.deleteService);

// POST /api/services/:id/restore - Restaurar servicio eliminado (solo admin)
router.post('/:id/restore', servicesController.restoreService);

// GET /api/services/:serviceId/packages - Obtener paquetes de un servicio
router.get('/:serviceId/packages', servicePackagesController.getPackagesByService);

// POST /api/services/:serviceId/packages - Crear paquete para un servicio (solo admin)
router.post('/:serviceId/packages', servicePackagesController.createPackage);

// PUT /api/services/packages/:id - Actualizar paquete (solo admin)
router.put('/packages/:id', servicePackagesController.updatePackage);

// DELETE /api/services/packages/:id - Eliminar paquete (solo admin)
router.delete('/packages/:id', servicePackagesController.deletePackage);

// POST /api/services/packages/:id/restore - Restaurar paquete eliminado (solo admin)
router.post('/packages/:id/restore', servicePackagesController.restorePackage);

export default router;

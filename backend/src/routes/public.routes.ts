import { Router } from 'express';
import * as publicCatalogController from '../controllers/publicCatalog.controller';
import { publicLimiter } from '../middlewares/rateLimiter';

const router = Router();

// ================================
// Rutas públicas de solo lectura (consumo externo)
// ================================

/**
 * GET /api/public/catalog
 * Catálogo de servicios activos con sus paquetes y precios.
 * Sin autenticación. Sin datos de comisión ni de pacientes.
 */
router.get('/catalog', publicLimiter, publicCatalogController.getPublicCatalog);

export default router;

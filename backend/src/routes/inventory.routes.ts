import { Router } from 'express';
import {
  createMovement,
  createMovementsBatch,
  createProduct,
  getProduct,
  listBrands,
  listMovements,
  listProducts,
  updateProduct,
  uploadProductPhoto,
} from '../controllers/inventory.controller';
import { authenticate, requireModule } from '../middlewares/auth';
import { productPhotoLimiter } from '../middlewares/rateLimiter';
import { processUpload, upload } from '../middlewares/upload';

const router = Router();

// Quién consulta y quién modifica lo decide Empleados -> Privilegios
// (constants/modules.ts): products e inventory_movements.
router.use(authenticate, requireModule('inventory', 'view'));

router.get('/products', listProducts);
router.get('/products/brands', listBrands);
router.get('/products/:id', getProduct);
router.get('/products/:id/movements', listMovements);

router.post('/products', requireModule('inventory', 'create'), createProduct);
router.put('/products/:id', requireModule('inventory', 'edit'), updateProduct);
router.post('/products/:id/photo', requireModule('inventory', 'edit'), productPhotoLimiter, upload.single('photo'), processUpload, uploadProductPhoto);
router.post('/products/:id/movements', requireModule('inventory', 'move'), createMovement);
router.post('/movements/batch', requireModule('inventory', 'move'), createMovementsBatch);

export default router;

import { Router } from 'express';
import { ROLES } from '../constants/roles';
import {
  createMovement,
  createProduct,
  getProduct,
  listBrands,
  listMovements,
  listProducts,
  updateProduct,
  uploadProductPhoto,
} from '../controllers/inventory.controller';
import { authenticate, authorize } from '../middlewares/auth';
import { productPhotoLimiter } from '../middlewares/rateLimiter';
import { processUpload, upload } from '../middlewares/upload';

const router = Router();

// Consultan: admin, inventario, ventas y asistentes.
// Modifican (productos y movimientos): sólo admin e inventario.
const canManage = authorize(ROLES.ADMIN, ROLES.INVENTORY);

router.use(authenticate, authorize(ROLES.ADMIN, ROLES.INVENTORY, ROLES.SALES, ROLES.ASSISTANT));

router.get('/products', listProducts);
router.get('/products/brands', listBrands);
router.get('/products/:id', getProduct);
router.get('/products/:id/movements', listMovements);

router.post('/products', canManage, createProduct);
router.put('/products/:id', canManage, updateProduct);
router.post('/products/:id/photo', canManage, productPhotoLimiter, upload.single('photo'), processUpload, uploadProductPhoto);
router.post('/products/:id/movements', canManage, createMovement);

export default router;

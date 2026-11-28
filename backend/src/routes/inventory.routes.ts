import { Router } from 'express';
import {
  createProduct,
  getProduct,
  listBrands,
  listMovements,
  listProducts,
  updateProduct,
  updateStockAlerts,
  uploadProductPhoto,
} from '../controllers/inventory.controller';
import {
  createPurchase,
  getPurchase,
  listAvailableInvoices,
  listPurchases,
} from '../controllers/purchases.controller';
import { authenticate, requireModule } from '../middlewares/auth';
import { productPhotoLimiter } from '../middlewares/rateLimiter';
import { processUpload, upload } from '../middlewares/upload';

const router = Router();

// Quién consulta y quién modifica lo decide Empleados -> Privilegios
// (constants/modules.ts): products, inventory_movements, purchases y purchase_items.
router.use(authenticate, requireModule('inventory', 'view'));

// Productos
router.get('/products', listProducts);
router.get('/products/brands', listBrands);
router.put('/products/alerts', requireModule('inventory', 'edit'), updateStockAlerts);
router.get('/products/:id', getProduct);
router.get('/products/:id/movements', listMovements);

router.post('/products', requireModule('inventory', 'create'), createProduct);
router.put('/products/:id', requireModule('inventory', 'edit'), updateProduct);
router.post('/products/:id/photo', requireModule('inventory', 'edit'), productPhotoLimiter, upload.single('photo'), processUpload, uploadProductPhoto);

// Compras
router.get('/purchases', requireModule('inventory', 'purchases'), listPurchases);
router.get('/purchases/available-invoices', requireModule('inventory', 'purchase'), listAvailableInvoices);
router.get('/purchases/:id', requireModule('inventory', 'purchases'), getPurchase);
router.post('/purchases', requireModule('inventory', 'purchase'), createPurchase);

export default router;

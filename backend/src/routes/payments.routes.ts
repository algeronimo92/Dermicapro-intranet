import { Router } from 'express';
import {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  voidPayment,
  uploadReceipt,
} from '../controllers/payments.controller';
import { authenticate, authorize } from '../middlewares/auth';
import { ROLES } from '../constants/roles';
import { receiptUpload, processUpload } from '../middlewares/upload';
import { uploadLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.use(authenticate);

router.get('/', authorize(ROLES.ADMIN), getAllPayments);
router.get('/:id', getPaymentById);
router.post('/', createPayment);
router.post('/:id/upload-receipt', uploadLimiter, receiptUpload.array('receipts', 3), processUpload, uploadReceipt);
router.post('/:id/void', authorize(ROLES.ADMIN), voidPayment);
router.put('/:id', authorize(ROLES.ADMIN), updatePayment);

export default router;

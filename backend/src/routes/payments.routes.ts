import { Router } from 'express';
import {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  voidPayment,
  uploadReceipt,
} from '../controllers/payments.controller';
import { authenticate } from '../middlewares/auth';
import { receiptUpload, processUpload } from '../middlewares/upload';
import { uploadLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.use(authenticate);

router.get('/', getAllPayments);
router.get('/:id', getPaymentById);
router.post('/', createPayment);
router.post('/:id/upload-receipt', uploadLimiter, receiptUpload.array('receipts', 3), processUpload, uploadReceipt);
router.post('/:id/void', voidPayment);
router.put('/:id', updatePayment);

export default router;

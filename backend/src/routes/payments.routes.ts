import { Router } from 'express';
import {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
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
router.post('/:id/upload-receipt', uploadLimiter, receiptUpload.single('receipt'), processUpload, uploadReceipt);
router.put('/:id', updatePayment);
router.delete('/:id', deletePayment);

export default router;

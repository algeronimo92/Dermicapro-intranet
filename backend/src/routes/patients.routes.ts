import { Router } from 'express';
import {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  resetPatientPassword,
  getPatientHistory,
  getCreditHistory,
  closeServiceInstance,
  reopenServiceInstance,
} from '../controllers/patients.controller';
import { addCredit } from '../controllers/payments.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', getAllPatients);
router.get('/:id', getPatientById);
router.post('/', createPatient);
router.put('/:id', updatePatient);
router.delete('/:id', deletePatient);
router.get('/:id/history', getPatientHistory);
router.get('/:id/credit-history', getCreditHistory);
router.post('/:id/add-credit', addCredit);
router.patch('/:id/password', resetPatientPassword);
router.patch('/:id/orders/:orderId/conclude', closeServiceInstance);
router.patch('/:id/orders/:orderId/reopen', reopenServiceInstance);

export default router;

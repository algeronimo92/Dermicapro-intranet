import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';

const router = Router();

// Middleware: solo admins
router.use(authenticate);
router.use(authorize(['admin']));

// Placeholder endpoints (implementaremos después)
router.get('/executive', (req, res) => {
  res.json({ message: 'Executive summary - coming soon' });
});

router.get('/financial', (req, res) => {
  res.json({ message: 'Financial analytics - coming soon' });
});

router.get('/operations', (req, res) => {
  res.json({ message: 'Operations analytics - coming soon' });
});

router.get('/sales', (req, res) => {
  res.json({ message: 'Sales analytics - coming soon' });
});

router.get('/customers', (req, res) => {
  res.json({ message: 'Customer analytics - coming soon' });
});

router.get('/services', (req, res) => {
  res.json({ message: 'Service analytics - coming soon' });
});

export default router;

import { Router } from 'express';
import { getAllRoles } from '../controllers/roles.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.get('/', authenticate, getAllRoles);

export default router;

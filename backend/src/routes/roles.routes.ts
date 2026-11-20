import { Router } from 'express';
import { getAllRoles } from '../controllers/roles.controller';
import { authenticate, authorize } from '../middlewares/auth';
import { ROLES } from '../constants/roles';

const router = Router();

router.get('/', authenticate, authorize(ROLES.ADMIN), getAllRoles);

export default router;

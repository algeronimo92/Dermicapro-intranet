import { Router, Request, Response } from 'express';
import { ROLES } from '../constants/roles';
import { DB_TABLES, OBJECT_PRIVILEGES } from '../constants/dbPrivileges';
import { authenticate, authorize } from '../middlewares/auth';
import { AppError, logUnexpectedError } from '../middlewares/errorHandler';
import { getRolePrivileges, setRolePrivileges } from '../services/dbPrivileges.service';

const router = Router();

router.use(authenticate, authorize(ROLES.ADMIN));

// GET /api/db-privileges — matriz de privilegios de cada rol, leída de PostgreSQL
router.get('/', async (req: Request, res: Response) => {
  try {
    res.json({
      data: {
        tables: DB_TABLES,
        privileges: OBJECT_PRIVILEGES,
        roles: await getRolePrivileges(),
      },
    });
  } catch (error) {
    logUnexpectedError(req, error);
    res.status(500).json({ error: 'Error al leer los privilegios de la base de datos' });
  }
});

// PUT /api/db-privileges/:role — { grants: { tabla: ['SELECT', ...] } }
router.put('/:role', async (req: Request, res: Response) => {
  try {
    const statements = await setRolePrivileges(req.params.role, req.body?.grants);
    console.log(JSON.stringify({
      event: 'db_privileges_changed',
      request_id: req.id,
      user_id: req.user?.id,
      role: req.params.role,
      statements,
    }));
    const roles = await getRolePrivileges();
    res.json({
      data: roles.find(r => r.appRole === req.params.role),
      message: statements.length ? `${statements.length} cambio(s) aplicados` : 'Sin cambios',
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    logUnexpectedError(req, error);
    res.status(500).json({ error: 'Error al aplicar los privilegios' });
  }
});

export default router;

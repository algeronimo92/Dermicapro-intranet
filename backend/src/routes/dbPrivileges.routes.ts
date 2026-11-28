import { Router, Request, Response } from 'express';
import { ROLES } from '../constants/roles';
import { DB_TABLES, OBJECT_PRIVILEGES } from '../constants/dbPrivileges';
import { authenticate, authorize } from '../middlewares/auth';
import { AppError, logUnexpectedError } from '../middlewares/errorHandler';
import { getRolePrivileges, setRolePrivileges } from '../services/dbPrivileges.service';
import { accessFromGrants } from '../services/moduleAccess.service';
import { getNotificationSettings, NOTIFICATION_TYPES, setNotificationSettings } from '../services/notifications.service';

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

// Notificaciones por rol (Empleados -> Privilegios). Van antes de /:role.
async function notificationsPayload() {
  const [settings, roles] = await Promise.all([getNotificationSettings(), getRolePrivileges()]);
  return {
    types: Object.entries(NOTIFICATION_TYPES).map(([key, t]) => ({ key, label: t.label, hint: t.hint })),
    // canViewInventory: sin ver Inventario el rol no recibe el aviso aunque esté marcado.
    roles: [
      { role: ROLES.ADMIN, displayName: 'Administrador', canViewInventory: true },
      ...roles.map(r => ({
        role: r.appRole,
        displayName: r.displayName,
        canViewInventory: accessFromGrants((t, p) => (r.grants[t] ?? []).includes(p as never)).inventory.view,
      })),
    ],
    settings,
  };
}

router.get('/notifications', async (req: Request, res: Response) => {
  try {
    res.json({ data: await notificationsPayload() });
  } catch (error) {
    logUnexpectedError(req, error);
    res.status(500).json({ error: 'Error al leer la configuración de notificaciones' });
  }
});

router.put('/notifications', async (req: Request, res: Response) => {
  try {
    await setNotificationSettings(req.body?.settings, req.user!.id);
    res.json({ data: await notificationsPayload(), message: 'Notificaciones actualizadas' });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    logUnexpectedError(req, error);
    res.status(500).json({ error: 'Error al guardar la configuración de notificaciones' });
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

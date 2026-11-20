import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { PatientJwtPayload } from '../types/auth.types';
import prisma from '../config/database';
import { ROLES } from '../constants/roles';
import { dbRoleContext, dbRoleFor } from '../config/dbRoleContext';
import { ensureEmployeeDbRole } from '../services/employeeDbRoles.service';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token no proporcionado' });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    // Check if this is a patient token (has 'type' property set to 'patient')
    if ('type' in decoded && (decoded as PatientJwtPayload).type === 'patient') {
      res.status(401).json({ error: 'Los tokens de paciente no están permitidos en este endpoint' });
      return;
    }

    const payload = decoded as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        isActive: true,
        roleId: true,
        firstName: true,
        lastName: true,
        role: { select: { name: true } },
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Token inválido o expirado' });
      return;
    }

    const roleName = user.role?.name;
    if (!roleName || !Object.values(ROLES).includes(roleName as typeof ROLES[keyof typeof ROLES])) {
      res.status(403).json({ error: 'La cuenta no tiene un rol autorizado' });
      return;
    }
    // La sesión necesita su cuenta y la configuración del tiempo de inactividad.
    const accountantCanAccess =
      req.baseUrl === '/api/auth' ||
      (req.method === 'GET' && ['/api/invoices', '/api/settings'].includes(req.baseUrl));

    if (roleName === ROLES.ACCOUNTANT && !accountantCanAccess) {
      res.status(403).json({ error: 'El contador solo tiene acceso de lectura a las facturas' });
      return;
    }

    // El rol de inventario sólo ve su módulo; el resto de la API no le aplica.
    const inventoryCanAccess =
      req.baseUrl === '/api/auth' ||
      req.baseUrl === '/api/inventory' ||
      (req.method === 'GET' && req.baseUrl === '/api/settings');

    if (roleName === ROLES.INVENTORY && !inventoryCanAccess) {
      res.status(403).json({ error: 'El rol de inventario solo tiene acceso al módulo de inventario' });
      return;
    }

    req.user = { ...payload, email: user.email, roleId: user.roleId, roleName };

    // A partir de aquí las consultas de la petición corren con el rol de
    // PostgreSQL propio del empleado (ver config/dbRoleContext.ts). /api/auth
    // queda fuera: perfil, cambio de contraseña y PIN son operaciones del
    // sistema sobre la propia cuenta, y quitar privilegios nunca debe impedir
    // entrar. Si el rol no se puede preparar, se corta la petición en vez de
    // seguir como el dueño de la base.
    let dbRole: string | null = null;
    if (req.baseUrl !== '/api/auth' && dbRoleFor(roleName)) {
      try {
        dbRole = await ensureEmployeeDbRole(user.id, roleName, `${user.firstName} ${user.lastName}`);
      } catch (error) {
        console.error(JSON.stringify({
          event: 'employee_db_role_sync_failed',
          user_id: user.id,
          error: error instanceof Error ? error.message : String(error),
        }));
        res.status(503).json({ error: 'No se pudo preparar el acceso a la base de datos. Intenta de nuevo.' });
        return;
      }
    }
    dbRoleContext.run({ dbRole }, next);
  } catch (error) {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

export const authorize = (...roleNames: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }

    if (!req.user.roleName || !roleNames.includes(req.user.roleName)) {
      res.status(403).json({ error: 'Permisos insuficientes' });
      return;
    }

    next();
  };
};

// Se ejecuta antes de procesar archivos para impedir subidas sobre otras cuentas.
export const authorizeSelfOrAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }
  if (req.user.roleName !== ROLES.ADMIN && req.user.id !== req.params.id) {
    res.status(403).json({ error: 'Permisos insuficientes' });
    return;
  }
  // Cambiar la propia foto es una operación sobre la propia cuenta, como las de
  // /api/auth: corre como el dueño de la base para que los privilegios del rol
  // sobre la tabla users (sólo lectura) no la bloqueen.
  dbRoleContext.run({ dbRole: null }, next);
};

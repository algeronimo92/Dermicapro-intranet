import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { PatientJwtPayload } from '../types/auth.types';
import prisma from '../config/database';
import { ROLES } from '../constants/roles';

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
        role: { select: { name: true } },
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Token inválido o expirado' });
      return;
    }

    const roleName = user.role?.name;
    // La sesión necesita su cuenta y la configuración del tiempo de inactividad.
    const accountantCanAccess =
      req.baseUrl === '/api/auth' ||
      (req.method === 'GET' && ['/api/invoices', '/api/settings'].includes(req.baseUrl));

    if (roleName === ROLES.ACCOUNTANT && !accountantCanAccess) {
      res.status(403).json({ error: 'El contador solo tiene acceso de lectura a las facturas' });
      return;
    }

    req.user = { ...payload, email: user.email, roleId: user.roleId, roleName };
    next();
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

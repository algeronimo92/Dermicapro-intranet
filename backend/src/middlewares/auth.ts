import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { PatientJwtPayload } from '../types/auth.types';
import prisma from '../config/database';

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

    if ('type' in decoded && (decoded as PatientJwtPayload).type === 'patient') {
      res.status(401).json({ error: 'Los tokens de paciente no están permitidos en este endpoint' });
      return;
    }

    const payload = decoded as JwtPayload;

    // Cross-tenant isolation: tenant tokens must only be used within a tenant context.
    if (payload.tenantSlug && !req.tenant) {
      res.status(401).json({ error: 'Acceso no autorizado fuera del contexto de clínica' });
      return;
    }
    if (payload.tenantSlug && req.tenant && payload.tenantSlug !== req.tenant.slug) {
      res.status(401).json({ error: 'Token inválido para esta clinica' });
      return;
    }

    // Use the tenant-scoped PrismaClient when available so the user lookup hits
    // the correct schema; fall back to the global client for non-tenant requests.
    const db = req.tenantPrisma ?? prisma;
    const user = await db.user.findUnique({
      where: { id: payload.id },
      select: { id: true },
    });

    if (!user) {
      res.status(401).json({ error: 'Token inválido o expirado' });
      return;
    }

    req.user = payload;
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

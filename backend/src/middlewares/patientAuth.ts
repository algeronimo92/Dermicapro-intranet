import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyAccessToken } from '../utils/jwt';
import { PatientJwtPayload } from '../types/auth.types';
import prisma from '../config/database';

export const authenticatePatient = async (
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
    const decoded = verifyAccessToken(token) as PatientJwtPayload;

    if (decoded.type !== 'patient') {
      res.status(403).json({ error: 'Tipo de token inválido' });
      return;
    }

    // Cross-tenant isolation: mirrors the same guard used for staff tokens.
    if (decoded.tenantSlug && !req.tenant) {
      res.status(401).json({ error: 'Acceso no autorizado fuera del contexto de clínica' });
      return;
    }
    if (decoded.tenantSlug && req.tenant && decoded.tenantSlug !== req.tenant.slug) {
      res.status(401).json({ error: 'Token inválido para esta clínica' });
      return;
    }

    const db = req.tenantPrisma ?? prisma;
    const patient = await db.patient.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        dni: true,
        hasPortalAccess: true,
      },
    });

    if (!patient || !patient.hasPortalAccess) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    req.patient = patient;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Token inválido o expirado' });
    } else {
      console.error('Error in authenticatePatient middleware:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
};

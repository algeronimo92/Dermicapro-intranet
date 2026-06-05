import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyAccessToken } from '../utils/jwt';
import { PatientJwtPayload } from '../types/auth.types';
import prisma from '../config/database';

/**
 * Middleware para autenticar pacientes
 * Verifica el token JWT y que el tipo sea 'patient'
 * Carga los datos del paciente y los adjunta a req.patient
 */
export const authenticatePatient = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token) as PatientJwtPayload;

    // Validar que el token es de tipo paciente
    if (decoded.type !== 'patient') {
      res.status(403).json({ error: 'Invalid token type' });
      return;
    }

    // Cargar paciente de la base de datos
    const patient = await prisma.patient.findUnique({
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

    // Validar que el paciente existe y tiene acceso al portal
    if (!patient || !patient.hasPortalAccess) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Adjuntar paciente al request
    req.patient = patient;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid or expired token' });
    } else {
      console.error('Error in authenticatePatient middleware:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

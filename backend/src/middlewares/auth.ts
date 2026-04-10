import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { PatientJwtPayload } from '../types/auth.types';

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    // Check if this is a patient token (has 'type' property set to 'patient')
    if ('type' in decoded && (decoded as PatientJwtPayload).type === 'patient') {
      res.status(401).json({ error: 'Patient tokens not allowed for this endpoint' });
      return;
    }

    req.user = decoded as JwtPayload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * @deprecated Use requireRole or requirePermission from authorization.ts instead
 * Este middleware está deprecado y se mantiene por compatibilidad.
 * Usa los nuevos middlewares de authorization.ts para control basado en permisos.
 */
export const authorize = (...roleNames: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!req.user.roleName || !roleNames.includes(req.user.roleName)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

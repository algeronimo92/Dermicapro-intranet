import { Request, Response, NextFunction } from 'express';
import { verifyPlatformAdminToken, PlatformAdminJwtPayload } from '../platform/jwt';

declare global {
  namespace Express {
    interface Request {
      platformAdmin?: PlatformAdminJwtPayload;
    }
  }
}

export const authenticatePlatformAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }
  try {
    req.platformAdmin = verifyPlatformAdminToken(auth.slice(7));
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

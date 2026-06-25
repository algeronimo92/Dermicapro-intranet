import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface PlatformAdminJwtPayload {
  id: string;
  email: string;
  role: 'platform_admin';
}

export const generatePlatformAdminToken = (payload: PlatformAdminJwtPayload): string =>
  jwt.sign(payload, config.jwt.secret, { expiresIn: '8h' } as jwt.SignOptions);

export const verifyPlatformAdminToken = (token: string): PlatformAdminJwtPayload => {
  const payload = jwt.verify(token, config.jwt.secret) as PlatformAdminJwtPayload;
  if (payload.role !== 'platform_admin') {
    throw new Error('Not a platform admin token');
  }
  return payload;
};

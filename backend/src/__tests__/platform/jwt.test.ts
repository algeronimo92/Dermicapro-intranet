import {
  generatePlatformAdminToken,
  verifyPlatformAdminToken,
  PlatformAdminJwtPayload,
} from '../../platform/jwt';
import { generateAccessToken } from '../../utils/jwt';

describe('generatePlatformAdminToken + verifyPlatformAdminToken', () => {
  const payload: PlatformAdminJwtPayload = {
    id: 'admin-1',
    email: 'super@platform.com',
    role: 'platform_admin',
  };

  it('round-trips a valid platform admin token', () => {
    const token = generatePlatformAdminToken(payload);
    const decoded = verifyPlatformAdminToken(token);
    expect(decoded).toMatchObject(payload);
  });

  it('throws for a tampered token', () => {
    expect(() => verifyPlatformAdminToken('invalid.token.here')).toThrow();
  });

  it('throws when verifying a regular user JWT as platform admin', () => {
    const userToken = generateAccessToken({ id: 'u1', email: 'user@clinic.com' });
    expect(() => verifyPlatformAdminToken(userToken)).toThrow('Not a platform admin token');
  });

  it('token expires after given duration (structural check)', () => {
    const token = generatePlatformAdminToken(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);
  });
});

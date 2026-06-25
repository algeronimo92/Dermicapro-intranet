import { Request, Response, NextFunction } from 'express';
import { authenticatePlatformAdmin } from '../../middlewares/platformAuth';
import { generatePlatformAdminToken } from '../../platform/jwt';
import { generateAccessToken } from '../../utils/jwt';

function makeReq(authorization?: string): Request {
  return { headers: authorization ? { authorization } : {} } as unknown as Request;
}

function makeRes() {
  const json = jest.fn().mockReturnThis();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json } as unknown as Response;
}

describe('authenticatePlatformAdmin', () => {
  const next = jest.fn() as NextFunction;

  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when Authorization header is absent', () => {
    const res = makeRes();
    authenticatePlatformAdmin(makeReq(), res, next);
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for non-Bearer scheme', () => {
    const res = makeRes();
    authenticatePlatformAdmin(makeReq('Basic abc'), res, next);
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(401);
  });

  it('returns 401 for a completely invalid token', () => {
    const res = makeRes();
    authenticatePlatformAdmin(makeReq('Bearer not.valid.token'), res, next);
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(401);
  });

  it('returns 401 when using a regular user token', () => {
    const token = generateAccessToken({ id: 'u1', email: 'user@clinic.com' });
    const res = makeRes();
    authenticatePlatformAdmin(makeReq(`Bearer ${token}`), res, next);
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(401);
  });

  it('injects platformAdmin and calls next for a valid platform admin token', () => {
    const payload = { id: 'a1', email: 'super@platform.com', role: 'platform_admin' as const };
    const token = generatePlatformAdminToken(payload);
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    authenticatePlatformAdmin(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect((req as any).platformAdmin).toMatchObject(payload);
  });
});

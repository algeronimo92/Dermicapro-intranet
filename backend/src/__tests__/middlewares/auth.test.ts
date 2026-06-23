import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middlewares/auth';

const mockVerifyAccessToken = jest.fn();
const mockFindUnique = jest.fn();
const mockTenantFindUnique = jest.fn();

jest.mock('../../utils/jwt', () => ({
  verifyAccessToken: (...args: any[]) => mockVerifyAccessToken(...args),
}));

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    user: { findUnique: (...args: any[]) => mockFindUnique(...args) },
  },
}));

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: { authorization: 'Bearer valid-token' },
    ...overrides,
  } as unknown as Request;
}

function makeRes(): Response {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
}

describe('authenticate middleware (tenant-aware)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('allows request when token has no tenant and no req.tenant', async () => {
    mockVerifyAccessToken.mockReturnValue({ id: 'u1', email: 'a@b.com' });
    mockFindUnique.mockResolvedValue({ id: 'u1' });

    const req = makeReq();
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((req as any).user).toMatchObject({ id: 'u1' });
  });

  test('uses tenantPrisma for user lookup when req.tenantPrisma is set', async () => {
    mockVerifyAccessToken.mockReturnValue({ id: 'u2', email: 'b@c.com', tenantSlug: 'acme' });
    mockTenantFindUnique.mockResolvedValue({ id: 'u2' });

    const tenantPrisma = { user: { findUnique: mockTenantFindUnique } };
    const req = makeReq({
      tenant: { id: 't1', slug: 'acme', name: 'Acme', isActive: true, contactEmail: null, contactPhone: null, logoUrl: null, createdAt: new Date(), updatedAt: new Date() },
      tenantPrisma: tenantPrisma as any,
    } as any);
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    await authenticate(req, res, next);

    expect(mockTenantFindUnique).toHaveBeenCalledWith({ where: { id: 'u2' }, select: { id: true } });
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  test('rejects cross-tenant token (token slug != req.tenant.slug)', async () => {
    mockVerifyAccessToken.mockReturnValue({ id: 'u3', email: 'c@d.com', tenantSlug: 'clinic-a' });

    const req = makeReq({
      tenant: { id: 't2', slug: 'clinic-b', name: 'Clinic B', isActive: true, contactEmail: null, contactPhone: null, logoUrl: null, createdAt: new Date(), updatedAt: new Date() },
      tenantPrisma: { user: { findUnique: mockTenantFindUnique } } as any,
    } as any);
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect((res.json as jest.Mock).mock.calls[0][0]).toMatchObject({ error: expect.stringContaining('clinica') });
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when no authorization header', async () => {
    const req = makeReq({ headers: {} } as any);
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when user not found in DB', async () => {
    mockVerifyAccessToken.mockReturnValue({ id: 'ghost', email: 'x@y.com' });
    mockFindUnique.mockResolvedValue(null);

    const req = makeReq();
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects patient tokens', async () => {
    mockVerifyAccessToken.mockReturnValue({ id: 'p1', email: 'p@p.com', type: 'patient' });

    const req = makeReq();
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

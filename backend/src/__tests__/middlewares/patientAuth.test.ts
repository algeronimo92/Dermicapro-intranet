import { Request, Response, NextFunction } from 'express';
import { authenticatePatient } from '../../middlewares/patientAuth';

const mockVerifyAccessToken = jest.fn();
const mockFindUnique = jest.fn();
const mockTenantFindUnique = jest.fn();

jest.mock('../../utils/jwt', () => ({
  verifyAccessToken: (...args: any[]) => mockVerifyAccessToken(...args),
}));

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    patient: { findUnique: (...args: any[]) => mockFindUnique(...args) },
  },
}));

const validPatient = {
  id: 'p1',
  email: 'pac@test.com',
  firstName: 'Ana',
  lastName: 'Torres',
  dni: '12345678',
  hasPortalAccess: true,
};

const makeTenant = (slug: string) => ({
  id: 't1',
  slug,
  name: 'Clinic',
  isActive: true,
  contactEmail: null,
  contactPhone: null,
  logoUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: { authorization: 'Bearer tok' },
    ...overrides,
  } as unknown as Request;
}

function makeRes(): Response {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
}

describe('authenticatePatient middleware (tenant-aware)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('allows request with no tenantSlug on bare domain', async () => {
    mockVerifyAccessToken.mockReturnValue({ id: 'p1', email: 'pac@test.com', type: 'patient' });
    mockFindUnique.mockResolvedValue(validPatient);

    const req = makeReq();
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    await authenticatePatient(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((req as any).patient).toMatchObject({ id: 'p1' });
  });

  test('uses tenantPrisma for lookup when tenantSlug in token matches req.tenant', async () => {
    mockVerifyAccessToken.mockReturnValue({ id: 'p1', email: 'pac@test.com', type: 'patient', tenantSlug: 'acme' });
    mockTenantFindUnique.mockResolvedValue(validPatient);

    const tenantPrisma = { patient: { findUnique: mockTenantFindUnique } };
    const req = makeReq({
      tenant: makeTenant('acme'),
      tenantPrisma: tenantPrisma as any,
    } as any);
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    await authenticatePatient(req, res, next);

    expect(mockTenantFindUnique).toHaveBeenCalled();
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  test('rejects tenant token used on bare domain (no req.tenant)', async () => {
    mockVerifyAccessToken.mockReturnValue({ id: 'p1', email: 'pac@test.com', type: 'patient', tenantSlug: 'acme' });

    const req = makeReq();
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    await authenticatePatient(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect((res.json as jest.Mock).mock.calls[0][0]).toMatchObject({ error: expect.stringContaining('clínica') });
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects cross-tenant token (token slug != req.tenant.slug)', async () => {
    mockVerifyAccessToken.mockReturnValue({ id: 'p1', email: 'pac@test.com', type: 'patient', tenantSlug: 'clinic-a' });

    const req = makeReq({
      tenant: makeTenant('clinic-b'),
      tenantPrisma: { patient: { findUnique: mockTenantFindUnique } } as any,
    } as any);
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    await authenticatePatient(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect((res.json as jest.Mock).mock.calls[0][0]).toMatchObject({ error: expect.stringContaining('clínica') });
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects non-patient token type', async () => {
    mockVerifyAccessToken.mockReturnValue({ id: 'u1', email: 'a@b.com', type: 'staff' });

    const req = makeReq();
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    await authenticatePatient(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects when patient not found or hasPortalAccess false', async () => {
    mockVerifyAccessToken.mockReturnValue({ id: 'p99', email: null, type: 'patient' });
    mockFindUnique.mockResolvedValue(null);

    const req = makeReq();
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    await authenticatePatient(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when no authorization header', async () => {
    const req = makeReq({ headers: {} } as any);
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    await authenticatePatient(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

import { Request, Response, NextFunction } from 'express';
import { tenantResolver } from '../../middlewares/tenantResolver';

const mockFindActiveTenantBySlug = jest.fn();
const mockGetTenantPrisma = jest.fn();

jest.mock('../../platform/queries', () => ({
  findActiveTenantBySlug: (...args: any[]) => mockFindActiveTenantBySlug(...args),
}));

jest.mock('../../platform/tenant-prisma', () => ({
  getTenantPrisma: (...args: any[]) => mockGetTenantPrisma(...args),
}));

function createMockReqRes(host: string) {
  const req = {
    hostname: host,
    headers: { host },
  } as unknown as Request;

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;

  const next = jest.fn() as NextFunction;

  return { req, res, next };
}

describe('tenantResolver middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('extracts slug from subdomain and injects tenant + prisma', async () => {
    const fakeTenant = { id: 't1', slug: 'dermicapro', name: 'DermicaPro', isActive: true };
    const fakePrisma = { user: {} };
    mockFindActiveTenantBySlug.mockResolvedValue(fakeTenant);
    mockGetTenantPrisma.mockReturnValue(fakePrisma);

    const { req, res, next } = createMockReqRes('dermicapro.plataforma.com');
    await tenantResolver(req, res, next);

    expect(mockFindActiveTenantBySlug).toHaveBeenCalledWith('dermicapro');
    expect(mockGetTenantPrisma).toHaveBeenCalledWith('dermicapro');
    expect(req.tenant).toEqual(fakeTenant);
    expect(req.tenantPrisma).toBe(fakePrisma);
    expect(next).toHaveBeenCalled();
  });

  test('returns 404 for unknown tenant', async () => {
    mockFindActiveTenantBySlug.mockResolvedValue(null);

    const { req, res, next } = createMockReqRes('unknown.plataforma.com');
    await tenantResolver(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  test('skips resolution for admin subdomain', async () => {
    const { req, res, next } = createMockReqRes('admin.plataforma.com');
    await tenantResolver(req, res, next);

    expect(mockFindActiveTenantBySlug).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  test('handles localhost for development', async () => {
    const fakeTenant = { id: 't1', slug: 'dev', isActive: true };
    const fakePrisma = { user: {} };
    mockFindActiveTenantBySlug.mockResolvedValue(fakeTenant);
    mockGetTenantPrisma.mockReturnValue(fakePrisma);

    const { req, res, next } = createMockReqRes('dev.localhost');
    await tenantResolver(req, res, next);

    expect(mockFindActiveTenantBySlug).toHaveBeenCalledWith('dev');
    expect(next).toHaveBeenCalled();
  });
});

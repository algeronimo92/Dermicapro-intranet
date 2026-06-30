import { Request, Response } from 'express';

const mockFindActiveTenant = jest.fn();
const mockUserFindFirst = jest.fn();
jest.mock('../../../platform/queries', () => ({ findActiveTenantBySlug: (...a: any[]) => mockFindActiveTenant(...a) }));
jest.mock('../../../platform/tenant-prisma', () => ({
  getTenantPrisma: () => ({ user: { findFirst: (...a: any[]) => mockUserFindFirst(...a) } }),
}));
jest.mock('../../../utils/jwt', () => ({
  generateAccessToken: jest.fn().mockReturnValue('impersonation-token'),
}));

import { impersonateTenantHandler } from '../../../controllers/platform/impersonation.controller';

const makeReq = (slug: string) =>
  ({ params: { slug }, platformAdmin: { id: 'a1', email: 'super@plat.com', role: 'platform_admin' } }) as unknown as Request;
const makeRes = () => ({ json: jest.fn(), status: jest.fn().mockReturnThis() } as unknown as Response);

const fakeTenant = { id: 't1', slug: 'acme', name: 'Acme', isActive: true, contactEmail: null, contactPhone: null, logoUrl: null, createdAt: new Date(), updatedAt: new Date() };

describe('impersonateTenantHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns impersonation token for first admin user', async () => {
    mockFindActiveTenant.mockResolvedValue(fakeTenant);
    mockUserFindFirst.mockResolvedValue({ id: 'u1', email: 'admin@acme.com', roleId: 'r1', role: { name: 'admin' } });
    const res = makeRes();
    await impersonateTenantHandler(makeReq('acme'), res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ token: 'impersonation-token', userEmail: 'admin@acme.com' }) }),
    );
  });

  it('returns 404 if tenant not found', async () => {
    mockFindActiveTenant.mockResolvedValue(null);
    const res = makeRes();
    await impersonateTenantHandler(makeReq('ghost'), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 404 if no admin user in tenant', async () => {
    mockFindActiveTenant.mockResolvedValue(fakeTenant);
    mockUserFindFirst.mockResolvedValue(null);
    const res = makeRes();
    await impersonateTenantHandler(makeReq('acme'), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

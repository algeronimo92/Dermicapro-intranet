import { Request, Response } from 'express';
import prisma from '../../config/database';
import { verifyAccessToken } from '../../utils/jwt';
import { authenticate, authorize } from '../auth';

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: { user: { findUnique: jest.fn() } },
}));
jest.mock('../../utils/jwt', () => ({ verifyAccessToken: jest.fn() }));

const findUser = prisma.user.findUnique as jest.Mock;
const verifyToken = verifyAccessToken as jest.Mock;

function request(method: string, baseUrl: string) {
  return { method, baseUrl, headers: { authorization: 'Bearer test-token' } } as Request;
}

function response() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response;
}

beforeEach(() => {
  jest.clearAllMocks();
  verifyToken.mockReturnValue({ id: 'user-id', email: 'old@example.test', roleName: 'admin' });
  findUser.mockResolvedValue({
    id: 'user-id', email: 'contador@example.test', isActive: true,
    roleId: 'accountant-id', role: { name: 'accountant' },
  });
});

describe('Acceso del contador', () => {
  it.each([
    ['GET', '/api/invoices'],
    ['GET', '/api/auth'],
    ['PUT', '/api/auth'],
    ['POST', '/api/auth'],
    ['GET', '/api/settings'],
  ])('permite %s en %s', async (method, baseUrl) => {
    const req = request(method, baseUrl);
    const res = response();
    const next = jest.fn();
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user?.roleName).toBe('accountant');
    expect(req.user?.email).toBe('contador@example.test');
  });

  it.each([
    ['POST', '/api/invoices'],
    ['PUT', '/api/invoices'],
    ['PATCH', '/api/invoices'],
    ['DELETE', '/api/invoices'],
    ['GET', '/api/patients'],
    ['GET', '/api/appointments'],
    ['GET', '/api/payments'],
    ['GET', '/api/payment-orders'],
    ['GET', '/api/users'],
    ['GET', '/api/roles'],
    ['GET', '/api/dashboard'],
    ['GET', '/api/analytics'],
    ['GET', '/api/services'],
    ['GET', '/api/commissions'],
    ['PATCH', '/api/settings'],
  ])('deniega %s en %s aunque el token anterior indique admin', async (method, baseUrl) => {
    const res = response();
    const next = jest.fn();
    await authenticate(request(method, baseUrl), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rechaza usuarios desactivados', async () => {
    findUser.mockResolvedValue({ id: 'user-id', isActive: false });
    const res = response();
    const next = jest.fn();
    await authenticate(request('GET', '/api/invoices'), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('mantiene la autorización del administrador actual', async () => {
    findUser.mockResolvedValue({
      id: 'user-id', email: 'admin@example.test', isActive: true,
      roleId: 'admin-id', role: { name: 'admin' },
    });
    const req = request('POST', '/api/invoices');
    const res = response();
    const authenticated = jest.fn();
    await authenticate(req, res, authenticated);
    expect(authenticated).toHaveBeenCalledTimes(1);
    const authorized = jest.fn();
    authorize('admin')(req, res, authorized);
    expect(authorized).toHaveBeenCalledTimes(1);
  });
});

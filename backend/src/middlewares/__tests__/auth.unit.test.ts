import { Request, Response } from 'express';
import prisma from '../../config/database';
import { verifyAccessToken } from '../../utils/jwt';
import { authenticate, authorize } from '../auth';
import { dbRoleContext } from '../../config/dbRoleContext';

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: { user: { findUnique: jest.fn() } },
}));
jest.mock('../../utils/jwt', () => ({ verifyAccessToken: jest.fn() }));
jest.mock('../../services/employeeDbRoles.service', () => ({
  ensureEmployeeDbRole: jest.fn(async (userId: string) => `emp_${userId}`),
}));

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
  // En Facturas e Inventario decide requireModule según Empleados -> Privilegios.
  it.each([
    ['GET', '/api/invoices'],
    ['POST', '/api/invoices'],
    ['PUT', '/api/invoices'],
    ['DELETE', '/api/invoices'],
    ['GET', '/api/inventory'],
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

describe('Acceso del rol de inventario', () => {
  beforeEach(() => {
    findUser.mockResolvedValue({
      id: 'user-id', email: 'inventario@example.test', isActive: true,
      roleId: 'inventory-id', role: { name: 'inventory' },
    });
  });

  it.each([
    ['GET', '/api/inventory'],
    ['POST', '/api/inventory'],
    ['PUT', '/api/inventory'],
    ['GET', '/api/invoices'],
    ['GET', '/api/auth'],
    ['PUT', '/api/auth'],
    ['GET', '/api/settings'],
  ])('permite %s en %s', async (method, baseUrl) => {
    const req = request(method, baseUrl);
    const next = jest.fn();
    await authenticate(req, response(), next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user?.roleName).toBe('inventory');
  });

  it.each([
    ['GET', '/api/patients'],
    ['GET', '/api/appointments'],
    ['GET', '/api/payments'],
    ['GET', '/api/payment-orders'],
    ['GET', '/api/users'],
    ['GET', '/api/services'],
    ['GET', '/api/dashboard'],
    ['PATCH', '/api/settings'],
  ])('deniega %s en %s', async (method, baseUrl) => {
    const res = response();
    const next = jest.fn();
    await authenticate(request(method, baseUrl), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('Rol de base de datos de la petición', () => {
  const run = async (roleName: string, baseUrl: string) => {
    findUser.mockResolvedValue({
      id: 'user-id', email: 'x@example.test', isActive: true, roleId: 'r', role: { name: roleName },
    });
    let seen: string | null | undefined;
    await authenticate(request('GET', baseUrl), response(), () => {
      seen = dbRoleContext.getStore()?.dbRole;
    });
    return seen;
  };

  it('ventas consulta con el rol propio del empleado', async () => {
    expect(await run('sales', '/api/patients')).toBe('emp_user-id');
  });

  it('corta la petición si no puede preparar el rol del empleado', async () => {
    const { ensureEmployeeDbRole } = jest.requireMock('../../services/employeeDbRoles.service');
    ensureEmployeeDbRole.mockRejectedValueOnce(new Error('sin CREATEROLE'));
    findUser.mockResolvedValue({
      id: 'user-id', email: 'x@example.test', isActive: true, roleId: 'r', role: { name: 'sales' },
    });
    const res = response();
    const next = jest.fn();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await authenticate(request('GET', '/api/patients'), res, next);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
  });

  it('admin consulta como dueño de la base', async () => {
    expect(await run('admin', '/api/patients')).toBeNull();
  });

  it('/api/auth corre como dueño para no bloquear el acceso a la propia cuenta', async () => {
    expect(await run('sales', '/api/auth')).toBeNull();
  });
});

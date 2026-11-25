import { Request, Response } from 'express';
import prisma from '../../config/database';
import { requireModule } from '../auth';
import { accessFromGrants, getModuleAccess } from '../../services/moduleAccess.service';

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: { $queryRaw: jest.fn(), user: { findUnique: jest.fn() } },
}));
jest.mock('../../services/employeeDbRoles.service', () => ({ ensureEmployeeDbRole: jest.fn() }));

const queryRaw = prisma.$queryRaw as unknown as jest.Mock;

/** Simula lo que PostgreSQL concede al rol: lista de "tabla:PRIVILEGIO". */
const grants = (...granted: string[]) => {
  queryRaw.mockImplementation(async (_sql: TemplateStringsArray, _emp: string, _app: string, tables: string[], privs: string[]) =>
    tables.map((t, i) => ({ table_name: t, privilege: privs[i], granted: granted.includes(`${t}:${privs[i]}`) })));
};

const INVOICE_READ = ['registered_invoices:SELECT', 'registered_invoice_attachments:SELECT'];
const USER_ID = '11111111-2222-3333-4444-555555555555';

function response() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response & { status: jest.Mock };
}

beforeEach(() => jest.clearAllMocks());

describe('accessFromGrants', () => {
  it('sin ver el módulo no habilita ninguna acción, aunque tenga INSERT', () => {
    const access = accessFromGrants((t, p) => t === 'registered_invoices' && p === 'INSERT');
    expect(access.invoices).toEqual({ view: false, create: false, edit: false, delete: false });
  });

  it('crear facturas exige insertar también los adjuntos', () => {
    const only = new Set([...INVOICE_READ, 'registered_invoices:INSERT']);
    expect(accessFromGrants((t, p) => only.has(`${t}:${p}`)).invoices.create).toBe(false);
    only.add('registered_invoice_attachments:INSERT');
    expect(accessFromGrants((t, p) => only.has(`${t}:${p}`)).invoices.create).toBe(true);
  });
});

describe('getModuleAccess', () => {
  it('admin puede todo sin consultar la base', async () => {
    const access = await getModuleAccess(USER_ID, 'admin');
    expect(access.invoices.delete).toBe(true);
    expect(access.inventory.move).toBe(true);
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('vendedor con lectura de facturas: ve el módulo pero no registra', async () => {
    grants(...INVOICE_READ, 'products:SELECT', 'inventory_movements:SELECT');
    const access = await getModuleAccess(USER_ID, 'sales');
    expect(access.invoices).toEqual({ view: true, create: false, edit: false, delete: false });
    expect(access.inventory.view).toBe(true);
    expect(access.inventory.move).toBe(false);
  });

  it('un rol sin rol de base (o desconocido) no ve nada', async () => {
    const access = await getModuleAccess(USER_ID, 'otro');
    expect(access.invoices.view).toBe(false);
    expect(queryRaw).not.toHaveBeenCalled();
  });
});

describe('requireModule', () => {
  const req = (roleName: string) => ({ user: { id: USER_ID, email: 'x', roleName } }) as unknown as Request;

  it('deja pasar si el rol tiene el privilegio', async () => {
    grants(...INVOICE_READ);
    const next = jest.fn();
    await requireModule('invoices', 'view')(req('sales'), response(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it('403 si el rol no tiene el privilegio', async () => {
    grants(...INVOICE_READ);
    const res = response();
    const next = jest.fn();
    await requireModule('invoices', 'create')(req('accountant'), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calcula el acceso una sola vez por petición', async () => {
    grants(...INVOICE_READ);
    const r = req('sales');
    await requireModule('invoices', 'view')(r, response(), jest.fn());
    await requireModule('invoices', 'create')(r, response(), jest.fn());
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });
});

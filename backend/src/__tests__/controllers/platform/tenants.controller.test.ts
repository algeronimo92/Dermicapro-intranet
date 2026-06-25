import { Request, Response } from 'express';
import {
  listTenants,
  getTenant,
  createTenantHandler,
  updateTenantHandler,
  activateTenant,
  deactivateTenant,
  getTenantMigrations,
} from '../../../controllers/platform/tenants.controller';
import * as queriesModule from '../../../platform/queries';
import * as provisionModule from '../../../platform/provision';

jest.mock('../../../platform/queries');
jest.mock('../../../platform/provision');

const mockTenant = {
  id: 't1', name: 'Clinica A', slug: 'clinica_a', isActive: true,
  contactEmail: null, contactPhone: null, logoUrl: null,
  createdAt: new Date(), updatedAt: new Date(),
};

function makeRes() {
  const json = jest.fn().mockReturnThis();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json } as unknown as Response;
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return { body: {}, params: {}, ...overrides } as unknown as Request;
}

describe('listTenants', () => {
  it('returns all tenants with total count', async () => {
    (queriesModule.listAllTenants as jest.Mock).mockResolvedValue([mockTenant]);
    const res = makeRes();
    await listTenants(makeReq(), res);
    expect(res.json as jest.Mock).toHaveBeenCalledWith({ data: [mockTenant], total: 1 });
  });
});

describe('getTenant', () => {
  it('returns 404 when tenant not found', async () => {
    (queriesModule.findTenantBySlug as jest.Mock).mockResolvedValue(null);
    const res = makeRes();
    await getTenant(makeReq({ params: { slug: 'nope' } }), res);
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(404);
  });

  it('returns tenant when found', async () => {
    (queriesModule.findTenantBySlug as jest.Mock).mockResolvedValue(mockTenant);
    const res = makeRes();
    await getTenant(makeReq({ params: { slug: 'clinica_a' } }), res);
    expect(res.json as jest.Mock).toHaveBeenCalledWith({ data: mockTenant });
  });
});

describe('createTenantHandler', () => {
  it('returns 400 when name or slug is missing', async () => {
    const res = makeRes();
    await createTenantHandler(makeReq({ body: { name: 'X' } }), res);
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(400);
  });

  it('calls provisionTenant and returns 201 with result', async () => {
    const result = { tenant: mockTenant, migrationsApplied: 55, adminCreated: true };
    (provisionModule.provisionTenant as jest.Mock).mockResolvedValue(result);
    const res = makeRes();
    await createTenantHandler(makeReq({ body: { name: 'Clinica A', slug: 'clinica_a', adminEmail: 'a@c.com', adminPassword: 'pass' } }), res);
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(201);
    expect((res.status as jest.Mock)().json).toHaveBeenCalledWith({ data: result });
  });
});

describe('updateTenantHandler', () => {
  it('returns 404 when tenant not found', async () => {
    (queriesModule.findTenantBySlug as jest.Mock).mockResolvedValue(null);
    const res = makeRes();
    await updateTenantHandler(makeReq({ params: { slug: 'nope' }, body: { name: 'New' } }), res);
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(404);
  });

  it('updates and returns tenant', async () => {
    (queriesModule.findTenantBySlug as jest.Mock).mockResolvedValue(mockTenant);
    const updated = { ...mockTenant, name: 'Updated' };
    (queriesModule.updateTenant as jest.Mock).mockResolvedValue(updated);
    const res = makeRes();
    await updateTenantHandler(makeReq({ params: { slug: 'clinica_a' }, body: { name: 'Updated' } }), res);
    expect(res.json as jest.Mock).toHaveBeenCalledWith({ data: updated });
  });
});

describe('activateTenant', () => {
  it('sets tenant active=true', async () => {
    (queriesModule.findTenantBySlug as jest.Mock).mockResolvedValue(mockTenant);
    (queriesModule.setTenantActive as jest.Mock).mockResolvedValue({ ...mockTenant, isActive: true });
    const res = makeRes();
    await activateTenant(makeReq({ params: { slug: 'clinica_a' } }), res);
    expect(queriesModule.setTenantActive).toHaveBeenCalledWith('t1', true);
  });
});

describe('deactivateTenant', () => {
  it('sets tenant active=false', async () => {
    (queriesModule.findTenantBySlug as jest.Mock).mockResolvedValue(mockTenant);
    (queriesModule.setTenantActive as jest.Mock).mockResolvedValue({ ...mockTenant, isActive: false });
    const res = makeRes();
    await deactivateTenant(makeReq({ params: { slug: 'clinica_a' } }), res);
    expect(queriesModule.setTenantActive).toHaveBeenCalledWith('t1', false);
  });
});

describe('getTenantMigrations', () => {
  it('returns 404 when tenant not found', async () => {
    (queriesModule.findTenantBySlug as jest.Mock).mockResolvedValue(null);
    const res = makeRes();
    await getTenantMigrations(makeReq({ params: { slug: 'nope' } }), res);
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(404);
  });

  it('returns migrations for existing tenant', async () => {
    (queriesModule.findTenantBySlug as jest.Mock).mockResolvedValue(mockTenant);
    const migrations = [{ id: 'm1', tenantId: 't1', migrationName: 'init', appliedAt: new Date(), status: 'success', error: null }];
    (queriesModule.listTenantMigrations as jest.Mock).mockResolvedValue(migrations);
    const res = makeRes();
    await getTenantMigrations(makeReq({ params: { slug: 'clinica_a' } }), res);
    expect(res.json as jest.Mock).toHaveBeenCalledWith({ data: migrations });
  });
});

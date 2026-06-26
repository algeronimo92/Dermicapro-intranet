import {
  createTenantSchema,
  applyMigrationsToTenant,
  seedTenantRoles,
  provisionTenant,
} from '../../platform/provision';
import platformPool from '../../platform/db';
import * as tenantPrismaModule from '../../platform/tenant-prisma';
import * as queriesModule from '../../platform/queries';
import fs from 'fs';
import path from 'path';

jest.mock('../../platform/db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
}));
jest.mock('../../platform/tenant-prisma');
jest.mock('../../platform/queries');
jest.mock('fs');
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true),
}));

const mockQuery = platformPool.query as jest.Mock;
const mockConnect = platformPool.connect as jest.Mock;

describe('createTenantSchema', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates schema for a valid slug', async () => {
    mockQuery.mockResolvedValueOnce({});
    await createTenantSchema('my_clinic');
    expect(mockQuery).toHaveBeenCalledWith('CREATE SCHEMA IF NOT EXISTS "tenant_my_clinic"');
  });

  it('throws for slugs with uppercase letters', async () => {
    await expect(createTenantSchema('MyClinic')).rejects.toThrow('Invalid tenant slug');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('throws for slugs with hyphens', async () => {
    await expect(createTenantSchema('my-clinic')).rejects.toThrow('Invalid tenant slug');
  });

  it('throws for slugs longer than 63 characters', async () => {
    await expect(createTenantSchema('a'.repeat(64))).rejects.toThrow('Invalid tenant slug');
  });
});

describe('applyMigrationsToTenant', () => {
  beforeEach(() => jest.clearAllMocks());

  it('applies migrations in alphabetical order and returns count', async () => {
    const mockClient = { query: jest.fn().mockResolvedValue({}), release: jest.fn() };
    mockConnect.mockResolvedValue(mockClient);

    (fs.readdirSync as jest.Mock).mockReturnValue([
      '20251203_init', '20260101_add_field', 'migration_lock.toml',
    ]);
    (fs.existsSync as jest.Mock).mockImplementation((p: string) => !p.endsWith('.toml'));
    (fs.readFileSync as jest.Mock)
      .mockReturnValueOnce('CREATE TABLE foo (id INT);')
      .mockReturnValueOnce('ALTER TABLE foo ADD COLUMN bar TEXT;');
    (queriesModule.insertTenantMigration as jest.Mock).mockResolvedValue(undefined);

    const count = await applyMigrationsToTenant('clinica', 'tenant-id-1');

    expect(mockClient.query).toHaveBeenNthCalledWith(1, 'SET search_path TO "tenant_clinica"');
    expect(mockClient.query).toHaveBeenNthCalledWith(2, 'CREATE TABLE foo (id INT);');
    expect(mockClient.query).toHaveBeenNthCalledWith(3, 'ALTER TABLE foo ADD COLUMN bar TEXT;');
    expect(count).toBe(2);
    expect(queriesModule.insertTenantMigration).toHaveBeenCalledTimes(2);
    expect(queriesModule.insertTenantMigration).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'success', migrationName: '20251203_init' })
    );
  });

  it('records failure and rethrows on SQL error', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce({})             // SET search_path
        .mockRejectedValueOnce(new Error('SQL error')), // first migration
      release: jest.fn(),
    };
    mockConnect.mockResolvedValue(mockClient);
    (fs.readdirSync as jest.Mock).mockReturnValue(['20251203_init']);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('BAD SQL;');
    (queriesModule.insertTenantMigration as jest.Mock).mockResolvedValue(undefined);

    await expect(applyMigrationsToTenant('clinica', 'tid')).rejects.toThrow('SQL error');
    expect(queriesModule.insertTenantMigration).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', error: 'SQL error' })
    );
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('always releases client even on error', async () => {
    const mockClient = {
      query: jest.fn().mockRejectedValue(new Error('fail')),
      release: jest.fn(),
    };
    mockConnect.mockResolvedValue(mockClient);
    (fs.readdirSync as jest.Mock).mockReturnValue([]);
    await expect(applyMigrationsToTenant('clinica', 'tid')).resolves.toBe(0);
    expect(mockClient.release).toHaveBeenCalled();
  });
});

describe('seedTenantRoles', () => {
  it('creates 4 default roles via Prisma upsert', async () => {
    const mockPrisma = {
      role: { upsert: jest.fn().mockResolvedValue({ id: 'r1', name: 'admin' }) },
    };
    (tenantPrismaModule.getTenantPrisma as jest.Mock).mockReturnValue(mockPrisma);

    await seedTenantRoles('clinica');

    expect(mockPrisma.role.upsert).toHaveBeenCalledTimes(4);
    const callNames = mockPrisma.role.upsert.mock.calls.map((c: any) => c[0].where.name);
    expect(callNames).toEqual(['admin', 'medical_staff', 'assistant', 'sales']);
  });
});

describe('provisionTenant', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates, provisions, and activates a tenant', async () => {
    const mockTenant = { id: 't1', slug: 'clinica', isActive: false, name: 'Clinica' };
    const activeTenant = { ...mockTenant, isActive: true };
    (queriesModule.findTenantBySlug as jest.Mock).mockResolvedValue(null);
    (queriesModule.createTenant as jest.Mock).mockResolvedValue(mockTenant);
    (queriesModule.setTenantActive as jest.Mock).mockResolvedValue(activeTenant);
    mockQuery.mockResolvedValue({});
    const mockClient = { query: jest.fn().mockResolvedValue({}), release: jest.fn() };
    mockConnect.mockResolvedValue(mockClient);
    (fs.readdirSync as jest.Mock).mockReturnValue([]);
    const mockPrisma = {
      role: { upsert: jest.fn().mockResolvedValue({ id: 'r1' }) },
    };
    (tenantPrismaModule.getTenantPrisma as jest.Mock).mockReturnValue(mockPrisma);

    const result = await provisionTenant({ name: 'Clinica', slug: 'clinica' });

    expect(result.tenant.isActive).toBe(true);
    expect(result.adminCreated).toBe(false);
    expect(queriesModule.setTenantActive).toHaveBeenCalledWith('t1', true);
  });

  it('creates admin user when adminEmail + adminPassword provided', async () => {
    const mockTenant = { id: 't1', slug: 'clinica', isActive: false, name: 'Clinica' };
    (queriesModule.findTenantBySlug as jest.Mock).mockResolvedValue(null);
    (queriesModule.createTenant as jest.Mock).mockResolvedValue(mockTenant);
    (queriesModule.setTenantActive as jest.Mock).mockResolvedValue({ ...mockTenant, isActive: true });
    mockQuery.mockResolvedValue({});
    const mockClient = { query: jest.fn().mockResolvedValue({}), release: jest.fn() };
    mockConnect.mockResolvedValue(mockClient);
    (fs.readdirSync as jest.Mock).mockReturnValue([]);
    const mockPrisma = {
      role: {
        upsert: jest.fn().mockResolvedValue({ id: 'r1' }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'r1' }),
      },
      user: { create: jest.fn().mockResolvedValue({ id: 'u1' }) },
    };
    (tenantPrismaModule.getTenantPrisma as jest.Mock).mockReturnValue(mockPrisma);

    const result = await provisionTenant({
      name: 'Clinica',
      slug: 'clinica',
      adminEmail: 'admin@clinica.com',
      adminPassword: 'pass123',
    });

    expect(result.adminCreated).toBe(true);
    expect(mockPrisma.user.create).toHaveBeenCalled();
  });

  it('deactivates tenant and rethrows when schema creation fails', async () => {
    const mockTenant = { id: 't1', slug: 'bad_slug', isActive: false };
    (queriesModule.findTenantBySlug as jest.Mock).mockResolvedValue(null);
    (queriesModule.createTenant as jest.Mock).mockResolvedValue(mockTenant);
    (queriesModule.setTenantActive as jest.Mock).mockResolvedValue(undefined);
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    await expect(provisionTenant({ name: 'X', slug: 'bad_slug' })).rejects.toThrow('DB error');
    expect(queriesModule.setTenantActive).toHaveBeenCalledWith('t1', false);
  });

  it('rejects invalid slug before any DB call', async () => {
    await expect(provisionTenant({ name: 'X', slug: 'Has-Hyphens' })).rejects.toThrow('Slug inválido');
    expect(queriesModule.createTenant).not.toHaveBeenCalled();
  });

  it('rejects when a tenant with the same slug already exists', async () => {
    const mockTenant = { id: 't1', slug: 'clinica', isActive: false, name: 'Clinica' };
    (queriesModule.findTenantBySlug as jest.Mock).mockResolvedValue(mockTenant); // exists
    await expect(provisionTenant({ name: 'X', slug: 'clinica' })).rejects.toThrow('Ya existe un tenant');
    expect(queriesModule.createTenant).not.toHaveBeenCalled();
  });
});

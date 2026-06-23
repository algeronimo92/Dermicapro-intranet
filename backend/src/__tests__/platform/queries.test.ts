import * as queries from '../../platform/queries';

jest.mock('../../platform/db', () => {
  const mockPool = {
    query: jest.fn(),
    end: jest.fn(),
  };
  return mockPool;
});

import platformPool from '../../platform/db';

const mockPool = platformPool as any;

describe('Platform Queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findTenantBySlug', () => {
    test('returns tenant when exists', async () => {
      const mockTenantRow = {
        id: 't1',
        name: 'DermicaPro',
        slug: 'dermicapro',
        is_active: true,
        contact_email: 'contact@dermicapro.com',
        contact_phone: '+51-123456',
        logo_url: 'http://example.com/logo.png',
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-01-01'),
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockTenantRow],
        rowCount: 1,
      });

      const tenant = await queries.findTenantBySlug('dermicapro');

      expect(tenant).not.toBeNull();
      expect(tenant!.slug).toBe('dermicapro');
      expect(tenant!.name).toBe('DermicaPro');
      expect(tenant!.isActive).toBe(true);
      expect(tenant!.contactEmail).toBe('contact@dermicapro.com');
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM tenants WHERE slug = $1',
        ['dermicapro']
      );
    });

    test('returns null for unknown slug', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const tenant = await queries.findTenantBySlug('nonexistent');

      expect(tenant).toBeNull();
    });
  });

  describe('findActiveTenantBySlug', () => {
    test('returns active tenant', async () => {
      const mockTenantRow = {
        id: 't1',
        name: 'DermicaPro',
        slug: 'dermicapro',
        is_active: true,
        contact_email: 'contact@dermicapro.com',
        contact_phone: null,
        logo_url: null,
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-01-01'),
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockTenantRow],
        rowCount: 1,
      });

      const tenant = await queries.findActiveTenantBySlug('dermicapro');

      expect(tenant).not.toBeNull();
      expect(tenant!.isActive).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM tenants WHERE slug = $1 AND is_active = true',
        ['dermicapro']
      );
    });

    test('excludes inactive tenants', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const tenant = await queries.findActiveTenantBySlug('inactiva');

      expect(tenant).toBeNull();
    });
  });

  describe('listActiveTenants', () => {
    test('returns only active tenants', async () => {
      const mockRows = [
        {
          id: 't1',
          name: 'DermicaPro',
          slug: 'dermicapro',
          is_active: true,
          contact_email: null,
          contact_phone: null,
          logo_url: null,
          created_at: new Date('2025-01-01'),
          updated_at: new Date('2025-01-01'),
        },
        {
          id: 't2',
          name: 'Clinic B',
          slug: 'clinic-b',
          is_active: true,
          contact_email: null,
          contact_phone: null,
          logo_url: null,
          created_at: new Date('2025-01-02'),
          updated_at: new Date('2025-01-02'),
        },
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: mockRows,
        rowCount: 2,
      });

      const tenants = await queries.listActiveTenants();

      expect(tenants).toHaveLength(2);
      expect(tenants[0].slug).toBe('dermicapro');
      expect(tenants[1].slug).toBe('clinic-b');
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM tenants WHERE is_active = true ORDER BY name'
      );
    });

    test('returns empty array when no active tenants', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const tenants = await queries.listActiveTenants();

      expect(tenants).toEqual([]);
    });
  });

  describe('findPlatformAdminByEmail', () => {
    test('returns active platform admin', async () => {
      const mockAdminRow = {
        id: 'admin1',
        email: 'admin@platform.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        is_active: true,
        created_at: new Date('2025-01-01'),
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockAdminRow],
        rowCount: 1,
      });

      const admin = await queries.findPlatformAdminByEmail('admin@platform.com');

      expect(admin).not.toBeNull();
      expect(admin!.email).toBe('admin@platform.com');
      expect(admin!.firstName).toBe('John');
      expect(admin!.lastName).toBe('Doe');
      expect(admin!.isActive).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM platform_admins WHERE email = $1 AND is_active = true',
        ['admin@platform.com']
      );
    });

    test('returns null for non-existent admin', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const admin = await queries.findPlatformAdminByEmail('nonexistent@platform.com');

      expect(admin).toBeNull();
    });

    test('excludes inactive admins', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const admin = await queries.findPlatformAdminByEmail('inactive@platform.com');

      expect(admin).toBeNull();
    });
  });
});

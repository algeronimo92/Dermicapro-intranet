import { getTenantPrisma, disconnectAllTenants, getTenantCacheSize } from '../../platform/tenant-prisma';

afterAll(async () => {
  await disconnectAllTenants();
});

describe('Tenant PrismaClient Factory', () => {
  test('getTenantPrisma returns a PrismaClient instance', () => {
    const prisma = getTenantPrisma('test_tenant');
    expect(prisma).toBeDefined();
    expect(typeof prisma.user).toBe('object');
  });

  test('getTenantPrisma returns the same instance for the same slug', () => {
    const a = getTenantPrisma('cache_test');
    const b = getTenantPrisma('cache_test');
    expect(a).toBe(b);
  });

  test('getTenantPrisma returns different instances for different slugs', () => {
    const a = getTenantPrisma('tenant_a');
    const b = getTenantPrisma('tenant_b');
    expect(a).not.toBe(b);
  });

  test('getTenantCacheSize reflects cached clients', () => {
    const before = getTenantCacheSize();
    getTenantPrisma('size_test_tenant');
    expect(getTenantCacheSize()).toBeGreaterThanOrEqual(before);
  });

  test('disconnectAllTenants clears the cache', async () => {
    getTenantPrisma('disconnect_test');
    expect(getTenantCacheSize()).toBeGreaterThan(0);
    await disconnectAllTenants();
    expect(getTenantCacheSize()).toBe(0);
  });
});

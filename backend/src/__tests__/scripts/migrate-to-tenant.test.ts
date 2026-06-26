// backend/src/__tests__/scripts/migrate-to-tenant.test.ts
import { getTableCount, buildMigrationSql } from '../../scripts/migrate-to-tenant';
import { Pool } from 'pg';

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
  })),
}));

describe('getTableCount', () => {
  it('returns row count from table', async () => {
    const mockPool = { query: jest.fn().mockResolvedValue({ rows: [{ count: '42' }] }) } as unknown as Pool;
    const count = await getTableCount(mockPool, 'public', 'roles');
    expect(count).toBe(42);
    expect(mockPool.query).toHaveBeenCalledWith('SELECT COUNT(*) FROM "public"."roles"');
  });
});

describe('buildMigrationSql', () => {
  it('builds correct INSERT INTO ... SELECT statement', () => {
    const sql = buildMigrationSql('public', 'tenant_dermicapro', 'roles');
    expect(sql).toBe(
      'INSERT INTO "tenant_dermicapro"."roles" SELECT * FROM "public"."roles" ON CONFLICT DO NOTHING'
    );
  });
});

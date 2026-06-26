import { upsertTenantMetrics, getTenantMetrics } from '../../platform/queries';
import platformPool from '../../platform/db';

jest.mock('../../platform/db', () => ({ query: jest.fn() }));
const mockQuery = platformPool.query as jest.Mock;

describe('upsertTenantMetrics', () => {
  beforeEach(() => jest.clearAllMocks());

  it('inserts metrics with ON CONFLICT upsert', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await upsertTenantMetrics('tid-1', {
      totalPatients: 10,
      totalAppointmentsMonth: 5,
      activeUsers: 3,
      lastAccess: new Date('2026-06-01'),
    });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT (tenant_id)'),
      ['tid-1', 10, 5, 3, expect.any(Date)],
    );
  });

  it('accepts null lastAccess', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await upsertTenantMetrics('tid-1', {
      totalPatients: 0,
      totalAppointmentsMonth: 0,
      activeUsers: 0,
      lastAccess: null,
    });
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['tid-1', 0, 0, 0, null]);
  });
});

describe('getTenantMetrics', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns mapped TenantMetrics when found', async () => {
    const row = {
      id: 'm1', tenant_id: 'tid-1',
      total_patients: 10, total_appointments_month: 5,
      active_users: 3, last_access: new Date('2026-06-01'),
      updated_at: new Date(),
    };
    mockQuery.mockResolvedValueOnce({ rows: [row] });
    const result = await getTenantMetrics('tid-1');
    expect(result).toMatchObject({
      id: 'm1', tenantId: 'tid-1',
      totalPatients: 10, totalAppointmentsMonth: 5,
      activeUsers: 3,
    });
  });

  it('returns null when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await getTenantMetrics('missing');
    expect(result).toBeNull();
  });
});

import { aggregateTenantMetrics, refreshAllTenantsMetrics } from '../../platform/metrics';
import * as tenantPrismaModule from '../../platform/tenant-prisma';
import * as queriesModule from '../../platform/queries';

jest.mock('../../platform/tenant-prisma');
jest.mock('../../platform/queries');

const mockNow = new Date('2026-06-15T12:00:00Z');
const startOfMonth = new Date(2026, 5, 1); // June 1, 2026

describe('aggregateTenantMetrics', () => {
  beforeEach(() => jest.clearAllMocks());

  it('queries the tenant schema and upserts metrics', async () => {
    const lastUserDate = new Date('2026-06-14');
    const mockPrisma = {
      patient: { count: jest.fn().mockResolvedValue(42) },
      appointment: { count: jest.fn().mockResolvedValue(7) },
      user: {
        count: jest.fn().mockResolvedValue(5),
        findFirst: jest.fn().mockResolvedValue({ updatedAt: lastUserDate }),
      },
    };
    (tenantPrismaModule.getTenantPrisma as jest.Mock).mockReturnValue(mockPrisma);
    (queriesModule.upsertTenantMetrics as jest.Mock).mockResolvedValue(undefined);

    await aggregateTenantMetrics('clinica_a', 'tenant-1');

    expect(tenantPrismaModule.getTenantPrisma).toHaveBeenCalledWith('clinica_a');
    expect(mockPrisma.patient.count).toHaveBeenCalled();
    expect(mockPrisma.appointment.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ scheduledDate: expect.any(Object) }) })
    );
    expect(mockPrisma.user.count).toHaveBeenCalledWith({ where: { isActive: true } });
    expect(queriesModule.upsertTenantMetrics).toHaveBeenCalledWith('tenant-1', {
      totalPatients: 42,
      totalAppointmentsMonth: 7,
      activeUsers: 5,
      lastAccess: lastUserDate,
    });
  });

  it('uses null lastAccess when no users exist', async () => {
    const mockPrisma = {
      patient: { count: jest.fn().mockResolvedValue(0) },
      appointment: { count: jest.fn().mockResolvedValue(0) },
      user: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
    };
    (tenantPrismaModule.getTenantPrisma as jest.Mock).mockReturnValue(mockPrisma);
    (queriesModule.upsertTenantMetrics as jest.Mock).mockResolvedValue(undefined);

    await aggregateTenantMetrics('empty_clinic', 'tenant-2');

    expect(queriesModule.upsertTenantMetrics).toHaveBeenCalledWith('tenant-2', expect.objectContaining({ lastAccess: null }));
  });
});

describe('refreshAllTenantsMetrics', () => {
  beforeEach(() => jest.clearAllMocks());

  it('aggregates metrics for all active tenants', async () => {
    const tenants = [
      { id: 't1', slug: 'clinic_a', isActive: true, name: 'A', contactEmail: null, contactPhone: null, logoUrl: null, createdAt: new Date(), updatedAt: new Date() },
      { id: 't2', slug: 'clinic_b', isActive: true, name: 'B', contactEmail: null, contactPhone: null, logoUrl: null, createdAt: new Date(), updatedAt: new Date() },
    ];
    (queriesModule.listActiveTenants as jest.Mock).mockResolvedValue(tenants);
    const mockPrisma = {
      patient: { count: jest.fn().mockResolvedValue(1) },
      appointment: { count: jest.fn().mockResolvedValue(1) },
      user: { count: jest.fn().mockResolvedValue(1), findFirst: jest.fn().mockResolvedValue(null) },
    };
    (tenantPrismaModule.getTenantPrisma as jest.Mock).mockReturnValue(mockPrisma);
    (queriesModule.upsertTenantMetrics as jest.Mock).mockResolvedValue(undefined);

    await refreshAllTenantsMetrics();

    expect(queriesModule.listActiveTenants).toHaveBeenCalled();
    expect(queriesModule.upsertTenantMetrics).toHaveBeenCalledTimes(2);
  });

  it('continues aggregating even if one tenant fails', async () => {
    const tenants = [
      { id: 't1', slug: 'good', isActive: true, name: 'G', contactEmail: null, contactPhone: null, logoUrl: null, createdAt: new Date(), updatedAt: new Date() },
      { id: 't2', slug: 'bad', isActive: true, name: 'B', contactEmail: null, contactPhone: null, logoUrl: null, createdAt: new Date(), updatedAt: new Date() },
    ];
    (queriesModule.listActiveTenants as jest.Mock).mockResolvedValue(tenants);
    const goodPrisma = {
      patient: { count: jest.fn().mockResolvedValue(5) },
      appointment: { count: jest.fn().mockResolvedValue(2) },
      user: { count: jest.fn().mockResolvedValue(3), findFirst: jest.fn().mockResolvedValue(null) },
    };
    (tenantPrismaModule.getTenantPrisma as jest.Mock)
      .mockReturnValueOnce(goodPrisma)
      .mockImplementationOnce(() => { throw new Error('connection refused'); });
    (queriesModule.upsertTenantMetrics as jest.Mock).mockResolvedValue(undefined);

    // Should not throw even when one tenant fails
    await expect(refreshAllTenantsMetrics()).resolves.not.toThrow();
    // Good tenant still processed
    expect(queriesModule.upsertTenantMetrics).toHaveBeenCalledTimes(1);
  });
});

import { Request, Response } from 'express';
import { getTenantMetricsHandler, refreshTenantMetricsHandler } from '../../../controllers/platform/tenants.controller';
import * as queriesModule from '../../../platform/queries';
import * as metricsModule from '../../../platform/metrics';

jest.mock('../../../platform/queries');
jest.mock('../../../platform/metrics');

const mockTenant = { id: 't1', name: 'Clinica', slug: 'clinica', isActive: true, contactEmail: null, contactPhone: null, logoUrl: null, createdAt: new Date(), updatedAt: new Date() };
const mockMetrics = { id: 'm1', tenantId: 't1', totalPatients: 10, totalAppointmentsMonth: 5, activeUsers: 3, lastAccess: null, updatedAt: new Date() };

function makeRes() {
  const json = jest.fn().mockReturnThis();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json } as unknown as Response;
}
function makeReq(params = {}): Request {
  return { params } as unknown as Request;
}

describe('getTenantMetricsHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when tenant not found', async () => {
    (queriesModule.findTenantBySlug as jest.Mock).mockResolvedValue(null);
    const res = makeRes();
    await getTenantMetricsHandler(makeReq({ slug: 'nope' }), res);
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(404);
  });

  it('returns 404 when metrics not yet calculated', async () => {
    (queriesModule.findTenantBySlug as jest.Mock).mockResolvedValue(mockTenant);
    (queriesModule.getTenantMetrics as jest.Mock).mockResolvedValue(null);
    const res = makeRes();
    await getTenantMetricsHandler(makeReq({ slug: 'clinica' }), res);
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(404);
  });

  it('returns metrics when available', async () => {
    (queriesModule.findTenantBySlug as jest.Mock).mockResolvedValue(mockTenant);
    (queriesModule.getTenantMetrics as jest.Mock).mockResolvedValue(mockMetrics);
    const res = makeRes();
    await getTenantMetricsHandler(makeReq({ slug: 'clinica' }), res);
    expect(res.json as jest.Mock).toHaveBeenCalledWith({ data: mockMetrics });
  });
});

describe('refreshTenantMetricsHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when tenant not found', async () => {
    (queriesModule.findTenantBySlug as jest.Mock).mockResolvedValue(null);
    const res = makeRes();
    await refreshTenantMetricsHandler(makeReq({ slug: 'nope' }), res);
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(404);
  });

  it('triggers aggregation and returns updated metrics', async () => {
    (queriesModule.findTenantBySlug as jest.Mock).mockResolvedValue(mockTenant);
    (metricsModule.aggregateTenantMetrics as jest.Mock).mockResolvedValue(undefined);
    (queriesModule.getTenantMetrics as jest.Mock).mockResolvedValue(mockMetrics);
    const res = makeRes();
    await refreshTenantMetricsHandler(makeReq({ slug: 'clinica' }), res);
    expect(metricsModule.aggregateTenantMetrics).toHaveBeenCalledWith('clinica', 't1');
    expect(res.json as jest.Mock).toHaveBeenCalledWith({ data: mockMetrics });
  });
});

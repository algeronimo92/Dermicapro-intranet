import { Request, Response } from 'express';

const mockQuery = jest.fn();
jest.mock('../../../platform/db', () => ({ __esModule: true, default: { query: (...a: any[]) => mockQuery(...a) } }));

import { getFailedMigrationsSummaryHandler } from '../../../controllers/platform/tenants.controller';

function makeRes() {
  return { json: jest.fn(), status: jest.fn().mockReturnThis() } as unknown as Response;
}

describe('getFailedMigrationsSummaryHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns total failed and per-tenant breakdown', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        { tenant_slug: 'acme', tenant_name: 'Acme', failed_count: '2' },
        { tenant_slug: 'beta', tenant_name: 'Beta', failed_count: '1' },
      ],
    });
    const res = makeRes();
    await getFailedMigrationsSummaryHandler({} as Request, res);
    expect(res.json).toHaveBeenCalledWith({
      data: {
        totalFailed: 3,
        tenants: [
          { slug: 'acme', name: 'Acme', failedCount: 2 },
          { slug: 'beta', name: 'Beta', failedCount: 1 },
        ],
      },
    });
  });

  it('returns zeros when no failures', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const res = makeRes();
    await getFailedMigrationsSummaryHandler({} as Request, res);
    expect(res.json).toHaveBeenCalledWith({ data: { totalFailed: 0, tenants: [] } });
  });
});

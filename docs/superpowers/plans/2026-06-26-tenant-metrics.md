# Tenant Metrics Aggregation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a background metrics aggregation system that pre-calculates per-tenant stats (patient count, monthly appointments, active users, last access) into `public.tenant_metrics` every 6 hours, plus a platform API endpoint to read them.

**Architecture:** A `metrics.ts` service queries each tenant's schema via `getTenantPrisma(slug)` using Prisma, then writes results to `public.tenant_metrics` via `platformPool`. A `cron.ts` module runs `refreshAllTenantsMetrics()` on startup and every 6 hours via `setInterval`. Two new endpoints (`GET /platform/tenants/:slug/metrics` and `POST /platform/tenants/:slug/metrics/refresh`) expose pre-calculated metrics and allow manual refresh.

**Tech Stack:** Node.js + TypeScript, Express, Prisma (for tenant queries), `pg` Pool (for platform writes), `setInterval` (no extra cron dependency).

## Global Constraints

- No `Co-Authored-By: Claude` in commits.
- No new npm dependencies — use `setInterval` for scheduling.
- All tests live in `backend/src/__tests__/`.
- Test command: `cd backend && npm test -- --testPathPatterns <file>`.
- Error handling pattern: `try { ... throw new AppError(...) ... } catch (err) { if (err instanceof AppError) res.status(err.statusCode).json({ error: err.message }); else res.status(500).json({ error: 'Error al ...' }); }`.
- `AppError` in `backend/src/middlewares/errorHandler.ts`.
- Platform queries use raw `pg` Pool (`platformPool`), never Prisma.
- `getTenantPrisma(slug)` from `backend/src/platform/tenant-prisma.ts`.
- `listActiveTenants()` from `backend/src/platform/queries.ts`.
- `TenantMetrics` interface already in `backend/src/platform/types.ts`: `{ id, tenantId, totalPatients, totalAppointmentsMonth, activeUsers, lastAccess, updatedAt }`.
- `lastAccess`: use max `updatedAt` of all users as proxy (no `lastLoginAt` field on User model).
- `totalAppointmentsMonth`: appointments with `scheduledDate >= first day of current month`.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `backend/src/platform/queries.ts` | Add `upsertTenantMetrics`, `getTenantMetrics` |
| Create | `backend/src/platform/metrics.ts` | `aggregateTenantMetrics`, `refreshAllTenantsMetrics` |
| Create | `backend/src/platform/cron.ts` | `startMetricsCron`, `stopMetricsCron` |
| Modify | `backend/src/controllers/platform/tenants.controller.ts` | Add `getTenantMetricsHandler`, `refreshTenantMetricsHandler` |
| Modify | `backend/src/routes/platform/index.ts` | Add `GET /tenants/:slug/metrics` + `POST /tenants/:slug/metrics/refresh` |
| Modify | `backend/src/index.ts` | Call `startMetricsCron()` in `startServer`, `stopMetricsCron()` in `shutdown` |

---

### Task 1: Platform metrics queries + aggregation service

**Files:**
- Modify: `backend/src/platform/queries.ts`
- Create: `backend/src/platform/metrics.ts`
- Test: `backend/src/__tests__/platform/queries-metrics.test.ts`
- Test: `backend/src/__tests__/platform/metrics.test.ts`

**Interfaces:**
- Consumes: `platformPool` from `backend/src/platform/db.ts`; `getTenantPrisma(slug)` from `backend/src/platform/tenant-prisma.ts`; `listActiveTenants()` from `backend/src/platform/queries.ts`; `TenantMetrics` from `backend/src/platform/types.ts`
- Produces:
  - `upsertTenantMetrics(tenantId: string, data: { totalPatients: number, totalAppointmentsMonth: number, activeUsers: number, lastAccess: Date | null }): Promise<void>`
  - `getTenantMetrics(tenantId: string): Promise<TenantMetrics | null>`
  - `aggregateTenantMetrics(slug: string, tenantId: string): Promise<void>`
  - `refreshAllTenantsMetrics(): Promise<void>`

- [ ] **Step 1: Write failing tests for new platform queries**

```typescript
// backend/src/__tests__/platform/queries-metrics.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npm test -- --testPathPatterns src/__tests__/platform/queries-metrics.test.ts
```

Expected: FAIL — `upsertTenantMetrics is not a function`

- [ ] **Step 3: Add `upsertTenantMetrics` and `getTenantMetrics` to `backend/src/platform/queries.ts`**

Add a `mapTenantMetricsRow` helper and two new exported functions. Append after the existing write queries (after `insertTenantMigration`):

```typescript
function mapTenantMetricsRow(row: any): TenantMetrics {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    totalPatients: row.total_patients,
    totalAppointmentsMonth: row.total_appointments_month,
    activeUsers: row.active_users,
    lastAccess: row.last_access,
    updatedAt: row.updated_at,
  };
}

export async function upsertTenantMetrics(
  tenantId: string,
  data: {
    totalPatients: number;
    totalAppointmentsMonth: number;
    activeUsers: number;
    lastAccess: Date | null;
  },
): Promise<void> {
  await platformPool.query(
    `INSERT INTO tenant_metrics (tenant_id, total_patients, total_appointments_month, active_users, last_access)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (tenant_id)
     DO UPDATE SET
       total_patients          = $2,
       total_appointments_month = $3,
       active_users            = $4,
       last_access             = $5,
       updated_at              = NOW()`,
    [tenantId, data.totalPatients, data.totalAppointmentsMonth, data.activeUsers, data.lastAccess],
  );
}

export async function getTenantMetrics(tenantId: string): Promise<TenantMetrics | null> {
  const result = await platformPool.query(
    'SELECT * FROM tenant_metrics WHERE tenant_id = $1',
    [tenantId],
  );
  return result.rows[0] ? mapTenantMetricsRow(result.rows[0]) : null;
}
```

Also add `TenantMetrics` to the import at the top of `queries.ts`:

```typescript
import { Tenant, PlatformAdmin, TenantMigration, TenantMetrics, CreateTenantDto, UpdateTenantDto } from './types';
```

- [ ] **Step 4: Run queries tests — should pass**

```bash
cd backend && npm test -- --testPathPatterns src/__tests__/platform/queries-metrics.test.ts
```

Expected: PASS — 4 tests

- [ ] **Step 5: Write failing tests for the aggregation service**

```typescript
// backend/src/__tests__/platform/metrics.test.ts
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
```

- [ ] **Step 6: Run tests to verify they fail**

```bash
cd backend && npm test -- --testPathPatterns src/__tests__/platform/metrics.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 7: Create `backend/src/platform/metrics.ts`**

```typescript
import { getTenantPrisma } from './tenant-prisma';
import { listActiveTenants, upsertTenantMetrics } from './queries';

export async function aggregateTenantMetrics(slug: string, tenantId: string): Promise<void> {
  const prisma = getTenantPrisma(slug);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalPatients, totalAppointmentsMonth, activeUsers, lastUser] = await Promise.all([
    prisma.patient.count(),
    prisma.appointment.count({
      where: { scheduledDate: { gte: startOfMonth } },
    }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    }),
  ]);

  await upsertTenantMetrics(tenantId, {
    totalPatients,
    totalAppointmentsMonth,
    activeUsers,
    lastAccess: lastUser?.updatedAt ?? null,
  });
}

export async function refreshAllTenantsMetrics(): Promise<void> {
  const tenants = await listActiveTenants();
  await Promise.allSettled(
    tenants.map((t) => aggregateTenantMetrics(t.slug, t.id)),
  );
}
```

- [ ] **Step 8: Run metrics tests — should pass**

```bash
cd backend && npm test -- --testPathPatterns src/__tests__/platform/metrics.test.ts
```

Expected: PASS — 4 tests

- [ ] **Step 9: Run all tests for regressions**

```bash
cd backend && npm test
```

Expected: All tests pass

- [ ] **Step 10: Commit**

```bash
git add backend/src/platform/queries.ts backend/src/platform/metrics.ts backend/src/__tests__/platform/queries-metrics.test.ts backend/src/__tests__/platform/metrics.test.ts
git commit -m "feat(metrics): platform metrics queries and aggregation service"
```

---

### Task 2: Cron scheduler + HTTP endpoints + index.ts wiring

**Files:**
- Create: `backend/src/platform/cron.ts`
- Modify: `backend/src/controllers/platform/tenants.controller.ts`
- Modify: `backend/src/routes/platform/index.ts`
- Modify: `backend/src/index.ts`
- Test: `backend/src/__tests__/platform/cron.test.ts`
- Test: `backend/src/__tests__/controllers/platform/tenants-metrics.test.ts`

**Interfaces:**
- Consumes:
  - `refreshAllTenantsMetrics()` from `backend/src/platform/metrics.ts`
  - `aggregateTenantMetrics(slug, tenantId)` from `backend/src/platform/metrics.ts`
  - `findTenantBySlug(slug)` from `backend/src/platform/queries.ts`
  - `getTenantMetrics(tenantId)` from `backend/src/platform/queries.ts`
  - `authenticatePlatformAdmin` from `backend/src/middlewares/platformAuth.ts`
  - `AppError` from `backend/src/middlewares/errorHandler.ts`
- Produces:
  - `startMetricsCron(): void` — exported from `cron.ts`; starts interval + immediate run
  - `stopMetricsCron(): void` — exported from `cron.ts`; clears interval
  - `GET /platform/tenants/:slug/metrics` → `{ data: TenantMetrics }` or 404
  - `POST /platform/tenants/:slug/metrics/refresh` → `{ data: TenantMetrics }` (triggers aggregation immediately)

- [ ] **Step 1: Write failing tests for the cron module**

```typescript
// backend/src/__tests__/platform/cron.test.ts
import { startMetricsCron, stopMetricsCron } from '../../platform/cron';
import * as metricsModule from '../../platform/metrics';

jest.mock('../../platform/metrics');
jest.useFakeTimers();

// stopMetricsCron in afterEach resets the module-level cronTimer state
afterEach(() => {
  stopMetricsCron();
  jest.clearAllMocks();
  jest.clearAllTimers();
});

describe('startMetricsCron', () => {
  it('calls refreshAllTenantsMetrics immediately on start', () => {
    (metricsModule.refreshAllTenantsMetrics as jest.Mock).mockResolvedValue(undefined);
    startMetricsCron();
    expect(metricsModule.refreshAllTenantsMetrics).toHaveBeenCalledTimes(1);
  });

  it('calls refreshAllTenantsMetrics again after 6 hours', () => {
    (metricsModule.refreshAllTenantsMetrics as jest.Mock).mockResolvedValue(undefined);
    startMetricsCron();
    jest.advanceTimersByTime(6 * 60 * 60 * 1000);
    expect(metricsModule.refreshAllTenantsMetrics).toHaveBeenCalledTimes(2);
  });

  it('does not start a second interval if already running', () => {
    (metricsModule.refreshAllTenantsMetrics as jest.Mock).mockResolvedValue(undefined);
    startMetricsCron();
    startMetricsCron(); // second call is no-op due to guard
    jest.advanceTimersByTime(6 * 60 * 60 * 1000);
    // 1 immediate + 1 scheduled = 2, not 3+
    expect(metricsModule.refreshAllTenantsMetrics).toHaveBeenCalledTimes(2);
  });
});

describe('stopMetricsCron', () => {
  it('stops the interval so no more calls happen after stop', () => {
    (metricsModule.refreshAllTenantsMetrics as jest.Mock).mockResolvedValue(undefined);
    startMetricsCron();
    stopMetricsCron();
    jest.advanceTimersByTime(12 * 60 * 60 * 1000);
    // Only the initial immediate call; no scheduled calls fire after stop
    expect(metricsModule.refreshAllTenantsMetrics).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Write failing tests for the new controller handlers**

```typescript
// backend/src/__tests__/controllers/platform/tenants-metrics.test.ts
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
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd backend && npm test -- --testPathPatterns "src/__tests__/platform/cron|src/__tests__/controllers/platform/tenants-metrics"
```

Expected: FAIL — modules/exports not found

- [ ] **Step 4: Create `backend/src/platform/cron.ts`**

```typescript
import { refreshAllTenantsMetrics } from './metrics';

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
let cronTimer: NodeJS.Timeout | null = null;

export function startMetricsCron(): void {
  if (cronTimer) return;
  refreshAllTenantsMetrics().catch((err) =>
    console.error('[metrics-cron] Initial run failed:', err),
  );
  cronTimer = setInterval(() => {
    refreshAllTenantsMetrics().catch((err) =>
      console.error('[metrics-cron] Scheduled run failed:', err),
    );
  }, SIX_HOURS_MS);
}

export function stopMetricsCron(): void {
  if (cronTimer) {
    clearInterval(cronTimer);
    cronTimer = null;
  }
}
```

- [ ] **Step 5: Add `getTenantMetricsHandler` and `refreshTenantMetricsHandler` to `backend/src/controllers/platform/tenants.controller.ts`**

Add these two exports at the end of the file. Read the file first to confirm its current end, then append:

```typescript
import { aggregateTenantMetrics } from '../../platform/metrics';
import { getTenantMetrics } from '../../platform/queries';
```

Add to the top-of-file imports (alongside existing imports from `../../platform/queries`). Then add the two new handlers:

```typescript
export const getTenantMetricsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenant = await findTenantBySlug(req.params.slug);
    if (!tenant) throw new AppError('Clinica no encontrada', 404);
    const metrics = await getTenantMetrics(tenant.id);
    if (!metrics) throw new AppError('Métricas no disponibles aún. Espere el siguiente ciclo de actualización.', 404);
    res.json({ data: metrics });
  } catch (err) {
    if (err instanceof AppError) res.status(err.statusCode).json({ error: err.message });
    else res.status(500).json({ error: 'Error al obtener métricas' });
  }
};

export const refreshTenantMetricsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenant = await findTenantBySlug(req.params.slug);
    if (!tenant) throw new AppError('Clinica no encontrada', 404);
    await aggregateTenantMetrics(tenant.slug, tenant.id);
    const metrics = await getTenantMetrics(tenant.id);
    res.json({ data: metrics });
  } catch (err) {
    if (err instanceof AppError) res.status(err.statusCode).json({ error: err.message });
    else res.status(500).json({ error: 'Error al actualizar métricas' });
  }
};
```

- [ ] **Step 6: Add metrics routes to `backend/src/routes/platform/index.ts`**

Add the new imports and two routes. Read the current file first, then replace its content:

```typescript
import { Router } from 'express';
import { platformLogin, getPlatformAdminMe } from '../../controllers/platform/auth.controller';
import {
  listTenants,
  getTenant,
  createTenantHandler,
  updateTenantHandler,
  activateTenant,
  deactivateTenant,
  getTenantMigrations,
  getTenantMetricsHandler,
  refreshTenantMetricsHandler,
} from '../../controllers/platform/tenants.controller';
import { authenticatePlatformAdmin } from '../../middlewares/platformAuth';

const router = Router();

// Platform admin authentication
router.post('/auth/login', platformLogin);
router.get('/auth/me', authenticatePlatformAdmin, getPlatformAdminMe);

// Tenant management (all require platform admin auth)
router.get('/tenants', authenticatePlatformAdmin, listTenants);
router.post('/tenants', authenticatePlatformAdmin, createTenantHandler);
router.get('/tenants/:slug', authenticatePlatformAdmin, getTenant);
router.put('/tenants/:slug', authenticatePlatformAdmin, updateTenantHandler);
router.post('/tenants/:slug/activate', authenticatePlatformAdmin, activateTenant);
router.post('/tenants/:slug/deactivate', authenticatePlatformAdmin, deactivateTenant);
router.get('/tenants/:slug/migrations', authenticatePlatformAdmin, getTenantMigrations);
router.get('/tenants/:slug/metrics', authenticatePlatformAdmin, getTenantMetricsHandler);
router.post('/tenants/:slug/metrics/refresh', authenticatePlatformAdmin, refreshTenantMetricsHandler);

export default router;
```

- [ ] **Step 7: Wire cron into `backend/src/index.ts`**

Read the current `backend/src/index.ts` first. Add the cron import:

```typescript
import { startMetricsCron, stopMetricsCron } from './platform/cron';
```

In `startServer()`, after `app.listen(...)`, add:

```typescript
startMetricsCron();
```

In the `shutdown` function, before `await disconnectAllTenants()`, add:

```typescript
stopMetricsCron();
```

The resulting `shutdown` function:

```typescript
const shutdown = async () => {
  console.log('Shutting down...');
  stopMetricsCron();
  await disconnectAllTenants();
  await platformPool.end();
  await prisma.$disconnect();
  process.exit(0);
};
```

- [ ] **Step 8: Run new tests — should all pass**

```bash
cd backend && npm test -- --testPathPatterns "src/__tests__/platform/cron|src/__tests__/controllers/platform/tenants-metrics"
```

Expected: PASS — 7 tests

- [ ] **Step 9: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: No new errors (pre-existing errors in auth.controller.ts/appointments.controller.ts are known, ignore them)

- [ ] **Step 10: Run full test suite**

```bash
cd backend && npm test
```

Expected: All tests pass (155+ tests)

- [ ] **Step 11: Commit**

```bash
git add backend/src/platform/cron.ts backend/src/controllers/platform/tenants.controller.ts backend/src/routes/platform/index.ts backend/src/index.ts backend/src/__tests__/platform/cron.test.ts backend/src/__tests__/controllers/platform/tenants-metrics.test.ts
git commit -m "feat(metrics): cron scheduler, metrics endpoints, and index.ts wiring"
```

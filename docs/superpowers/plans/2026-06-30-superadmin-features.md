# Superadmin Panel — 6 New Features

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add search/filter, growth chart, failed-migration alerts, tenant impersonation, platform admin CRUD, and platform config settings to the superadmin panel.

**Architecture:** Features split into frontend-only tasks (Tasks 1–3) and full-stack tasks (Tasks 4–8). Frontend uses existing recharts + global CSS design system; backend extends the `/platform` Express router with new controllers following the existing pattern. The impersonation flow adds a `/impersonate` route to the tenant frontend that reads a short-lived JWT from a query param.

**Tech Stack:** React 18, TypeScript, recharts ^3.6, Express, bcrypt, PostgreSQL via `platformPool` (pg).

## Global Constraints

- No emojis anywhere (code, UI, comments, commits)
- Global CSS classes: `.btn .btn-primary`, `.btn .btn-secondary`, `.form-input`, `.form-label`, `.form-group`, `.table`, `.table-container`, `.badge`, `.alert .alert-error`, `.modal-overlay`, `.modal-content`, `.modal-header`, `.modal-body`, `.modal-footer`, `.modal-title`, `.modal-close`
- Superadmin layout classes: `.superadmin-page`, `.superadmin-page__header`, `.superadmin-panel`, `.superadmin-panel__header`, `.superadmin-grid`, `.superadmin-card`
- Backend errors: `throw new AppError(message, statusCode)` from `../../middlewares/errorHandler`
- Backend auth guard: `authenticatePlatformAdmin` middleware from `../../middlewares/platformAuth`
- Frontend API base: `/platform` (via Vite proxy)
- TypeCheck after every task: `cd frontend && npx tsc --noEmit`
- Backend tests: `cd backend && npx jest --no-coverage --testPathPatterns="<pattern>"`
- Frontend tests: `cd frontend && npx jest --no-coverage --testPathPatterns="<pattern>"`

---

## File Map

| File | Action | Feature |
|------|--------|---------|
| `frontend/src/pages/superadmin/SuperAdminTenantsPage.tsx` | Modify | Search/filter |
| `frontend/src/components/superadmin/TenantMetricsChart.tsx` | Create | Growth chart |
| `frontend/src/pages/superadmin/SuperAdminDashboardPage.tsx` | Modify | Growth chart |
| `backend/src/controllers/platform/tenants.controller.ts` | Modify | Failed migrations summary |
| `backend/src/platform/queries.ts` | Modify | Failed migrations, admin CRUD, settings |
| `frontend/src/services/platformAdminApi.ts` | Modify | All new API calls |
| `frontend/src/components/superadmin/SuperAdminLayout.tsx` | Modify | Failed migrations alert badge |
| `backend/src/controllers/platform/impersonation.controller.ts` | Create | Impersonation |
| `frontend/src/pages/ImpersonatePage.tsx` | Create | Impersonation (tenant frontend) |
| `frontend/src/App.tsx` | Modify | Impersonation route |
| `backend/src/controllers/platform/admins.controller.ts` | Create | Admin CRUD |
| `frontend/src/pages/superadmin/SuperAdminAdminsPage.tsx` | Create | Admin CRUD |
| `backend/src/platform/db.ts` | Modify | Platform settings table |
| `backend/src/controllers/platform/settings.controller.ts` | Create | Platform config |
| `frontend/src/pages/superadmin/SuperAdminSettingsPage.tsx` | Create | Platform config |
| `backend/src/routes/platform/index.ts` | Modify | All new routes |
| `frontend/src/components/superadmin/SuperAdminLayout.tsx` | Modify | New nav links |
| `frontend/src/App.tsx` | Modify | New superadmin routes |
| `backend/src/__tests__/controllers/platform/admins.controller.test.ts` | Create | Admin CRUD tests |
| `backend/src/__tests__/controllers/platform/impersonation.controller.test.ts` | Create | Impersonation tests |

---

## Task 1: Búsqueda y filtros en la lista de clínicas

**Files:**
- Modify: `frontend/src/pages/superadmin/SuperAdminTenantsPage.tsx`

**Interfaces:**
- Consumes: existing `Tenant[]` state, existing `sortedTenants` memo
- Produces: filtered tenant list driven by `search` + `filterStatus` local state

- [ ] **Step 1: Add search and filter state + filtered list to SuperAdminTenantsPage.tsx**

Replace the `sortedTenants` memo and add search/filter UI. The full updated section (imports unchanged):

```tsx
// Add inside SuperAdminTenantsPage, after existing state declarations:
const [search, setSearch] = useState('');
const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

const filteredTenants = useMemo(() => {
  const q = search.trim().toLowerCase();
  return [...tenants]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .filter((t) => {
      const matchesSearch = !q || t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q);
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && t.isActive) ||
        (filterStatus === 'inactive' && !t.isActive);
      return matchesSearch && matchesStatus;
    });
}, [tenants, search, filterStatus]);
```

Replace all occurrences of `sortedTenants` in the JSX with `filteredTenants`.

Add the search/filter bar just after the `{error && ...}` block and before `<section className="superadmin-panel">`:

```tsx
<div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
  <input
    type="search"
    className="form-input"
    placeholder="Buscar por nombre o slug..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    style={{ flex: '1 1 240px' }}
  />
  <select
    className="form-input"
    value={filterStatus}
    onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
    style={{ width: 160 }}
  >
    <option value="all">Todas</option>
    <option value="active">Activas</option>
    <option value="inactive">Inactivas</option>
  </select>
</div>
```

- [ ] **Step 2: TypeCheck**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/superadmin/SuperAdminTenantsPage.tsx
git commit -m "feat(superadmin): search and status filter on tenants list"
```

---

## Task 2: Gráfico de crecimiento por clínica

**Files:**
- Create: `frontend/src/components/superadmin/TenantMetricsChart.tsx`
- Modify: `frontend/src/pages/superadmin/SuperAdminDashboardPage.tsx`

**Interfaces:**
- Consumes: `TenantMetrics` and `Tenant` types from `platformAdminApi`
- Produces: `<TenantMetricsChart rows={...} />` where `rows` is `Array<{ tenant: Tenant; metrics: TenantMetrics | null }>`

- [ ] **Step 1: Create TenantMetricsChart.tsx**

```tsx
// frontend/src/components/superadmin/TenantMetricsChart.tsx
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Tenant, TenantMetrics } from '../../services/platformAdminApi';

interface Row { tenant: Tenant; metrics: TenantMetrics | null; }

interface Props { rows: Row[]; }

export function TenantMetricsChart({ rows }: Props) {
  const data = rows.map(({ tenant, metrics }) => ({
    name: tenant.name,
    Pacientes: metrics?.totalPatients ?? 0,
    'Citas (mes)': metrics?.totalAppointmentsMonth ?? 0,
    'Usuarios activos': metrics?.activeUsers ?? 0,
  }));

  if (data.length === 0) return null;

  return (
    <div className="superadmin-panel" style={{ padding: 'var(--spacing-lg)' }}>
      <div className="superadmin-panel__header" style={{ border: 'none', padding: '0 0 var(--spacing-md)' }}>
        <h2>Comparativa entre clínicas</h2>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-secondary)" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
          <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border-secondary)',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Bar dataKey="Pacientes" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Citas (mes)" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Usuarios activos" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Add chart to SuperAdminDashboardPage.tsx**

Add import at top:
```tsx
import { TenantMetricsChart } from '../../components/superadmin/TenantMetricsChart';
```

Add the `rows` memo and chart below the existing table section. Replace the return statement's last part — after the `</section>` that wraps the table, add:

```tsx
const rows = useMemo(
  () => tenants.map((t) => ({ tenant: t, metrics: metricsByTenant[t.slug] ?? null })),
  [tenants, metricsByTenant],
);
```

And in the JSX, after the closing `</section>` of "Resumen de clínicas":
```tsx
{!isLoading && rows.length > 1 && <TenantMetricsChart rows={rows} />}
```

- [ ] **Step 3: TypeCheck**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/superadmin/TenantMetricsChart.tsx frontend/src/pages/superadmin/SuperAdminDashboardPage.tsx
git commit -m "feat(superadmin): tenant metrics comparison bar chart"
```

---

## Task 3: Backend — endpoint de migraciones fallidas

**Files:**
- Modify: `backend/src/platform/queries.ts`
- Modify: `backend/src/controllers/platform/tenants.controller.ts`
- Modify: `backend/src/routes/platform/index.ts`
- Test: `backend/src/__tests__/controllers/platform/tenants-failed-migrations.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  // GET /platform/migrations/failed-summary
  // Response: { data: { totalFailed: number; tenants: Array<{ slug: string; name: string; failedCount: number }> } }
  export async function getFailedMigrationsSummary(): Promise<Array<{ tenantId: string; tenantSlug: string; tenantName: string; failedCount: number }>>
  export const getFailedMigrationsSummaryHandler: RequestHandler
  ```

- [ ] **Step 1: Write test**

```typescript
// backend/src/__tests__/controllers/platform/tenants-failed-migrations.test.ts
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
```

- [ ] **Step 2: Run test — must fail**

```bash
cd backend && npx jest --no-coverage --testPathPatterns="tenants-failed-migrations"
```
Expected: FAIL — handler not exported.

- [ ] **Step 3: Add query to queries.ts**

Add at the end of `backend/src/platform/queries.ts`:

```typescript
export async function getFailedMigrationsSummary(): Promise<
  Array<{ tenantSlug: string; tenantName: string; failedCount: number }>
> {
  const result = await platformPool.query(`
    SELECT t.slug AS tenant_slug, t.name AS tenant_name,
           COUNT(tm.id) AS failed_count
    FROM tenants t
    JOIN tenant_migrations tm ON tm.tenant_id = t.id
    WHERE tm.status = 'failed'
    GROUP BY t.id, t.slug, t.name
    ORDER BY failed_count DESC
  `);
  return result.rows.map((r: any) => ({
    tenantSlug: r.tenant_slug,
    tenantName: r.tenant_name,
    failedCount: parseInt(r.failed_count, 10),
  }));
}
```

- [ ] **Step 4: Add handler to tenants.controller.ts**

In the existing import at the top of `backend/src/controllers/platform/tenants.controller.ts`, add `getFailedMigrationsSummary` to the destructure list:

```typescript
import {
  listAllTenants, findTenantBySlug, updateTenant, setTenantActive,
  listTenantMigrations, getTenantMetrics, getFailedMigrationsSummary,
} from '../../platform/queries';
```

Then add at the bottom of the file:

```typescript
export const getFailedMigrationsSummaryHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await getFailedMigrationsSummary();
    const totalFailed = rows.reduce((s, r) => s + r.failedCount, 0);
    res.json({
      data: {
        totalFailed,
        tenants: rows.map((r) => ({ slug: r.tenantSlug, name: r.tenantName, failedCount: r.failedCount })),
      },
    });
  } catch {
    res.status(500).json({ error: 'Error al obtener resumen de migraciones' });
  }
};
```

- [ ] **Step 5: Add route to platform/index.ts**

In `backend/src/routes/platform/index.ts`, add the import and route:

```typescript
import { ..., getFailedMigrationsSummaryHandler } from '../../controllers/platform/tenants.controller';

// After existing tenant routes:
router.get('/migrations/failed-summary', authenticatePlatformAdmin, getFailedMigrationsSummaryHandler);
```

- [ ] **Step 6: Run test — must pass**

```bash
cd backend && npx jest --no-coverage --testPathPatterns="tenants-failed-migrations"
```
Expected: PASS — 2 tests.

- [ ] **Step 7: Commit**

```bash
git add backend/src/platform/queries.ts backend/src/controllers/platform/tenants.controller.ts backend/src/routes/platform/index.ts backend/src/__tests__/controllers/platform/tenants-failed-migrations.test.ts
git commit -m "feat(platform): GET /migrations/failed-summary endpoint"
```

---

## Task 4: Alerta de migraciones fallidas en el sidebar

**Files:**
- Modify: `frontend/src/services/platformAdminApi.ts`
- Modify: `frontend/src/components/superadmin/SuperAdminLayout.tsx`

**Interfaces:**
- Consumes: `GET /platform/migrations/failed-summary` from Task 3
- Produces: red numeric badge on "Clínicas" nav item when `totalFailed > 0`

- [ ] **Step 1: Add API function to platformAdminApi.ts**

```typescript
// Add to platformAdminApi exports:
export interface FailedMigrationsSummary {
  totalFailed: number;
  tenants: Array<{ slug: string; name: string; failedCount: number }>;
}

// Add to platformAdminApi object:
async getFailedMigrationsSummary(): Promise<FailedMigrationsSummary> {
  const res = await client.get<{ data: FailedMigrationsSummary }>('/migrations/failed-summary');
  return res.data.data;
},
```

- [ ] **Step 2: Update SuperAdminLayout.tsx to fetch and display alert badge**

```typescript
// frontend/src/components/superadmin/SuperAdminLayout.tsx
import React, { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, Building2, LogOut, Settings, ShieldCheck, UserCog } from 'lucide-react';
import { usePlatformAuth } from '../../contexts/PlatformAuthContext';
import { platformAdminApi } from '../../services/platformAdminApi';

export const SuperAdminLayout: React.FC = () => {
  const { platformAdmin, logout } = usePlatformAuth();
  const adminName = [platformAdmin?.firstName, platformAdmin?.lastName].filter(Boolean).join(' ') || platformAdmin?.email || 'Superadmin';
  const initials = adminName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const [failedMigrationsCount, setFailedMigrationsCount] = useState(0);

  useEffect(() => {
    platformAdminApi.getFailedMigrationsSummary()
      .then((summary) => setFailedMigrationsCount(summary.totalFailed))
      .catch(() => {});
  }, []);

  return (
    <div className="superadmin-shell">
      <aside className="superadmin-sidebar">
        <div className="superadmin-brand">
          <div className="superadmin-brand__mark"><ShieldCheck size={18} /></div>
          <div>
            <strong>DermicaPro</strong>
            <span>Plataforma</span>
          </div>
        </div>

        <div className="superadmin-sidebar__user">
          <div className="superadmin-sidebar__avatar">{initials}</div>
          <div className="superadmin-sidebar__admin-info">
            <p className="superadmin-sidebar__admin-name">{adminName}</p>
            <p className="superadmin-sidebar__admin-role">Superadmin</p>
          </div>
        </div>

        <nav className="superadmin-nav" aria-label="Superadmin">
          <NavLink to="/superadmin/dashboard" className={({ isActive }) => `superadmin-nav__item ${isActive ? 'superadmin-nav__item--active' : ''}`}>
            <BarChart3 size={18} />Dashboard
          </NavLink>
          <NavLink to="/superadmin/tenants" className={({ isActive }) => `superadmin-nav__item ${isActive ? 'superadmin-nav__item--active' : ''}`}>
            <Building2 size={18} />
            <span style={{ flex: 1 }}>Clínicas</span>
            {failedMigrationsCount > 0 && (
              <span style={{
                background: 'var(--color-error)',
                color: '#fff',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-bold)',
                padding: '1px 6px',
                minWidth: 18,
                textAlign: 'center',
                lineHeight: 1.6,
              }}>
                {failedMigrationsCount}
              </span>
            )}
          </NavLink>
          <NavLink to="/superadmin/admins" className={({ isActive }) => `superadmin-nav__item ${isActive ? 'superadmin-nav__item--active' : ''}`}>
            <UserCog size={18} />Administradores
          </NavLink>
          <NavLink to="/superadmin/settings" className={({ isActive }) => `superadmin-nav__item ${isActive ? 'superadmin-nav__item--active' : ''}`}>
            <Settings size={18} />Configuración
          </NavLink>
        </nav>

        <div className="superadmin-sidebar__footer">
          <button type="button" className="superadmin-sidebar__logout" onClick={logout} aria-label="Cerrar sesión">
            <LogOut size={16} />Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="superadmin-content"><Outlet /></main>
    </div>
  );
};
```

- [ ] **Step 3: TypeCheck**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/services/platformAdminApi.ts frontend/src/components/superadmin/SuperAdminLayout.tsx
git commit -m "feat(superadmin): failed migration alert badge in sidebar"
```

---

## Task 5: Backend — impersonación de tenant

**Files:**
- Create: `backend/src/controllers/platform/impersonation.controller.ts`
- Modify: `backend/src/routes/platform/index.ts`
- Test: `backend/src/__tests__/controllers/platform/impersonation.controller.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  // POST /platform/tenants/:slug/impersonate
  // Response: { data: { token: string; userEmail: string; loginUrl: string } }
  export const impersonateTenantHandler: RequestHandler
  ```

- [ ] **Step 1: Write test**

```typescript
// backend/src/__tests__/controllers/platform/impersonation.controller.test.ts
import { Request, Response } from 'express';

const mockFindUnique = jest.fn();
const mockFindFirst = jest.fn();
jest.mock('../../../platform/queries', () => ({ findActiveTenantBySlug: (...a: any[]) => mockFindFirst(...a) }));
jest.mock('../../../platform/tenant-prisma', () => ({
  getTenantPrisma: () => ({ user: { findFirst: (...a: any[]) => mockFindUnique(...a) } }),
}));
jest.mock('../../../utils/jwt', () => ({
  generateAccessToken: jest.fn().mockReturnValue('impersonation-token'),
}));

import { impersonateTenantHandler } from '../../../controllers/platform/impersonation.controller';

const makeReq = (slug: string) =>
  ({ params: { slug }, platformAdmin: { id: 'a1', email: 'super@plat.com', role: 'platform_admin' } }) as unknown as Request;
const makeRes = () => ({ json: jest.fn(), status: jest.fn().mockReturnThis() } as unknown as Response);

describe('impersonateTenantHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns impersonation token for first admin user', async () => {
    mockFindFirst.mockResolvedValue({ id: 't1', slug: 'acme', name: 'Acme', isActive: true, contactEmail: null, contactPhone: null, logoUrl: null, createdAt: new Date(), updatedAt: new Date() });
    mockFindUnique.mockResolvedValue({ id: 'u1', email: 'admin@acme.com', roleId: 'r1', role: { name: 'admin' } });
    const res = makeRes();
    await impersonateTenantHandler(makeReq('acme'), res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ token: 'impersonation-token', userEmail: 'admin@acme.com' }) }),
    );
  });

  it('returns 404 if tenant not found', async () => {
    mockFindFirst.mockResolvedValue(null);
    const res = makeRes();
    await impersonateTenantHandler(makeReq('ghost'), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 404 if no admin user in tenant', async () => {
    mockFindFirst.mockResolvedValue({ id: 't1', slug: 'acme', name: 'Acme', isActive: true, contactEmail: null, contactPhone: null, logoUrl: null, createdAt: new Date(), updatedAt: new Date() });
    mockFindUnique.mockResolvedValue(null);
    const res = makeRes();
    await impersonateTenantHandler(makeReq('acme'), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
```

- [ ] **Step 2: Run test — must fail**

```bash
cd backend && npx jest --no-coverage --testPathPatterns="impersonation.controller"
```
Expected: FAIL — module not found.

- [ ] **Step 3: Create impersonation.controller.ts**

```typescript
// backend/src/controllers/platform/impersonation.controller.ts
import { Request, Response } from 'express';
import { findActiveTenantBySlug } from '../../platform/queries';
import { getTenantPrisma } from '../../platform/tenant-prisma';
import { generateAccessToken } from '../../utils/jwt';
import { AppError } from '../../middlewares/errorHandler';
import { config } from '../../config/env';

export const impersonateTenantHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    const tenant = await findActiveTenantBySlug(slug);
    if (!tenant) throw new AppError('Clinica no encontrada', 404);

    const prisma = getTenantPrisma(slug);
    const adminUser = await prisma.user.findFirst({
      where: { role: { name: 'admin' } },
      select: { id: true, email: true, roleId: true, role: { select: { name: true } } },
    });
    if (!adminUser) throw new AppError('No existe un usuario admin en esta clinica', 404);

    const token = generateAccessToken({
      id: adminUser.id,
      email: adminUser.email,
      roleId: adminUser.roleId,
      roleName: adminUser.role?.name,
      tenantSlug: slug,
    });

    const domain = config.platform.domain;
    const port = process.env.NODE_ENV === 'development' ? ':5173' : '';
    const loginUrl = `http://${slug}.${domain}${port}/impersonate?token=${token}`;

    res.json({ data: { token, userEmail: adminUser.email, loginUrl } });
  } catch (err) {
    if (err instanceof AppError) res.status(err.statusCode).json({ error: err.message });
    else res.status(500).json({ error: 'Error al generar sesion de impersonacion' });
  }
};
```

- [ ] **Step 4: Add route**

In `backend/src/routes/platform/index.ts`:
```typescript
import { impersonateTenantHandler } from '../../controllers/platform/impersonation.controller';

// After existing tenant routes:
router.post('/tenants/:slug/impersonate', authenticatePlatformAdmin, impersonateTenantHandler);
```

- [ ] **Step 5: Run test — must pass**

```bash
cd backend && npx jest --no-coverage --testPathPatterns="impersonation.controller"
```
Expected: PASS — 3 tests.

- [ ] **Step 6: Commit**

```bash
git add backend/src/controllers/platform/impersonation.controller.ts backend/src/routes/platform/index.ts backend/src/__tests__/controllers/platform/impersonation.controller.test.ts
git commit -m "feat(platform): POST /tenants/:slug/impersonate endpoint"
```

---

## Task 6: Impersonación — frontend (tenant app + superadmin button)

**Files:**
- Create: `frontend/src/pages/ImpersonatePage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/services/platformAdminApi.ts`
- Modify: `frontend/src/pages/superadmin/SuperAdminTenantDetailPage.tsx`

**Interfaces:**
- Consumes: `POST /platform/tenants/:slug/impersonate` from Task 5
- Produces: button in tenant detail that opens tenant URL with impersonation token; tenant `/impersonate` route that sets session and redirects

- [ ] **Step 1: Create ImpersonatePage.tsx in tenant frontend**

```typescript
// frontend/src/pages/ImpersonatePage.tsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function ImpersonatePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      localStorage.setItem('accessToken', token);
      localStorage.removeItem('refreshToken');
      navigate('/', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, []);

  return <div className="login-loading">Iniciando sesión...</div>;
}
```

- [ ] **Step 2: Add /impersonate route to App.tsx**

In `frontend/src/App.tsx`, add import and route inside `<Routes>` BEFORE the `<Route path="/login">`:

```typescript
import { ImpersonatePage } from './pages/ImpersonatePage';

// Inside <Routes>, before /login:
<Route path="/impersonate" element={<ImpersonatePage />} />
```

- [ ] **Step 3: Add API function to platformAdminApi.ts**

```typescript
// Add to platformAdminApi object:
async impersonateTenant(slug: string): Promise<{ token: string; userEmail: string; loginUrl: string }> {
  const res = await client.post<{ data: { token: string; userEmail: string; loginUrl: string } }>(
    `/tenants/${slug}/impersonate`,
  );
  return res.data.data;
},
```

- [ ] **Step 4: Add impersonation button to SuperAdminTenantDetailPage.tsx**

Add import:
```typescript
import { ExternalLink } from 'lucide-react';
```

Add state:
```typescript
const [isImpersonating, setIsImpersonating] = useState(false);
```

Add handler after `toggleActive`:
```typescript
const handleImpersonate = async () => {
  if (!tenant) return;
  setIsImpersonating(true);
  try {
    const { loginUrl } = await platformAdminApi.impersonateTenant(tenant.slug);
    window.open(loginUrl, '_blank', 'noopener,noreferrer');
  } catch (err) {
    setError(getPlatformApiError(err, 'No se pudo generar sesion de impersonacion'));
  } finally {
    setIsImpersonating(false);
  }
};
```

Add button next to the existing action buttons in the page header:
```tsx
<button type="button" className="btn btn-secondary" onClick={handleImpersonate} disabled={isImpersonating || !tenant?.isActive}>
  <ExternalLink size={17} />
  {isImpersonating ? 'Abriendo...' : 'Acceder como admin'}
</button>
```

- [ ] **Step 5: TypeCheck**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/ImpersonatePage.tsx frontend/src/App.tsx frontend/src/services/platformAdminApi.ts frontend/src/pages/superadmin/SuperAdminTenantDetailPage.tsx
git commit -m "feat(superadmin): tenant impersonation button + /impersonate route in tenant app"
```

---

## Task 7: Backend — CRUD de platform admins

**Files:**
- Modify: `backend/src/platform/queries.ts`
- Create: `backend/src/controllers/platform/admins.controller.ts`
- Modify: `backend/src/routes/platform/index.ts`
- Test: `backend/src/__tests__/controllers/platform/admins.controller.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  // GET  /platform/admins  → { data: PlatformAdmin[] }
  // POST /platform/admins  → 201 { data: PlatformAdmin }   body: { email, password, firstName, lastName }
  // DELETE /platform/admins/:id → 204
  export const listPlatformAdminsHandler: RequestHandler
  export const createPlatformAdminHandler: RequestHandler
  export const deactivatePlatformAdminHandler: RequestHandler
  ```

- [ ] **Step 1: Write tests**

```typescript
// backend/src/__tests__/controllers/platform/admins.controller.test.ts
import { Request, Response } from 'express';

const mockQuery = jest.fn();
jest.mock('../../../platform/db', () => ({ __esModule: true, default: { query: (...a: any[]) => mockQuery(...a) } }));
jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('hashed') }));

import { listPlatformAdminsHandler, createPlatformAdminHandler, deactivatePlatformAdminHandler } from '../../../controllers/platform/admins.controller';

const makeRes = () => ({ json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() } as unknown as Response);

describe('listPlatformAdminsHandler', () => {
  it('returns list of admins', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: '1', email: 'a@b.com', first_name: 'A', last_name: 'B', is_active: true, created_at: new Date() }] });
    const res = makeRes();
    await listPlatformAdminsHandler({} as Request, res);
    expect(res.json).toHaveBeenCalledWith({ data: expect.arrayContaining([expect.objectContaining({ email: 'a@b.com' })]) });
  });
});

describe('createPlatformAdminHandler', () => {
  it('creates admin and returns 201', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: '2', email: 'new@b.com', first_name: 'N', last_name: 'E', is_active: true, created_at: new Date() }] });
    const req = { body: { email: 'new@b.com', password: 'pass', firstName: 'N', lastName: 'E' } } as Request;
    const res = makeRes();
    await createPlatformAdminHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ data: expect.objectContaining({ email: 'new@b.com' }) });
  });

  it('returns 400 when required fields missing', async () => {
    const req = { body: {} } as Request;
    const res = makeRes();
    await createPlatformAdminHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('deactivatePlatformAdminHandler', () => {
  it('returns 204 on success', async () => {
    mockQuery.mockResolvedValue({ rowCount: 1, rows: [] });
    const req = { params: { id: '1' }, platformAdmin: { id: '99' } } as unknown as Request;
    const res = makeRes();
    await deactivatePlatformAdminHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });

  it('returns 400 if trying to deactivate self', async () => {
    const req = { params: { id: '1' }, platformAdmin: { id: '1' } } as unknown as Request;
    const res = makeRes();
    await deactivatePlatformAdminHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
```

- [ ] **Step 2: Run tests — must fail**

```bash
cd backend && npx jest --no-coverage --testPathPatterns="admins.controller"
```
Expected: FAIL.

- [ ] **Step 3: Add queries to queries.ts**

Add at the end of `backend/src/platform/queries.ts`:

```typescript
function mapAdminRow(row: any): PlatformAdmin {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash ?? '',
    firstName: row.first_name,
    lastName: row.last_name,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export async function listAllPlatformAdmins(): Promise<PlatformAdmin[]> {
  const result = await platformPool.query(
    'SELECT id, email, first_name, last_name, is_active, created_at FROM platform_admins ORDER BY created_at DESC',
  );
  return result.rows.map(mapAdminRow);
}

export async function createPlatformAdminRecord(data: {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
}): Promise<PlatformAdmin> {
  const result = await platformPool.query(
    `INSERT INTO platform_admins (email, password_hash, first_name, last_name)
     VALUES ($1, $2, $3, $4) RETURNING id, email, first_name, last_name, is_active, created_at`,
    [data.email, data.passwordHash, data.firstName, data.lastName],
  );
  return mapAdminRow(result.rows[0]);
}

export async function deactivatePlatformAdminById(id: string): Promise<boolean> {
  const result = await platformPool.query(
    'UPDATE platform_admins SET is_active = false WHERE id = $1',
    [id],
  );
  return (result.rowCount ?? 0) > 0;
}
```

- [ ] **Step 4: Create admins.controller.ts**

```typescript
// backend/src/controllers/platform/admins.controller.ts
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { listAllPlatformAdmins, createPlatformAdminRecord, deactivatePlatformAdminById } from '../../platform/queries';
import { AppError } from '../../middlewares/errorHandler';

export const listPlatformAdminsHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const admins = await listAllPlatformAdmins();
    res.json({ data: admins.map(({ passwordHash: _ph, ...rest }) => rest) });
  } catch {
    res.status(500).json({ error: 'Error al obtener administradores' });
  }
};

export const createPlatformAdminHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password || !firstName || !lastName) {
      throw new AppError('email, password, firstName y lastName son requeridos', 400);
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await createPlatformAdminRecord({ email, passwordHash, firstName, lastName });
    const { passwordHash: _ph, ...safe } = admin;
    res.status(201).json({ data: safe });
  } catch (err) {
    if (err instanceof AppError) res.status(err.statusCode).json({ error: err.message });
    else res.status(500).json({ error: 'Error al crear administrador' });
  }
};

export const deactivatePlatformAdminHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (id === req.platformAdmin?.id) {
      throw new AppError('No puedes desactivar tu propia cuenta', 400);
    }
    await deactivatePlatformAdminById(id);
    res.status(204).send();
  } catch (err) {
    if (err instanceof AppError) res.status(err.statusCode).json({ error: err.message });
    else res.status(500).json({ error: 'Error al desactivar administrador' });
  }
};
```

- [ ] **Step 5: Add routes**

In `backend/src/routes/platform/index.ts`:
```typescript
import { listPlatformAdminsHandler, createPlatformAdminHandler, deactivatePlatformAdminHandler } from '../../controllers/platform/admins.controller';

router.get('/admins', authenticatePlatformAdmin, listPlatformAdminsHandler);
router.post('/admins', authenticatePlatformAdmin, createPlatformAdminHandler);
router.delete('/admins/:id', authenticatePlatformAdmin, deactivatePlatformAdminHandler);
```

- [ ] **Step 6: Run tests — must pass**

```bash
cd backend && npx jest --no-coverage --testPathPatterns="admins.controller"
```
Expected: PASS — 5 tests.

- [ ] **Step 7: Commit**

```bash
git add backend/src/platform/queries.ts backend/src/controllers/platform/admins.controller.ts backend/src/routes/platform/index.ts backend/src/__tests__/controllers/platform/admins.controller.test.ts
git commit -m "feat(platform): CRUD endpoints for platform admins"
```

---

## Task 8: Frontend — página de administradores de plataforma

**Files:**
- Modify: `frontend/src/services/platformAdminApi.ts`
- Create: `frontend/src/pages/superadmin/SuperAdminAdminsPage.tsx`

**Interfaces:**
- Consumes: `GET/POST/DELETE /platform/admins` from Task 7

- [ ] **Step 1: Add admin API functions to platformAdminApi.ts**

```typescript
// Add types:
export interface PlatformAdmin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreatePlatformAdminDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

// Add to platformAdminApi object:
async listPlatformAdmins(): Promise<PlatformAdmin[]> {
  const res = await client.get<{ data: PlatformAdmin[] }>('/admins');
  return res.data.data;
},
async createPlatformAdmin(dto: CreatePlatformAdminDto): Promise<PlatformAdmin> {
  const res = await client.post<{ data: PlatformAdmin }>('/admins', dto);
  return res.data.data;
},
async deactivatePlatformAdmin(id: string): Promise<void> {
  await client.delete(`/admins/${id}`);
},
```

- [ ] **Step 2: Create SuperAdminAdminsPage.tsx**

```typescript
// frontend/src/pages/superadmin/SuperAdminAdminsPage.tsx
import React, { FormEvent, useEffect, useState } from 'react';
import { Plus, X, UserX } from 'lucide-react';
import { getPlatformApiError, platformAdminApi, PlatformAdmin, CreatePlatformAdminDto } from '../../services/platformAdminApi';
import { usePlatformAuth } from '../../contexts/PlatformAuthContext';

const emptyForm: CreatePlatformAdminDto = { email: '', password: '', firstName: '', lastName: '' };
const formatDate = (v: string) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(v));

export const SuperAdminAdminsPage: React.FC = () => {
  const { platformAdmin: me } = usePlatformAuth();
  const [admins, setAdmins] = useState<PlatformAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CreatePlatformAdminDto>(emptyForm);
  const [isCreating, setIsCreating] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    try { setAdmins(await platformAdminApi.listPlatformAdmins()); }
    catch (err) { setError(getPlatformApiError(err, 'Error al cargar administradores')); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError('');
    try {
      const created = await platformAdminApi.createPlatformAdmin(form);
      setAdmins((prev) => [created, ...prev]);
      setShowModal(false);
      setForm(emptyForm);
    } catch (err) { setError(getPlatformApiError(err, 'Error al crear administrador')); }
    finally { setIsCreating(false); }
  };

  const deactivate = async (admin: PlatformAdmin) => {
    if (!window.confirm(`¿Desactivar a ${admin.firstName} ${admin.lastName}?`)) return;
    setDeactivatingId(admin.id);
    setError('');
    try {
      await platformAdminApi.deactivatePlatformAdmin(admin.id);
      setAdmins((prev) => prev.map((a) => a.id === admin.id ? { ...a, isActive: false } : a));
    } catch (err) { setError(getPlatformApiError(err, 'Error al desactivar administrador')); }
    finally { setDeactivatingId(null); }
  };

  return (
    <div className="superadmin-page">
      <header className="superadmin-page__header">
        <div>
          <h1>Administradores</h1>
          <p>Gestiona las cuentas de superadmin de la plataforma.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={17} />Nuevo admin
        </button>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <section className="superadmin-panel">
        <div className="superadmin-panel__header"><h2>Cuentas de plataforma</h2></div>
        {isLoading ? (
          <div className="superadmin-loading"><div className="loading-spinner" />Cargando...</div>
        ) : (
          <div className="table-container" style={{ borderRadius: 0, border: 'none', boxShadow: 'none' }}>
            <table className="table">
              <thead><tr><th>Nombre</th><th>Email</th><th>Estado</th><th>Creado</th><th>Acciones</th></tr></thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id}>
                    <td style={{ fontWeight: 'var(--font-weight-semibold)' }}>{admin.firstName} {admin.lastName} {admin.id === me?.id && <span className="badge badge-info" style={{ marginLeft: 4 }}>Tú</span>}</td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{admin.email}</td>
                    <td><span className={`badge ${admin.isActive ? 'badge-success' : 'badge-error'}`}>{admin.isActive ? 'Activo' : 'Inactivo'}</span></td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{formatDate(admin.createdAt)}</td>
                    <td>
                      {admin.id !== me?.id && admin.isActive && (
                        <button type="button" className="superadmin-icon-button" onClick={() => deactivate(admin)} disabled={deactivatingId === admin.id} title="Desactivar">
                          <UserX size={17} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showModal && (
        <div className="modal-overlay">
          <section className="modal-content" role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2 className="modal-title">Nuevo administrador</h2>
              <button type="button" className="modal-close" onClick={() => setShowModal(false)} aria-label="Cerrar"><X size={18} /></button>
            </div>
            <form onSubmit={submit}>
              <div className="modal-body">
                <div className="superadmin-form-grid">
                  <div className="form-group"><label className="form-label">Nombre</label><input className="form-input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">Apellido</label><input className="form-input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></div>
                </div>
                <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">Contraseña inicial</label><input type="password" className="form-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={isCreating}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isCreating}>{isCreating ? 'Creando...' : 'Crear admin'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 3: TypeCheck**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/services/platformAdminApi.ts frontend/src/pages/superadmin/SuperAdminAdminsPage.tsx
git commit -m "feat(superadmin): platform admins management page"
```

---

## Task 9: Backend — configuración de plataforma

**Files:**
- Modify: `backend/src/platform/db.ts`
- Create: `backend/src/controllers/platform/settings.controller.ts`
- Modify: `backend/src/routes/platform/index.ts`

**Interfaces:**
- Produces:
  ```typescript
  // GET  /platform/settings → { data: PlatformSettings }
  // PUT  /platform/settings → { data: PlatformSettings }
  interface PlatformSettings {
    smtpHost: string | null;
    smtpPort: number | null;
    smtpUser: string | null;
    smtpPassword: string | null;   // masked as '••••••••' on GET
    smtpFrom: string | null;
    platformDomain: string | null;
    maxTenants: number | null;
  }
  ```

- [ ] **Step 1: Add platform_settings table to db.ts**

Add to the `CREATE TABLE IF NOT EXISTS` block in `ensurePlatformTables()`:

```sql
CREATE TABLE IF NOT EXISTS platform_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON platform_settings(key);
```

- [ ] **Step 2: Create settings.controller.ts**

```typescript
// backend/src/controllers/platform/settings.controller.ts
import { Request, Response } from 'express';
import platformPool from '../../platform/db';

const SETTINGS_KEYS = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_password', 'smtp_from', 'platform_domain', 'max_tenants'] as const;
type SettingKey = typeof SETTINGS_KEYS[number];

async function getAllSettings(): Promise<Record<SettingKey, string | null>> {
  const result = await platformPool.query('SELECT key, value FROM platform_settings WHERE key = ANY($1)', [SETTINGS_KEYS]);
  const map: Record<string, string | null> = {};
  for (const row of result.rows) map[row.key] = row.value;
  const out = {} as Record<SettingKey, string | null>;
  for (const key of SETTINGS_KEYS) out[key] = map[key] ?? null;
  return out;
}

function toResponse(raw: Record<SettingKey, string | null>, maskPassword = true) {
  return {
    smtpHost: raw.smtp_host,
    smtpPort: raw.smtp_port ? parseInt(raw.smtp_port, 10) : null,
    smtpUser: raw.smtp_user,
    smtpPassword: maskPassword && raw.smtp_password ? '••••••••' : raw.smtp_password,
    smtpFrom: raw.smtp_from,
    platformDomain: raw.platform_domain,
    maxTenants: raw.max_tenants ? parseInt(raw.max_tenants, 10) : null,
  };
}

export const getSettingsHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const raw = await getAllSettings();
    res.json({ data: toResponse(raw) });
  } catch {
    res.status(500).json({ error: 'Error al obtener configuracion' });
  }
};

export const updateSettingsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { smtpHost, smtpPort, smtpUser, smtpPassword, smtpFrom, platformDomain, maxTenants } = req.body;
    const updates: Array<[SettingKey, string]> = [];
    if (smtpHost !== undefined) updates.push(['smtp_host', String(smtpHost || '')]);
    if (smtpPort !== undefined) updates.push(['smtp_port', String(smtpPort || '')]);
    if (smtpUser !== undefined) updates.push(['smtp_user', String(smtpUser || '')]);
    if (smtpPassword !== undefined && smtpPassword !== '••••••••') updates.push(['smtp_password', String(smtpPassword || '')]);
    if (smtpFrom !== undefined) updates.push(['smtp_from', String(smtpFrom || '')]);
    if (platformDomain !== undefined) updates.push(['platform_domain', String(platformDomain || '')]);
    if (maxTenants !== undefined) updates.push(['max_tenants', String(maxTenants || '')]);

    for (const [key, value] of updates) {
      await platformPool.query(
        `INSERT INTO platform_settings (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, value],
      );
    }
    const raw = await getAllSettings();
    res.json({ data: toResponse(raw) });
  } catch {
    res.status(500).json({ error: 'Error al guardar configuracion' });
  }
};
```

- [ ] **Step 3: Add routes**

In `backend/src/routes/platform/index.ts`:
```typescript
import { getSettingsHandler, updateSettingsHandler } from '../../controllers/platform/settings.controller';

router.get('/settings', authenticatePlatformAdmin, getSettingsHandler);
router.put('/settings', authenticatePlatformAdmin, updateSettingsHandler);
```

- [ ] **Step 4: Verify backend starts without errors**

```bash
cd "c:\Users\gerso\Documents\GERSON\DERMICAPRO\Dermicapro-intranet" && docker compose logs backend --tail=5
```
Expected: `Platform tables verified`, `Server running on port 5000`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/platform/db.ts backend/src/controllers/platform/settings.controller.ts backend/src/routes/platform/index.ts
git commit -m "feat(platform): GET/PUT /settings endpoint with platform_settings table"
```

---

## Task 10: Frontend — página de configuración de plataforma

**Files:**
- Modify: `frontend/src/services/platformAdminApi.ts`
- Create: `frontend/src/pages/superadmin/SuperAdminSettingsPage.tsx`

**Interfaces:**
- Consumes: `GET/PUT /platform/settings` from Task 9

- [ ] **Step 1: Add settings API to platformAdminApi.ts**

```typescript
export interface PlatformSettings {
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPassword: string | null;
  smtpFrom: string | null;
  platformDomain: string | null;
  maxTenants: number | null;
}

// Add to platformAdminApi object:
async getSettings(): Promise<PlatformSettings> {
  const res = await client.get<{ data: PlatformSettings }>('/settings');
  return res.data.data;
},
async updateSettings(dto: Partial<PlatformSettings>): Promise<PlatformSettings> {
  const res = await client.put<{ data: PlatformSettings }>('/settings', dto);
  return res.data.data;
},
```

- [ ] **Step 2: Create SuperAdminSettingsPage.tsx**

```typescript
// frontend/src/pages/superadmin/SuperAdminSettingsPage.tsx
import React, { FormEvent, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { getPlatformApiError, platformAdminApi, PlatformSettings } from '../../services/platformAdminApi';

const empty: PlatformSettings = {
  smtpHost: '', smtpPort: null, smtpUser: '', smtpPassword: '',
  smtpFrom: '', platformDomain: '', maxTenants: null,
};

export const SuperAdminSettingsPage: React.FC = () => {
  const [form, setForm] = useState<PlatformSettings>(empty);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    platformAdminApi.getSettings()
      .then((s) => setForm(s))
      .catch((err) => setError(getPlatformApiError(err, 'Error al cargar configuracion')))
      .finally(() => setIsLoading(false));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess(false);
    try {
      const saved = await platformAdminApi.updateSettings(form);
      setForm(saved);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(getPlatformApiError(err, 'Error al guardar configuracion'));
    } finally {
      setIsSaving(false);
    }
  };

  const field = (label: string, key: keyof PlatformSettings, type = 'text', hint?: string) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input
        type={type}
        className="form-input"
        value={(form[key] as string | number | null) ?? ''}
        onChange={(e) => setForm({ ...form, [key]: e.target.value || null })}
        placeholder={hint}
        autoComplete={type === 'password' ? 'new-password' : undefined}
      />
    </div>
  );

  return (
    <div className="superadmin-page">
      <header className="superadmin-page__header">
        <div>
          <h1>Configuración</h1>
          <p>Ajustes globales de la plataforma.</p>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">Configuracion guardada correctamente.</div>}

      {isLoading ? (
        <div className="superadmin-loading"><div className="loading-spinner" />Cargando...</div>
      ) : (
        <form onSubmit={submit}>
          <section className="superadmin-panel" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <div className="superadmin-panel__header"><h2>SMTP — Correo electronico</h2></div>
            <div style={{ padding: 'var(--spacing-lg) var(--spacing-xl)' }}>
              <div className="superadmin-form-grid">
                {field('Servidor SMTP', 'smtpHost', 'text', 'smtp.ejemplo.com')}
                {field('Puerto', 'smtpPort', 'number', '587')}
              </div>
              <div className="superadmin-form-grid">
                {field('Usuario', 'smtpUser', 'text', 'usuario@ejemplo.com')}
                {field('Contraseña', 'smtpPassword', 'password')}
              </div>
              {field('Dirección remitente', 'smtpFrom', 'email', 'noreply@plataforma.com')}
            </div>
          </section>

          <section className="superadmin-panel" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <div className="superadmin-panel__header"><h2>Plataforma</h2></div>
            <div style={{ padding: 'var(--spacing-lg) var(--spacing-xl)' }}>
              <div className="superadmin-form-grid">
                {field('Dominio base', 'platformDomain', 'text', 'plataforma.com')}
                {field('Máximo de clínicas', 'maxTenants', 'number', '100')}
              </div>
            </div>
          </section>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              <Save size={17} />
              {isSaving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
```

- [ ] **Step 3: TypeCheck**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/services/platformAdminApi.ts frontend/src/pages/superadmin/SuperAdminSettingsPage.tsx
git commit -m "feat(superadmin): platform settings page (SMTP + domain + max tenants)"
```

---

## Task 11: Wiring — rutas y navegación final

**Files:**
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: all new pages from Tasks 1–10
- Produces: `/superadmin/admins` and `/superadmin/settings` routes accessible and rendered

- [ ] **Step 1: Add lazy imports and routes in App.tsx**

Add lazy imports (alongside existing superadmin lazy imports):
```typescript
const SuperAdminAdminsPage = lazy(() => import('./pages/superadmin/SuperAdminAdminsPage').then((m) => ({ default: m.SuperAdminAdminsPage })));
const SuperAdminSettingsPage = lazy(() => import('./pages/superadmin/SuperAdminSettingsPage').then((m) => ({ default: m.SuperAdminSettingsPage })));
```

Add routes inside the `/superadmin/*` Route children (alongside existing dashboard/tenants routes):
```tsx
<Route path="admins" element={<SuperAdminAdminsPage />} />
<Route path="settings" element={<SuperAdminSettingsPage />} />
```

- [ ] **Step 2: TypeCheck**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Run full backend test suite**

```bash
cd backend && npx jest --no-coverage
```
Expected: all tests pass (existing + new).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat(superadmin): wire admin CRUD and settings pages into router"
```

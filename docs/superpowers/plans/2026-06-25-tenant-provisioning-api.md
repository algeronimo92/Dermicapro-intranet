# Tenant Provisioning API + Data Migration Script

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the backend API for platform admins to create and manage tenants (including automatic schema provisioning), plus a one-time data migration script to move existing DermicaPro data from `public` schema into `tenant_dermicapro`.

**Architecture:** Platform routes live at `/platform` (separate from `/api`, no tenantResolver). A new `provision.ts` module orchestrates schema creation, applying all 55 Prisma migrations via raw SQL, seeding default roles, and creating the initial admin user. A standalone TypeScript script handles the one-time migration of existing data from `public` tables to `tenant_dermicapro`.

**Tech Stack:** Node.js + TypeScript, Express, `pg` (raw Pool), Prisma (for seeding only), bcrypt, jsonwebtoken, Jest + ts-jest.

## Global Constraints

- No `Co-Authored-By: Claude` trailers in any commit.
- Use `make` commands for all Docker operations (never direct `npm` or `node`).
- All tests live in `backend/src/__tests__/`.
- Test command: `cd backend && npm test -- --testPathPatterns <file>`.
- Error handling pattern: `try { ... } catch (err) { if (err instanceof AppError) res.status(err.statusCode).json({ error: err.message }); else res.status(500).json({ error: '...' }); }`.
- `AppError` lives in `backend/src/middlewares/errorHandler.ts`.
- Platform queries use raw `pg` Pool (`platformPool` from `backend/src/platform/db.ts`), never Prisma.
- Valid tenant slug regex: `/^[a-z0-9_]{1,63}$/`.
- `MIGRATIONS_DIR` resolves to `backend/prisma/migrations/` from `__dirname` of `provision.ts` at `src/platform/`.
- JWT_SECRET already in `config.jwt.secret` — platform admin tokens use the same secret but include `role: 'platform_admin'` in payload.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `backend/src/platform/types.ts` | Add `TenantMigration`, `CreateTenantDto`, `UpdateTenantDto`, `ProvisionResult` |
| Modify | `backend/src/platform/queries.ts` | Add write queries: createTenant, updateTenant, setTenantActive, listAllTenants, findTenantById, insertTenantMigration, listTenantMigrations |
| Create | `backend/src/platform/jwt.ts` | `PlatformAdminJwtPayload`, `generatePlatformAdminToken`, `verifyPlatformAdminToken` |
| Create | `backend/src/middlewares/platformAuth.ts` | `authenticatePlatformAdmin` Express middleware |
| Create | `backend/src/platform/provision.ts` | `createTenantSchema`, `applyMigrationsToTenant`, `seedTenantRoles`, `createTenantAdminUser`, `provisionTenant` |
| Create | `backend/src/controllers/platform/auth.controller.ts` | `platformLogin`, `getPlatformAdminMe` |
| Create | `backend/src/controllers/platform/tenants.controller.ts` | CRUD + activate/deactivate/migrations handlers |
| Create | `backend/src/routes/platform/index.ts` | Platform Express router |
| Modify | `backend/src/index.ts` | Register `/platform` router |
| Create | `backend/scripts/migrate-to-tenant.ts` | One-time data migration script |

---

### Task 1: Extend platform types + queries

**Files:**
- Modify: `backend/src/platform/types.ts`
- Modify: `backend/src/platform/queries.ts`
- Test: `backend/src/__tests__/platform/queries.test.ts`

**Interfaces:**
- Produces:
  - `TenantMigration { id, tenantId, migrationName, appliedAt, status, error }`
  - `CreateTenantDto { name, slug, contactEmail?, contactPhone?, logoUrl?, adminEmail?, adminPassword?, adminFirstName?, adminLastName? }`
  - `UpdateTenantDto { name?, contactEmail?, contactPhone?, logoUrl? }`
  - `ProvisionResult { tenant: Tenant, migrationsApplied: number, adminCreated: boolean }`
  - `createTenant(dto) → Promise<Tenant>`
  - `updateTenant(id, dto) → Promise<Tenant | null>`
  - `setTenantActive(id, isActive) → Promise<Tenant | null>`
  - `listAllTenants() → Promise<Tenant[]>`
  - `findTenantById(id) → Promise<Tenant | null>`
  - `insertTenantMigration(data) → Promise<void>`
  - `listTenantMigrations(tenantId) → Promise<TenantMigration[]>`

- [ ] **Step 1: Write failing tests for new queries**

```typescript
// backend/src/__tests__/platform/queries.test.ts
import {
  createTenant,
  updateTenant,
  setTenantActive,
  listAllTenants,
  findTenantById,
  insertTenantMigration,
  listTenantMigrations,
} from '../../platform/queries';
import platformPool from '../../platform/db';

jest.mock('../../platform/db', () => ({
  query: jest.fn(),
}));

const mockQuery = platformPool.query as jest.Mock;

describe('createTenant', () => {
  it('inserts a new tenant with is_active=false and returns mapped row', async () => {
    const row = {
      id: 'uuid-1', name: 'Clinic A', slug: 'clinica_a', is_active: false,
      contact_email: null, contact_phone: null, logo_url: null,
      created_at: new Date(), updated_at: new Date(),
    };
    mockQuery.mockResolvedValueOnce({ rows: [row] });

    const tenant = await createTenant({ name: 'Clinic A', slug: 'clinica_a' });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO tenants'),
      ['Clinic A', 'clinica_a', null, null, null],
    );
    expect(tenant).toMatchObject({ id: 'uuid-1', name: 'Clinic A', slug: 'clinica_a', isActive: false });
  });
});

describe('updateTenant', () => {
  it('updates tenant and returns mapped row', async () => {
    const row = { id: 'uuid-1', name: 'New Name', slug: 'clinica_a', is_active: true, contact_email: 'x@y.com', contact_phone: null, logo_url: null, created_at: new Date(), updated_at: new Date() };
    mockQuery.mockResolvedValueOnce({ rows: [row] });

    const result = await updateTenant('uuid-1', { name: 'New Name', contactEmail: 'x@y.com' });

    expect(result).toMatchObject({ name: 'New Name', contactEmail: 'x@y.com' });
  });

  it('returns null when tenant not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await updateTenant('nonexistent', { name: 'X' });
    expect(result).toBeNull();
  });
});

describe('setTenantActive', () => {
  it('activates tenant', async () => {
    const row = { id: 'uuid-1', name: 'Clinic', slug: 'clinic', is_active: true, contact_email: null, contact_phone: null, logo_url: null, created_at: new Date(), updated_at: new Date() };
    mockQuery.mockResolvedValueOnce({ rows: [row] });

    const result = await setTenantActive('uuid-1', true);
    expect(result?.isActive).toBe(true);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('is_active = $2'), ['uuid-1', true]);
  });
});

describe('listAllTenants', () => {
  it('returns all tenants ordered by created_at desc', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [
      { id: '1', name: 'A', slug: 'a', is_active: true, contact_email: null, contact_phone: null, logo_url: null, created_at: new Date(), updated_at: new Date() },
      { id: '2', name: 'B', slug: 'b', is_active: false, contact_email: null, contact_phone: null, logo_url: null, created_at: new Date(), updated_at: new Date() },
    ] });
    const tenants = await listAllTenants();
    expect(tenants).toHaveLength(2);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('ORDER BY created_at DESC'));
  });
});

describe('insertTenantMigration', () => {
  it('upserts migration record', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await insertTenantMigration({ tenantId: 'tid', migrationName: '20251203_init', status: 'success' });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO tenant_migrations'),
      ['tid', '20251203_init', 'success', null],
    );
  });

  it('records error for failed migration', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await insertTenantMigration({ tenantId: 'tid', migrationName: 'bad', status: 'failed', error: 'syntax error' });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      ['tid', 'bad', 'failed', 'syntax error'],
    );
  });
});

describe('listTenantMigrations', () => {
  it('returns migrations for tenant ordered by applied_at desc', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [
      { id: 'm1', tenant_id: 'tid', migration_name: 'init', applied_at: new Date(), status: 'success', error: null },
    ] });
    const migrations = await listTenantMigrations('tid');
    expect(migrations).toHaveLength(1);
    expect(migrations[0]).toMatchObject({ tenantId: 'tid', migrationName: 'init', status: 'success' });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npm test -- --testPathPatterns src/__tests__/platform/queries.test.ts
```

Expected: FAIL — `createTenant is not a function` (or similar import errors)

- [ ] **Step 3: Extend `backend/src/platform/types.ts`**

Replace the entire file content:

```typescript
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  contactEmail: string | null;
  contactPhone: string | null;
  logoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformAdmin {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: Date;
}

export interface TenantMetrics {
  id: string;
  tenantId: string;
  totalPatients: number;
  totalAppointmentsMonth: number;
  activeUsers: number;
  lastAccess: Date | null;
  updatedAt: Date;
}

export interface TenantMigration {
  id: string;
  tenantId: string;
  migrationName: string;
  appliedAt: Date;
  status: 'success' | 'failed';
  error: string | null;
}

export interface CreateTenantDto {
  name: string;
  slug: string;
  contactEmail?: string;
  contactPhone?: string;
  logoUrl?: string;
  adminEmail?: string;
  adminPassword?: string;
  adminFirstName?: string;
  adminLastName?: string;
}

export interface UpdateTenantDto {
  name?: string;
  contactEmail?: string;
  contactPhone?: string;
  logoUrl?: string;
}

export interface ProvisionResult {
  tenant: Tenant;
  migrationsApplied: number;
  adminCreated: boolean;
}
```

- [ ] **Step 4: Extend `backend/src/platform/queries.ts`**

Replace the entire file content:

```typescript
import platformPool from './db';
import { Tenant, PlatformAdmin, TenantMigration, CreateTenantDto, UpdateTenantDto } from './types';

function mapTenantRow(row: any): Tenant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    isActive: row.is_active,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    logoUrl: row.logo_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPlatformAdminRow(row: any): PlatformAdmin {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    firstName: row.first_name,
    lastName: row.last_name,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function mapTenantMigrationRow(row: any): TenantMigration {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    migrationName: row.migration_name,
    appliedAt: row.applied_at,
    status: row.status,
    error: row.error,
  };
}

// ── Read queries ──────────────────────────────────────────────────────────────

export async function findTenantBySlug(slug: string): Promise<Tenant | null> {
  const result = await platformPool.query(
    'SELECT * FROM tenants WHERE slug = $1',
    [slug]
  );
  return result.rows[0] ? mapTenantRow(result.rows[0]) : null;
}

export async function findActiveTenantBySlug(slug: string): Promise<Tenant | null> {
  const result = await platformPool.query(
    'SELECT * FROM tenants WHERE slug = $1 AND is_active = true',
    [slug]
  );
  return result.rows[0] ? mapTenantRow(result.rows[0]) : null;
}

export async function findTenantById(id: string): Promise<Tenant | null> {
  const result = await platformPool.query(
    'SELECT * FROM tenants WHERE id = $1',
    [id]
  );
  return result.rows[0] ? mapTenantRow(result.rows[0]) : null;
}

export async function listActiveTenants(): Promise<Tenant[]> {
  const result = await platformPool.query(
    'SELECT * FROM tenants WHERE is_active = true ORDER BY name'
  );
  return result.rows.map(mapTenantRow);
}

export async function listAllTenants(): Promise<Tenant[]> {
  const result = await platformPool.query(
    'SELECT * FROM tenants ORDER BY created_at DESC'
  );
  return result.rows.map(mapTenantRow);
}

export async function findPlatformAdminByEmail(email: string): Promise<PlatformAdmin | null> {
  const result = await platformPool.query(
    'SELECT * FROM platform_admins WHERE email = $1 AND is_active = true',
    [email]
  );
  return result.rows[0] ? mapPlatformAdminRow(result.rows[0]) : null;
}

export async function listTenantMigrations(tenantId: string): Promise<TenantMigration[]> {
  const result = await platformPool.query(
    'SELECT * FROM tenant_migrations WHERE tenant_id = $1 ORDER BY applied_at DESC',
    [tenantId]
  );
  return result.rows.map(mapTenantMigrationRow);
}

// ── Write queries ─────────────────────────────────────────────────────────────

export async function createTenant(
  dto: Pick<CreateTenantDto, 'name' | 'slug' | 'contactEmail' | 'contactPhone' | 'logoUrl'>
): Promise<Tenant> {
  const result = await platformPool.query(
    `INSERT INTO tenants (name, slug, contact_email, contact_phone, logo_url, is_active)
     VALUES ($1, $2, $3, $4, $5, false)
     RETURNING *`,
    [dto.name, dto.slug, dto.contactEmail ?? null, dto.contactPhone ?? null, dto.logoUrl ?? null]
  );
  return mapTenantRow(result.rows[0]);
}

export async function updateTenant(id: string, dto: UpdateTenantDto): Promise<Tenant | null> {
  const result = await platformPool.query(
    `UPDATE tenants
     SET name          = COALESCE($2, name),
         contact_email = COALESCE($3, contact_email),
         contact_phone = COALESCE($4, contact_phone),
         logo_url      = COALESCE($5, logo_url),
         updated_at    = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, dto.name ?? null, dto.contactEmail ?? null, dto.contactPhone ?? null, dto.logoUrl ?? null]
  );
  return result.rows[0] ? mapTenantRow(result.rows[0]) : null;
}

export async function setTenantActive(id: string, isActive: boolean): Promise<Tenant | null> {
  const result = await platformPool.query(
    'UPDATE tenants SET is_active = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
    [id, isActive]
  );
  return result.rows[0] ? mapTenantRow(result.rows[0]) : null;
}

export async function insertTenantMigration(data: {
  tenantId: string;
  migrationName: string;
  status: 'success' | 'failed';
  error?: string;
}): Promise<void> {
  await platformPool.query(
    `INSERT INTO tenant_migrations (tenant_id, migration_name, status, error)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (tenant_id, migration_name)
     DO UPDATE SET status = $3, error = $4, applied_at = NOW()`,
    [data.tenantId, data.migrationName, data.status, data.error ?? null]
  );
}

export { platformPool };
```

- [ ] **Step 5: Run tests — all should pass**

```bash
cd backend && npm test -- --testPathPatterns src/__tests__/platform/queries.test.ts
```

Expected: PASS — 8 tests

- [ ] **Step 6: Commit**

```bash
git add backend/src/platform/types.ts backend/src/platform/queries.ts backend/src/__tests__/platform/queries.test.ts
git commit -m "feat(platform): extend types and queries with write operations"
```

---

### Task 2: Platform admin JWT + authenticatePlatformAdmin middleware

**Files:**
- Create: `backend/src/platform/jwt.ts`
- Create: `backend/src/middlewares/platformAuth.ts`
- Test: `backend/src/__tests__/platform/jwt.test.ts`
- Test: `backend/src/__tests__/middlewares/platformAuth.test.ts`

**Interfaces:**
- Consumes: `config.jwt.secret` from `backend/src/config/env.ts`
- Produces:
  - `PlatformAdminJwtPayload { id: string, email: string, role: 'platform_admin' }`
  - `generatePlatformAdminToken(payload: PlatformAdminJwtPayload): string`
  - `verifyPlatformAdminToken(token: string): PlatformAdminJwtPayload` — throws if invalid or role ≠ 'platform_admin'
  - `authenticatePlatformAdmin` Express middleware — injects `req.platformAdmin: PlatformAdminJwtPayload`

- [ ] **Step 1: Write failing tests for platform JWT**

```typescript
// backend/src/__tests__/platform/jwt.test.ts
import {
  generatePlatformAdminToken,
  verifyPlatformAdminToken,
  PlatformAdminJwtPayload,
} from '../../platform/jwt';
import { generateAccessToken } from '../../utils/jwt';

describe('generatePlatformAdminToken + verifyPlatformAdminToken', () => {
  const payload: PlatformAdminJwtPayload = {
    id: 'admin-1',
    email: 'super@platform.com',
    role: 'platform_admin',
  };

  it('round-trips a valid platform admin token', () => {
    const token = generatePlatformAdminToken(payload);
    const decoded = verifyPlatformAdminToken(token);
    expect(decoded).toMatchObject(payload);
  });

  it('throws for a tampered token', () => {
    expect(() => verifyPlatformAdminToken('invalid.token.here')).toThrow();
  });

  it('throws when verifying a regular user JWT as platform admin', () => {
    const userToken = generateAccessToken({ id: 'u1', email: 'user@clinic.com' });
    expect(() => verifyPlatformAdminToken(userToken)).toThrow('Not a platform admin token');
  });

  it('token expires after given duration (structural check)', () => {
    const token = generatePlatformAdminToken(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);
  });
});
```

- [ ] **Step 2: Write failing tests for platformAuth middleware**

```typescript
// backend/src/__tests__/middlewares/platformAuth.test.ts
import { Request, Response, NextFunction } from 'express';
import { authenticatePlatformAdmin } from '../../middlewares/platformAuth';
import { generatePlatformAdminToken } from '../../platform/jwt';
import { generateAccessToken } from '../../utils/jwt';

function makeReq(authorization?: string): Request {
  return { headers: authorization ? { authorization } : {} } as unknown as Request;
}

function makeRes() {
  const json = jest.fn().mockReturnThis();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json } as unknown as Response;
}

describe('authenticatePlatformAdmin', () => {
  const next = jest.fn() as NextFunction;

  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when Authorization header is absent', () => {
    const res = makeRes();
    authenticatePlatformAdmin(makeReq(), res, next);
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for non-Bearer scheme', () => {
    const res = makeRes();
    authenticatePlatformAdmin(makeReq('Basic abc'), res, next);
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(401);
  });

  it('returns 401 for a completely invalid token', () => {
    const res = makeRes();
    authenticatePlatformAdmin(makeReq('Bearer not.valid.token'), res, next);
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(401);
  });

  it('returns 401 when using a regular user token', () => {
    const token = generateAccessToken({ id: 'u1', email: 'user@clinic.com' });
    const res = makeRes();
    authenticatePlatformAdmin(makeReq(`Bearer ${token}`), res, next);
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(401);
  });

  it('injects platformAdmin and calls next for a valid platform admin token', () => {
    const payload = { id: 'a1', email: 'super@platform.com', role: 'platform_admin' as const };
    const token = generatePlatformAdminToken(payload);
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    authenticatePlatformAdmin(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect((req as any).platformAdmin).toMatchObject(payload);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd backend && npm test -- --testPathPatterns "src/__tests__/platform/jwt|src/__tests__/middlewares/platformAuth"
```

Expected: FAIL — modules not found

- [ ] **Step 4: Create `backend/src/platform/jwt.ts`**

```typescript
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface PlatformAdminJwtPayload {
  id: string;
  email: string;
  role: 'platform_admin';
}

export const generatePlatformAdminToken = (payload: PlatformAdminJwtPayload): string =>
  jwt.sign(payload, config.jwt.secret, { expiresIn: '8h' } as jwt.SignOptions);

export const verifyPlatformAdminToken = (token: string): PlatformAdminJwtPayload => {
  const payload = jwt.verify(token, config.jwt.secret) as PlatformAdminJwtPayload;
  if (payload.role !== 'platform_admin') {
    throw new Error('Not a platform admin token');
  }
  return payload;
};
```

- [ ] **Step 5: Create `backend/src/middlewares/platformAuth.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyPlatformAdminToken, PlatformAdminJwtPayload } from '../platform/jwt';

declare global {
  namespace Express {
    interface Request {
      platformAdmin?: PlatformAdminJwtPayload;
    }
  }
}

export const authenticatePlatformAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }
  try {
    req.platformAdmin = verifyPlatformAdminToken(auth.slice(7));
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};
```

- [ ] **Step 6: Run tests — all should pass**

```bash
cd backend && npm test -- --testPathPatterns "src/__tests__/platform/jwt|src/__tests__/middlewares/platformAuth"
```

Expected: PASS — 9 tests

- [ ] **Step 7: Commit**

```bash
git add backend/src/platform/jwt.ts backend/src/middlewares/platformAuth.ts backend/src/__tests__/platform/jwt.test.ts backend/src/__tests__/middlewares/platformAuth.test.ts
git commit -m "feat(platform): platform admin JWT and authenticate middleware"
```

---

### Task 3: Tenant provisioning service

**Files:**
- Create: `backend/src/platform/provision.ts`
- Test: `backend/src/__tests__/platform/provision.test.ts`

**Interfaces:**
- Consumes:
  - `platformPool.connect()` returning a pg `PoolClient`
  - `createTenant(dto)` from `queries.ts`
  - `setTenantActive(id, isActive)` from `queries.ts`
  - `insertTenantMigration(data)` from `queries.ts`
  - `getTenantPrisma(slug)` from `tenant-prisma.ts`
  - `CreateTenantDto`, `ProvisionResult`, `Tenant` from `types.ts`
- Produces:
  - `createTenantSchema(slug: string): Promise<void>` — throws on invalid slug
  - `applyMigrationsToTenant(slug: string, tenantId: string): Promise<number>` — returns count applied
  - `seedTenantRoles(slug: string): Promise<void>`
  - `createTenantAdminUser(slug: string, email: string, password: string, firstName: string, lastName: string): Promise<void>`
  - `provisionTenant(dto: CreateTenantDto): Promise<ProvisionResult>`

- [ ] **Step 1: Write failing tests**

```typescript
// backend/src/__tests__/platform/provision.test.ts
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
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npm test -- --testPathPatterns src/__tests__/platform/provision.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Create `backend/src/platform/provision.ts`**

```typescript
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import platformPool from './db';
import { getTenantPrisma } from './tenant-prisma';
import { createTenant, setTenantActive, insertTenantMigration } from './queries';
import { CreateTenantDto, ProvisionResult } from './types';

const VALID_SLUG = /^[a-z0-9_]{1,63}$/;
const MIGRATIONS_DIR = path.resolve(__dirname, '../../prisma/migrations');

export async function createTenantSchema(slug: string): Promise<void> {
  if (!VALID_SLUG.test(slug)) throw new Error(`Invalid tenant slug: ${slug}`);
  await platformPool.query(`CREATE SCHEMA IF NOT EXISTS "tenant_${slug}"`);
}

export async function applyMigrationsToTenant(slug: string, tenantId: string): Promise<number> {
  const schemaName = `tenant_${slug}`;
  const migrationFolders = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(
      (f) => !f.endsWith('.toml') && fs.existsSync(path.join(MIGRATIONS_DIR, f, 'migration.sql'))
    )
    .sort();

  let applied = 0;
  const client = await platformPool.connect();
  try {
    await client.query(`SET search_path TO "${schemaName}"`);
    for (const folder of migrationFolders) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, folder, 'migration.sql'), 'utf8');
      try {
        await client.query(sql);
        await insertTenantMigration({ tenantId, migrationName: folder, status: 'success' });
        applied++;
      } catch (err) {
        await insertTenantMigration({
          tenantId,
          migrationName: folder,
          status: 'failed',
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    }
  } finally {
    await client.query('SET search_path TO public').catch(() => {});
    client.release();
  }
  return applied;
}

export async function seedTenantRoles(slug: string): Promise<void> {
  const prisma = getTenantPrisma(slug);
  const roles = [
    { name: 'admin', displayName: 'Administrador', description: 'Acceso completo al sistema' },
    { name: 'medical_staff', displayName: 'Personal Médico', description: 'Atiende citas y registra fichas médicas' },
    { name: 'assistant', displayName: 'Personal Asistente', description: 'Apoya en la gestión de citas y pacientes' },
    { name: 'sales', displayName: 'Vendedor', description: 'Gestiona ventas y citas con pacientes' },
  ];
  for (const role of roles) {
    await prisma.role.upsert({ where: { name: role.name }, update: {}, create: role });
  }
}

export async function createTenantAdminUser(
  slug: string,
  email: string,
  password: string,
  firstName: string,
  lastName: string,
): Promise<void> {
  const prisma = getTenantPrisma(slug);
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'admin' } });
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { email, passwordHash, firstName, lastName, roleId: adminRole.id },
  });
}

export async function provisionTenant(dto: CreateTenantDto): Promise<ProvisionResult> {
  if (!VALID_SLUG.test(dto.slug)) throw new Error(`Slug inválido: ${dto.slug}`);

  const tenant = await createTenant(dto);
  try {
    await createTenantSchema(dto.slug);
    const migrationsApplied = await applyMigrationsToTenant(dto.slug, tenant.id);
    await seedTenantRoles(dto.slug);

    let adminCreated = false;
    if (dto.adminEmail && dto.adminPassword) {
      await createTenantAdminUser(
        dto.slug,
        dto.adminEmail,
        dto.adminPassword,
        dto.adminFirstName ?? 'Admin',
        dto.adminLastName ?? dto.name,
      );
      adminCreated = true;
    }

    const activeTenant = await setTenantActive(tenant.id, true);
    return { tenant: activeTenant!, migrationsApplied, adminCreated };
  } catch (err) {
    await setTenantActive(tenant.id, false).catch(() => {});
    throw err;
  }
}
```

- [ ] **Step 4: Run tests — all should pass**

```bash
cd backend && npm test -- --testPathPatterns src/__tests__/platform/provision.test.ts
```

Expected: PASS — 11 tests

- [ ] **Step 5: Commit**

```bash
git add backend/src/platform/provision.ts backend/src/__tests__/platform/provision.test.ts
git commit -m "feat(platform): tenant provisioning service (schema + migrations + seed + admin)"
```

---

### Task 4: Platform auth controller + router wired into index.ts

**Files:**
- Create: `backend/src/controllers/platform/auth.controller.ts`
- Create: `backend/src/routes/platform/index.ts`
- Modify: `backend/src/index.ts`
- Test: `backend/src/__tests__/controllers/platform/auth.controller.test.ts`

**Interfaces:**
- Consumes:
  - `findPlatformAdminByEmail(email)` from `queries.ts`
  - `generatePlatformAdminToken(payload)` from `platform/jwt.ts`
  - `authenticatePlatformAdmin` from `middlewares/platformAuth.ts`
  - `bcrypt.compare`
  - `AppError` from `middlewares/errorHandler.ts`
- Produces:
  - `POST /platform/auth/login` → `{ token, admin: { id, email, firstName, lastName } }` or 400/401
  - `GET /platform/auth/me` (requires `authenticatePlatformAdmin`) → `{ id, email }`

- [ ] **Step 1: Write failing tests**

```typescript
// backend/src/__tests__/controllers/platform/auth.controller.test.ts
import { Request, Response } from 'express';
import { platformLogin, getPlatformAdminMe } from '../../../controllers/platform/auth.controller';
import * as queriesModule from '../../../platform/queries';
import * as platformJwt from '../../../platform/jwt';
import bcrypt from 'bcrypt';

jest.mock('../../../platform/queries');
jest.mock('../../../platform/jwt');
jest.mock('bcrypt');

function makeRes() {
  const json = jest.fn().mockReturnThis();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json } as unknown as Response;
}

function makeReq(body = {}, extra = {}): Request {
  return { body, ...extra } as unknown as Request;
}

describe('platformLogin', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when email or password is missing', async () => {
    const res = makeRes();
    await platformLogin(makeReq({ email: 'a@b.com' }), res);
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(400);
  });

  it('returns 401 when admin not found', async () => {
    (queriesModule.findPlatformAdminByEmail as jest.Mock).mockResolvedValue(null);
    const res = makeRes();
    await platformLogin(makeReq({ email: 'no@one.com', password: 'pass' }), res);
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(401);
  });

  it('returns 401 when password is wrong', async () => {
    (queriesModule.findPlatformAdminByEmail as jest.Mock).mockResolvedValue({
      id: 'a1', email: 'admin@platform.com', passwordHash: 'hash',
      firstName: 'Super', lastName: 'Admin', isActive: true, createdAt: new Date(),
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    const res = makeRes();
    await platformLogin(makeReq({ email: 'admin@platform.com', password: 'wrong' }), res);
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(401);
  });

  it('returns 200 with token and admin info on success', async () => {
    const admin = {
      id: 'a1', email: 'admin@platform.com', passwordHash: 'hash',
      firstName: 'Super', lastName: 'Admin', isActive: true, createdAt: new Date(),
    };
    (queriesModule.findPlatformAdminByEmail as jest.Mock).mockResolvedValue(admin);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (platformJwt.generatePlatformAdminToken as jest.Mock).mockReturnValue('mock-token');
    const res = makeRes();
    await platformLogin(makeReq({ email: admin.email, password: 'correct' }), res);
    expect(res.json as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'mock-token', admin: expect.objectContaining({ id: 'a1' }) })
    );
  });
});

describe('getPlatformAdminMe', () => {
  it('returns platformAdmin id and email from req', async () => {
    const req = makeReq({}, { platformAdmin: { id: 'a1', email: 'super@platform.com', role: 'platform_admin' } });
    const res = makeRes();
    await getPlatformAdminMe(req, res);
    expect(res.json as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a1', email: 'super@platform.com' })
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npm test -- --testPathPatterns src/__tests__/controllers/platform/auth.controller.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Create `backend/src/controllers/platform/auth.controller.ts`**

First create the directory:
```bash
mkdir -p backend/src/controllers/platform
```

```typescript
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { findPlatformAdminByEmail } from '../../platform/queries';
import { generatePlatformAdminToken } from '../../platform/jwt';
import { AppError } from '../../middlewares/errorHandler';

export const platformLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new AppError('Email y contraseña son requeridos', 400);
    }

    const admin = await findPlatformAdminByEmail(email);
    if (!admin) {
      throw new AppError('Credenciales inválidas', 401);
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      throw new AppError('Credenciales inválidas', 401);
    }

    const token = generatePlatformAdminToken({ id: admin.id, email: admin.email, role: 'platform_admin' });
    res.json({
      token,
      admin: { id: admin.id, email: admin.email, firstName: admin.firstName, lastName: admin.lastName },
    });
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Error al iniciar sesión' });
    }
  }
};

export const getPlatformAdminMe = async (req: Request, res: Response): Promise<void> => {
  const { id, email } = req.platformAdmin!;
  res.json({ id, email });
};
```

- [ ] **Step 4: Create `backend/src/routes/platform/index.ts`**

First create directory:
```bash
mkdir -p backend/src/routes/platform
```

```typescript
import { Router } from 'express';
import { platformLogin, getPlatformAdminMe } from '../../controllers/platform/auth.controller';
import { authenticatePlatformAdmin } from '../../middlewares/platformAuth';

const router = Router();

router.post('/auth/login', platformLogin);
router.get('/auth/me', authenticatePlatformAdmin, getPlatformAdminMe);

export default router;
```

- [ ] **Step 5: Register `/platform` router in `backend/src/index.ts`**

Add after the existing imports (after `import routes from './routes';`):

```typescript
import platformRoutes from './routes/platform';
```

Add after `app.use('/api', routes);`:

```typescript
app.use('/platform', platformRoutes);
```

The full relevant section of `index.ts` after edits:

```typescript
import platformRoutes from './routes/platform';
// ... existing code ...
app.use('/api', tenantResolver);
app.use('/api', routes);
app.use('/platform', platformRoutes);
```

- [ ] **Step 6: Run tests — all should pass**

```bash
cd backend && npm test -- --testPathPatterns src/__tests__/controllers/platform/auth.controller.test.ts
```

Expected: PASS — 5 tests

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add backend/src/controllers/platform/auth.controller.ts backend/src/routes/platform/index.ts backend/src/index.ts backend/src/__tests__/controllers/platform/auth.controller.test.ts
git commit -m "feat(platform): platform auth controller and /platform router"
```

---

### Task 5: Tenant management controller + routes

**Files:**
- Create: `backend/src/controllers/platform/tenants.controller.ts`
- Modify: `backend/src/routes/platform/index.ts`
- Test: `backend/src/__tests__/controllers/platform/tenants.controller.test.ts`

**Interfaces:**
- Consumes:
  - `listAllTenants()`, `findTenantBySlug()`, `findTenantById()`, `updateTenant()`, `setTenantActive()`, `listTenantMigrations()` from `queries.ts`
  - `provisionTenant(dto)` from `provision.ts`
  - `authenticatePlatformAdmin` middleware
  - `AppError` from `middlewares/errorHandler.ts`
- Produces (routes registered in platform router):
  - `GET /platform/tenants` → `{ data: Tenant[], total: number }`
  - `GET /platform/tenants/:slug` → `{ data: Tenant }` or 404
  - `POST /platform/tenants` → `{ data: ProvisionResult }` (201) or 400/500
  - `PUT /platform/tenants/:slug` → `{ data: Tenant }` or 404
  - `POST /platform/tenants/:slug/activate` → `{ data: Tenant }` or 404
  - `POST /platform/tenants/:slug/deactivate` → `{ data: Tenant }` or 404
  - `GET /platform/tenants/:slug/migrations` → `{ data: TenantMigration[] }` or 404

- [ ] **Step 1: Write failing tests**

```typescript
// backend/src/__tests__/controllers/platform/tenants.controller.test.ts
import { Request, Response } from 'express';
import {
  listTenants,
  getTenant,
  createTenantHandler,
  updateTenantHandler,
  activateTenant,
  deactivateTenant,
  getTenantMigrations,
} from '../../../controllers/platform/tenants.controller';
import * as queriesModule from '../../../platform/queries';
import * as provisionModule from '../../../platform/provision';

jest.mock('../../../platform/queries');
jest.mock('../../../platform/provision');

const mockTenant = {
  id: 't1', name: 'Clinica A', slug: 'clinica_a', isActive: true,
  contactEmail: null, contactPhone: null, logoUrl: null,
  createdAt: new Date(), updatedAt: new Date(),
};

function makeRes() {
  const json = jest.fn().mockReturnThis();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json } as unknown as Response;
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return { body: {}, params: {}, ...overrides } as unknown as Request;
}

describe('listTenants', () => {
  it('returns all tenants with total count', async () => {
    (queriesModule.listAllTenants as jest.Mock).mockResolvedValue([mockTenant]);
    const res = makeRes();
    await listTenants(makeReq(), res);
    expect(res.json as jest.Mock).toHaveBeenCalledWith({ data: [mockTenant], total: 1 });
  });
});

describe('getTenant', () => {
  it('returns 404 when tenant not found', async () => {
    (queriesModule.findTenantBySlug as jest.Mock).mockResolvedValue(null);
    const res = makeRes();
    await getTenant(makeReq({ params: { slug: 'nope' } }), res);
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(404);
  });

  it('returns tenant when found', async () => {
    (queriesModule.findTenantBySlug as jest.Mock).mockResolvedValue(mockTenant);
    const res = makeRes();
    await getTenant(makeReq({ params: { slug: 'clinica_a' } }), res);
    expect(res.json as jest.Mock).toHaveBeenCalledWith({ data: mockTenant });
  });
});

describe('createTenantHandler', () => {
  it('returns 400 when name or slug is missing', async () => {
    const res = makeRes();
    await createTenantHandler(makeReq({ body: { name: 'X' } }), res);
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(400);
  });

  it('calls provisionTenant and returns 201 with result', async () => {
    const result = { tenant: mockTenant, migrationsApplied: 55, adminCreated: true };
    (provisionModule.provisionTenant as jest.Mock).mockResolvedValue(result);
    const res = makeRes();
    await createTenantHandler(makeReq({ body: { name: 'Clinica A', slug: 'clinica_a', adminEmail: 'a@c.com', adminPassword: 'pass' } }), res);
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(201);
    expect((res.status as jest.Mock)().json).toHaveBeenCalledWith({ data: result });
  });
});

describe('updateTenantHandler', () => {
  it('returns 404 when tenant not found', async () => {
    (queriesModule.findTenantBySlug as jest.Mock).mockResolvedValue(null);
    const res = makeRes();
    await updateTenantHandler(makeReq({ params: { slug: 'nope' }, body: { name: 'New' } }), res);
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(404);
  });

  it('updates and returns tenant', async () => {
    (queriesModule.findTenantBySlug as jest.Mock).mockResolvedValue(mockTenant);
    const updated = { ...mockTenant, name: 'Updated' };
    (queriesModule.updateTenant as jest.Mock).mockResolvedValue(updated);
    const res = makeRes();
    await updateTenantHandler(makeReq({ params: { slug: 'clinica_a' }, body: { name: 'Updated' } }), res);
    expect(res.json as jest.Mock).toHaveBeenCalledWith({ data: updated });
  });
});

describe('activateTenant', () => {
  it('sets tenant active=true', async () => {
    (queriesModule.findTenantBySlug as jest.Mock).mockResolvedValue(mockTenant);
    (queriesModule.setTenantActive as jest.Mock).mockResolvedValue({ ...mockTenant, isActive: true });
    const res = makeRes();
    await activateTenant(makeReq({ params: { slug: 'clinica_a' } }), res);
    expect(queriesModule.setTenantActive).toHaveBeenCalledWith('t1', true);
  });
});

describe('deactivateTenant', () => {
  it('sets tenant active=false', async () => {
    (queriesModule.findTenantBySlug as jest.Mock).mockResolvedValue(mockTenant);
    (queriesModule.setTenantActive as jest.Mock).mockResolvedValue({ ...mockTenant, isActive: false });
    const res = makeRes();
    await deactivateTenant(makeReq({ params: { slug: 'clinica_a' } }), res);
    expect(queriesModule.setTenantActive).toHaveBeenCalledWith('t1', false);
  });
});

describe('getTenantMigrations', () => {
  it('returns 404 when tenant not found', async () => {
    (queriesModule.findTenantBySlug as jest.Mock).mockResolvedValue(null);
    const res = makeRes();
    await getTenantMigrations(makeReq({ params: { slug: 'nope' } }), res);
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(404);
  });

  it('returns migrations for existing tenant', async () => {
    (queriesModule.findTenantBySlug as jest.Mock).mockResolvedValue(mockTenant);
    const migrations = [{ id: 'm1', tenantId: 't1', migrationName: 'init', appliedAt: new Date(), status: 'success', error: null }];
    (queriesModule.listTenantMigrations as jest.Mock).mockResolvedValue(migrations);
    const res = makeRes();
    await getTenantMigrations(makeReq({ params: { slug: 'clinica_a' } }), res);
    expect(res.json as jest.Mock).toHaveBeenCalledWith({ data: migrations });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npm test -- --testPathPatterns src/__tests__/controllers/platform/tenants.controller.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Create `backend/src/controllers/platform/tenants.controller.ts`**

```typescript
import { Request, Response } from 'express';
import {
  listAllTenants,
  findTenantBySlug,
  updateTenant,
  setTenantActive,
  listTenantMigrations,
} from '../../platform/queries';
import { provisionTenant } from '../../platform/provision';
import { AppError } from '../../middlewares/errorHandler';

export const listTenants = async (_req: Request, res: Response): Promise<void> => {
  try {
    const tenants = await listAllTenants();
    res.json({ data: tenants, total: tenants.length });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener clinicas' });
  }
};

export const getTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenant = await findTenantBySlug(req.params.slug);
    if (!tenant) throw new AppError('Clinica no encontrada', 404);
    res.json({ data: tenant });
  } catch (err) {
    if (err instanceof AppError) res.status(err.statusCode).json({ error: err.message });
    else res.status(500).json({ error: 'Error al obtener clinica' });
  }
};

export const createTenantHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, slug, contactEmail, contactPhone, logoUrl, adminEmail, adminPassword, adminFirstName, adminLastName } = req.body;
    if (!name || !slug) throw new AppError('name y slug son requeridos', 400);
    const result = await provisionTenant({ name, slug, contactEmail, contactPhone, logoUrl, adminEmail, adminPassword, adminFirstName, adminLastName });
    res.status(201).json({ data: result });
  } catch (err) {
    if (err instanceof AppError) res.status(err.statusCode).json({ error: err.message });
    else res.status(500).json({ error: 'Error al crear clinica' });
  }
};

export const updateTenantHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenant = await findTenantBySlug(req.params.slug);
    if (!tenant) throw new AppError('Clinica no encontrada', 404);
    const updated = await updateTenant(tenant.id, req.body);
    res.json({ data: updated });
  } catch (err) {
    if (err instanceof AppError) res.status(err.statusCode).json({ error: err.message });
    else res.status(500).json({ error: 'Error al actualizar clinica' });
  }
};

export const activateTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenant = await findTenantBySlug(req.params.slug);
    if (!tenant) throw new AppError('Clinica no encontrada', 404);
    const updated = await setTenantActive(tenant.id, true);
    res.json({ data: updated });
  } catch (err) {
    if (err instanceof AppError) res.status(err.statusCode).json({ error: err.message });
    else res.status(500).json({ error: 'Error al activar clinica' });
  }
};

export const deactivateTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenant = await findTenantBySlug(req.params.slug);
    if (!tenant) throw new AppError('Clinica no encontrada', 404);
    const updated = await setTenantActive(tenant.id, false);
    res.json({ data: updated });
  } catch (err) {
    if (err instanceof AppError) res.status(err.statusCode).json({ error: err.message });
    else res.status(500).json({ error: 'Error al desactivar clinica' });
  }
};

export const getTenantMigrations = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenant = await findTenantBySlug(req.params.slug);
    if (!tenant) throw new AppError('Clinica no encontrada', 404);
    const migrations = await listTenantMigrations(tenant.id);
    res.json({ data: migrations });
  } catch (err) {
    if (err instanceof AppError) res.status(err.statusCode).json({ error: err.message });
    else res.status(500).json({ error: 'Error al obtener migraciones' });
  }
};
```

- [ ] **Step 4: Add tenant routes to `backend/src/routes/platform/index.ts`**

Replace the file content:

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

export default router;
```

- [ ] **Step 5: Run tests — all should pass**

```bash
cd backend && npm test -- --testPathPatterns src/__tests__/controllers/platform/tenants.controller.test.ts
```

Expected: PASS — 11 tests

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 7: Run all tests to check for regressions**

```bash
cd backend && npm test
```

Expected: All existing + new tests pass

- [ ] **Step 8: Commit**

```bash
git add backend/src/controllers/platform/tenants.controller.ts backend/src/routes/platform/index.ts backend/src/__tests__/controllers/platform/tenants.controller.test.ts
git commit -m "feat(platform): tenant management API (CRUD + activate/deactivate + migrations)"
```

---

### Task 6: Data migration script

**Files:**
- Create: `backend/scripts/migrate-to-tenant.ts`
- Test: `backend/src/__tests__/scripts/migrate-to-tenant.test.ts`

**Purpose:** One-time script to migrate existing DermicaPro data from `public` schema tables to `tenant_dermicapro`, then register DermicaPro as the first platform tenant and create the initial platform admin.

**Interfaces:**
- Consumes: `DATABASE_URL`, `PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD`, `DERMICAPRO_CONTACT_EMAIL` env vars
- Provides exported functions for testability: `migrateTable`, `verifyMigration`, `getTableCount`
- Run: `cd backend && ts-node scripts/migrate-to-tenant.ts` (or `--dry-run` for preview)
- Via Docker: `make shell-backend` then `ts-node scripts/migrate-to-tenant.ts`

Tables in FK dependency order (14 total):

| # | Table |
|---|-------|
| 1 | `roles` |
| 2 | `users` |
| 3 | `patients` |
| 4 | `service_templates` |
| 5 | `service_instances` |
| 6 | `appointments` |
| 7 | `appointment_attendees` |
| 8 | `sessions` |
| 9 | `appointment_notes` |
| 10 | `patient_records` |
| 11 | `commissions` |
| 12 | `ordenes_de_pago` |
| 13 | `payments` |
| 14 | `system_settings` |

- [ ] **Step 1: Write failing tests for exported helper functions**

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npm test -- --testPathPatterns src/__tests__/scripts/migrate-to-tenant.test.ts
```

Expected: FAIL — module not found

Note: Jest only picks up files inside `src/__tests__/`. The test imports from `../../scripts/migrate-to-tenant` which resolves to `backend/src/scripts/migrate-to-tenant.ts` relative to the test file. We export the helper functions from the script for testability.

- [ ] **Step 3: Create `backend/src/scripts/migrate-to-tenant.ts`** (importable module with exported helpers)

```typescript
import { Pool, PoolClient } from 'pg';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';

export const TABLES_IN_ORDER = [
  'roles',
  'users',
  'patients',
  'service_templates',
  'service_instances',
  'appointments',
  'appointment_attendees',
  'sessions',
  'appointment_notes',
  'patient_records',
  'commissions',
  'ordenes_de_pago',
  'payments',
  'system_settings',
] as const;

export async function getTableCount(pool: Pool, schema: string, table: string): Promise<number> {
  const result = await pool.query(`SELECT COUNT(*) FROM "${schema}"."${table}"`);
  return parseInt(result.rows[0].count, 10);
}

export function buildMigrationSql(sourceSchema: string, targetSchema: string, table: string): string {
  return `INSERT INTO "${targetSchema}"."${table}" SELECT * FROM "${sourceSchema}"."${table}" ON CONFLICT DO NOTHING`;
}

async function applyPlatformSchema(pool: Pool, dryRun: boolean): Promise<void> {
  console.log('Creating platform schema tables...');
  const sql = fs.readFileSync(
    path.resolve(__dirname, '../../scripts/create-platform-schema.sql'),
    'utf8'
  );
  if (!dryRun) await pool.query(sql);
  else console.log('  [DRY RUN] Would create platform tables');
}

async function createTargetSchema(pool: Pool, targetSchema: string, dryRun: boolean): Promise<void> {
  console.log(`Creating schema ${targetSchema}...`);
  if (!dryRun) await pool.query(`CREATE SCHEMA IF NOT EXISTS "${targetSchema}"`);
  else console.log(`  [DRY RUN] Would create schema ${targetSchema}`);
}

async function applyMigrations(
  pool: Pool,
  targetSchema: string,
  migrationsDir: string,
  dryRun: boolean
): Promise<void> {
  const folders = fs
    .readdirSync(migrationsDir)
    .filter((f) => !f.endsWith('.toml') && fs.existsSync(path.join(migrationsDir, f, 'migration.sql')))
    .sort();

  console.log(`Applying ${folders.length} migrations to ${targetSchema}...`);
  if (dryRun) {
    folders.forEach((f) => console.log(`  [DRY RUN] Would apply: ${f}`));
    return;
  }

  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO "${targetSchema}"`);
    for (const folder of folders) {
      const sql = fs.readFileSync(path.join(migrationsDir, folder, 'migration.sql'), 'utf8');
      await client.query(sql);
      console.log(`  ✓ ${folder}`);
    }
  } finally {
    await client.query('SET search_path TO public').catch(() => {});
    client.release();
  }
}

async function migrateData(
  pool: Pool,
  sourceSchema: string,
  targetSchema: string,
  dryRun: boolean
): Promise<void> {
  console.log('\nMigrating data...');
  for (const table of TABLES_IN_ORDER) {
    const sourceCount = await getTableCount(pool, sourceSchema, table);
    if (dryRun) {
      console.log(`  [DRY RUN] Would migrate ${table}: ${sourceCount} rows`);
      continue;
    }
    await pool.query(buildMigrationSql(sourceSchema, targetSchema, table));
    const targetCount = await getTableCount(pool, targetSchema, table);
    const match = sourceCount === targetCount ? '✓' : '✗';
    console.log(`  ${match} ${table}: ${sourceCount} → ${targetCount}`);
  }
}

async function registerDermicaProTenant(
  pool: Pool,
  contactEmail: string,
  dryRun: boolean
): Promise<void> {
  console.log('\nRegistering DermicaPro tenant...');
  if (dryRun) {
    console.log('  [DRY RUN] Would INSERT INTO public.tenants');
    return;
  }
  await pool.query(
    `INSERT INTO public.tenants (name, slug, is_active, contact_email)
     VALUES ('DermicaPro', 'dermicapro', true, $1)
     ON CONFLICT (slug) DO NOTHING`,
    [contactEmail]
  );
}

async function createPlatformAdmin(
  pool: Pool,
  email: string,
  password: string,
  dryRun: boolean
): Promise<void> {
  console.log(`\nCreating platform admin: ${email}`);
  if (dryRun) {
    console.log('  [DRY RUN] Would INSERT INTO public.platform_admins');
    return;
  }
  const hash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO public.platform_admins (email, password_hash, first_name, last_name)
     VALUES ($1, $2, 'Super', 'Admin')
     ON CONFLICT (email) DO NOTHING`,
    [email, hash]
  );
}

async function verifyMigration(pool: Pool, sourceSchema: string, targetSchema: string): Promise<boolean> {
  console.log('\nVerification:');
  let allMatch = true;
  for (const table of TABLES_IN_ORDER) {
    const [src, dst] = await Promise.all([
      getTableCount(pool, sourceSchema, table),
      getTableCount(pool, targetSchema, table),
    ]);
    const match = src === dst;
    if (!match) allMatch = false;
    console.log(`  ${match ? '✓' : '✗'} ${table}: ${src} → ${dst}`);
  }
  return allMatch;
}

export async function runMigration(options: {
  databaseUrl: string;
  sourceSchema?: string;
  targetSchema?: string;
  contactEmail?: string;
  platformAdminEmail?: string;
  platformAdminPassword?: string;
  dryRun?: boolean;
  migrationsDir?: string;
}): Promise<void> {
  const {
    databaseUrl,
    sourceSchema = 'public',
    targetSchema = 'tenant_dermicapro',
    contactEmail = 'admin@dermicapro.com',
    platformAdminEmail,
    platformAdminPassword,
    dryRun = false,
    migrationsDir = path.resolve(__dirname, '../../prisma/migrations'),
  } = options;

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    if (dryRun) console.log('[DRY RUN] No changes will be made\n');

    await applyPlatformSchema(pool, dryRun);
    await createTargetSchema(pool, targetSchema, dryRun);
    await applyMigrations(pool, targetSchema, migrationsDir, dryRun);
    await migrateData(pool, sourceSchema, targetSchema, dryRun);
    await registerDermicaProTenant(pool, contactEmail, dryRun);

    if (platformAdminEmail && platformAdminPassword) {
      await createPlatformAdmin(pool, platformAdminEmail, platformAdminPassword, dryRun);
    } else {
      console.log('\nSkipping platform admin (set PLATFORM_ADMIN_EMAIL + PLATFORM_ADMIN_PASSWORD to create one)');
    }

    if (!dryRun) {
      const ok = await verifyMigration(pool, sourceSchema, targetSchema);
      if (!ok) {
        console.error('\n✗ Verification failed — some tables have mismatched counts');
        process.exit(1);
      }
    }

    console.log('\n✓ Migration complete!');
  } finally {
    await pool.end();
  }
}
```

- [ ] **Step 4: Create `backend/scripts/migrate-to-tenant.ts`** (entry point that calls runMigration)

```typescript
#!/usr/bin/env ts-node
// Entry point: reads env vars and delegates to the testable module.
import { runMigration } from '../src/scripts/migrate-to-tenant';

const dryRun = process.argv.includes('--dry-run');

runMigration({
  databaseUrl: process.env.DATABASE_URL!,
  contactEmail: process.env.DERMICAPRO_CONTACT_EMAIL,
  platformAdminEmail: process.env.PLATFORM_ADMIN_EMAIL,
  platformAdminPassword: process.env.PLATFORM_ADMIN_PASSWORD,
  dryRun,
}).catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

- [ ] **Step 5: Run tests — all should pass**

```bash
cd backend && npm test -- --testPathPatterns src/__tests__/scripts/migrate-to-tenant.test.ts
```

Expected: PASS — 2 tests

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 7: Run all tests for final regression check**

```bash
cd backend && npm test
```

Expected: All tests pass

- [ ] **Step 8: Commit**

```bash
git add backend/src/scripts/migrate-to-tenant.ts backend/scripts/migrate-to-tenant.ts backend/src/__tests__/scripts/migrate-to-tenant.test.ts
git commit -m "feat(platform): data migration script for public → tenant_dermicapro"
```

---

## Usage after implementation

### Create a new tenant (API)

```bash
# Login as platform admin
curl -X POST http://localhost:5000/platform/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"superadmin@platform.com","password":"<pass>"}'

# Create tenant
curl -X POST http://localhost:5000/platform/tenants \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Clinica Bella",
    "slug": "clinica_bella",
    "adminEmail": "admin@clinicabella.com",
    "adminPassword": "secure123",
    "adminFirstName": "Maria",
    "adminLastName": "Garcia"
  }'
```

### Migrate existing DermicaPro data (one-time)

```bash
# Preview (dry run)
make shell-backend
ts-node scripts/migrate-to-tenant.ts --dry-run

# Actual migration (requires downtime window)
DATABASE_URL=... PLATFORM_ADMIN_EMAIL=super@platform.com PLATFORM_ADMIN_PASSWORD=secure ts-node scripts/migrate-to-tenant.ts
```

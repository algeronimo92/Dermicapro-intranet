# Multi-Tenant Backend Foundation - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the single-tenant DermicaPro backend into a multi-tenant system where each clinic operates in its own PostgreSQL schema, resolved dynamically by subdomain.

**Architecture:** Each tenant gets a PostgreSQL schema (`tenant_<slug>`) containing the existing 14 tables. A `public` schema holds platform tables (Tenant, PlatformAdmin). An Express middleware resolves the subdomain from the Host header, looks up the tenant in the public schema, and injects a tenant-scoped PrismaClient into the request. All controllers and services then use this injected client instead of the current global singleton.

**Tech Stack:** Prisma 7.8 + @prisma/adapter-pg, pg 8.21, Express 5, TypeScript 6, PostgreSQL 14

## Global Constraints

- Prisma schema (`schema.prisma`) for tenant tables stays unchanged -- same 14 models, same enums
- Platform tables (public schema) use raw SQL via `pg` Pool -- NOT a second Prisma schema
- TypeScript strict mode
- All database column names use snake_case via `@map()`
- API responses: `{ data, message, error }` format
- No emojis anywhere
- Existing tests must continue passing

## Subsequent Plans

This plan covers the backend foundation only. Subsequent plans will cover:
- **Plan 2:** Tenant provisioning API + data migration script
- **Plan 3:** Superadmin frontend (React)
- **Plan 4:** Infrastructure (Nginx wildcard, Docker, SSL)

---

### Task 1: Platform Database Layer (public schema tables + typed queries)

**Files:**
- Create: `backend/src/platform/db.ts`
- Create: `backend/src/platform/types.ts`
- Create: `backend/src/platform/queries.ts`
- Create: `backend/scripts/create-platform-schema.sql`
- Test: `backend/src/__tests__/platform/queries.test.ts`

**Interfaces:**
- Consumes: `pg` Pool, `DATABASE_URL` env var
- Produces:
  - `platformPool: Pool` -- pg Pool for public schema queries
  - `Tenant` type: `{ id: string, name: string, slug: string, isActive: boolean, contactEmail: string | null, contactPhone: string | null, logoUrl: string | null, createdAt: Date, updatedAt: Date }`
  - `PlatformAdmin` type: `{ id: string, email: string, passwordHash: string, firstName: string, lastName: string, isActive: boolean, createdAt: Date }`
  - `findTenantBySlug(slug: string): Promise<Tenant | null>`
  - `findPlatformAdminByEmail(email: string): Promise<PlatformAdmin | null>`
  - `listActiveTenants(): Promise<Tenant[]>`

- [ ] **Step 1: Create the platform SQL migration**

Create `backend/scripts/create-platform-schema.sql`:

```sql
-- Platform tables in public schema for SaaS multi-tenant management

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  total_patients INT NOT NULL DEFAULT 0,
  total_appointments_month INT NOT NULL DEFAULT 0,
  active_users INT NOT NULL DEFAULT 0,
  last_access TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id)
);

CREATE TABLE IF NOT EXISTS tenant_migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  migration_name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'success',
  error TEXT,
  UNIQUE(tenant_id, migration_name)
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_is_active ON tenants(is_active);
CREATE INDEX idx_tenant_metrics_tenant_id ON tenant_metrics(tenant_id);
CREATE INDEX idx_tenant_migrations_tenant_id ON tenant_migrations(tenant_id);
```

- [ ] **Step 2: Create platform types**

Create `backend/src/platform/types.ts`:

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
```

- [ ] **Step 3: Create platform database pool**

Create `backend/src/platform/db.ts`:

```typescript
import { Pool } from 'pg';

const platformPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

export default platformPool;
```

- [ ] **Step 4: Create platform queries**

Create `backend/src/platform/queries.ts`:

```typescript
import platformPool from './db';
import { Tenant, PlatformAdmin } from './types';

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

export async function listActiveTenants(): Promise<Tenant[]> {
  const result = await platformPool.query(
    'SELECT * FROM tenants WHERE is_active = true ORDER BY name'
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
```

- [ ] **Step 5: Write tests for platform queries**

Create `backend/src/__tests__/platform/queries.test.ts`:

```typescript
import { findTenantBySlug, findActiveTenantBySlug, listActiveTenants } from '../../platform/queries';
import platformPool from '../../platform/db';

afterAll(async () => {
  await platformPool.end();
});

describe('Platform Queries', () => {
  beforeAll(async () => {
    await platformPool.query(`
      INSERT INTO tenants (id, name, slug, is_active)
      VALUES
        ('t1', 'DermicaPro', 'dermicapro', true),
        ('t2', 'Clinica Inactiva', 'inactiva', false)
      ON CONFLICT (slug) DO NOTHING
    `);
  });

  afterAll(async () => {
    await platformPool.query(`DELETE FROM tenants WHERE id IN ('t1', 't2')`);
  });

  test('findTenantBySlug returns tenant when exists', async () => {
    const tenant = await findTenantBySlug('dermicapro');
    expect(tenant).not.toBeNull();
    expect(tenant!.slug).toBe('dermicapro');
    expect(tenant!.name).toBe('DermicaPro');
  });

  test('findTenantBySlug returns null for unknown slug', async () => {
    const tenant = await findTenantBySlug('nonexistent');
    expect(tenant).toBeNull();
  });

  test('findActiveTenantBySlug excludes inactive tenants', async () => {
    const tenant = await findActiveTenantBySlug('inactiva');
    expect(tenant).toBeNull();
  });

  test('listActiveTenants only returns active tenants', async () => {
    const tenants = await listActiveTenants();
    const slugs = tenants.map(t => t.slug);
    expect(slugs).toContain('dermicapro');
    expect(slugs).not.toContain('inactiva');
  });
});
```

- [ ] **Step 6: Run tests to verify**

Run: `cd backend && npx jest src/__tests__/platform/queries.test.ts --verbose`

Note: These tests require the platform tables to exist in the database. Run the SQL script first:
`make shell-db` then `\i /path/to/create-platform-schema.sql`

- [ ] **Step 7: Commit**

```bash
git add backend/scripts/create-platform-schema.sql backend/src/platform/
git add backend/src/__tests__/platform/
git commit -m "feat(platform): add platform schema tables and typed query layer"
```

---

### Task 2: Tenant PrismaClient Factory

**Files:**
- Create: `backend/src/platform/tenant-prisma.ts`
- Test: `backend/src/__tests__/platform/tenant-prisma.test.ts`

**Interfaces:**
- Consumes: `DATABASE_URL` env var, `PrismaClient` from `@prisma/client`, `Pool` from `pg`, `PrismaPg` from `@prisma/adapter-pg`
- Produces:
  - `getTenantPrisma(slug: string): PrismaClient` -- returns cached PrismaClient configured for `tenant_<slug>` schema
  - `disconnectAllTenants(): Promise<void>` -- cleanup for graceful shutdown
  - `getTenantCacheSize(): number` -- for monitoring

- [ ] **Step 1: Write the failing test**

Create `backend/src/__tests__/platform/tenant-prisma.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/__tests__/platform/tenant-prisma.test.ts --verbose`
Expected: FAIL with "Cannot find module '../../platform/tenant-prisma'"

- [ ] **Step 3: Implement tenant-prisma factory**

Create `backend/src/platform/tenant-prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const tenantClients = new Map<string, { prisma: PrismaClient; pool: Pool }>();

export function getTenantPrisma(slug: string): PrismaClient {
  const cached = tenantClients.get(slug);
  if (cached) return cached.prisma;

  const schemaName = `tenant_${slug}`;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });

  pool.on('connect', (client) => {
    client.query(`SET search_path TO "${schemaName}"`);
  });

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  tenantClients.set(slug, { prisma, pool });
  return prisma;
}

export async function disconnectAllTenants(): Promise<void> {
  const entries = Array.from(tenantClients.values());
  tenantClients.clear();
  await Promise.all(
    entries.map(async ({ prisma, pool }) => {
      await prisma.$disconnect();
      await pool.end();
    })
  );
}

export function disconnectTenant(slug: string): void {
  const cached = tenantClients.get(slug);
  if (cached) {
    cached.prisma.$disconnect();
    cached.pool.end();
    tenantClients.delete(slug);
  }
}

export function getTenantCacheSize(): number {
  return tenantClients.size;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest src/__tests__/platform/tenant-prisma.test.ts --verbose`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/platform/tenant-prisma.ts backend/src/__tests__/platform/tenant-prisma.test.ts
git commit -m "feat(platform): add tenant PrismaClient factory with caching"
```

---

### Task 3: Tenant Resolver Middleware

**Files:**
- Modify: `backend/src/types/express.d.ts`
- Create: `backend/src/middlewares/tenantResolver.ts`
- Test: `backend/src/__tests__/middlewares/tenantResolver.test.ts`

**Interfaces:**
- Consumes: `findActiveTenantBySlug` from `platform/queries`, `getTenantPrisma` from `platform/tenant-prisma`, `Tenant` from `platform/types`
- Produces:
  - `tenantResolver` middleware -- injects `req.tenant: Tenant` and `req.tenantPrisma: PrismaClient` into the request
  - Extended `Express.Request` type with `tenant` and `tenantPrisma` fields

- [ ] **Step 1: Extend Express Request type**

Modify `backend/src/types/express.d.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { Tenant } from '../platform/types';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        roleId?: string | null;
        roleName?: string;
        tenantSlug?: string;
      };
      patient?: {
        id: string;
        email: string | null;
        firstName: string;
        lastName: string;
        dni: string;
        hasPortalAccess: boolean;
      };
      tenant?: Tenant;
      tenantPrisma?: PrismaClient;
    }
  }
}

export {};
```

- [ ] **Step 2: Write the failing test**

Create `backend/src/__tests__/middlewares/tenantResolver.test.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { tenantResolver } from '../../middlewares/tenantResolver';

const mockFindActiveTenantBySlug = jest.fn();
const mockGetTenantPrisma = jest.fn();

jest.mock('../../platform/queries', () => ({
  findActiveTenantBySlug: (...args: any[]) => mockFindActiveTenantBySlug(...args),
}));

jest.mock('../../platform/tenant-prisma', () => ({
  getTenantPrisma: (...args: any[]) => mockGetTenantPrisma(...args),
}));

function createMockReqRes(host: string) {
  const req = {
    hostname: host,
    headers: { host },
  } as unknown as Request;

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;

  const next = jest.fn() as NextFunction;

  return { req, res, next };
}

describe('tenantResolver middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('extracts slug from subdomain and injects tenant + prisma', async () => {
    const fakeTenant = { id: 't1', slug: 'dermicapro', name: 'DermicaPro', isActive: true };
    const fakePrisma = { user: {} };
    mockFindActiveTenantBySlug.mockResolvedValue(fakeTenant);
    mockGetTenantPrisma.mockReturnValue(fakePrisma);

    const { req, res, next } = createMockReqRes('dermicapro.plataforma.com');
    await tenantResolver(req, res, next);

    expect(mockFindActiveTenantBySlug).toHaveBeenCalledWith('dermicapro');
    expect(mockGetTenantPrisma).toHaveBeenCalledWith('dermicapro');
    expect(req.tenant).toEqual(fakeTenant);
    expect(req.tenantPrisma).toBe(fakePrisma);
    expect(next).toHaveBeenCalled();
  });

  test('returns 404 for unknown tenant', async () => {
    mockFindActiveTenantBySlug.mockResolvedValue(null);

    const { req, res, next } = createMockReqRes('unknown.plataforma.com');
    await tenantResolver(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  test('skips resolution for admin subdomain', async () => {
    const { req, res, next } = createMockReqRes('admin.plataforma.com');
    await tenantResolver(req, res, next);

    expect(mockFindActiveTenantBySlug).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  test('handles localhost for development', async () => {
    const fakeTenant = { id: 't1', slug: 'dev', isActive: true };
    const fakePrisma = { user: {} };
    mockFindActiveTenantBySlug.mockResolvedValue(fakeTenant);
    mockGetTenantPrisma.mockReturnValue(fakePrisma);

    const { req, res, next } = createMockReqRes('dev.localhost');
    await tenantResolver(req, res, next);

    expect(mockFindActiveTenantBySlug).toHaveBeenCalledWith('dev');
    expect(next).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && npx jest src/__tests__/middlewares/tenantResolver.test.ts --verbose`
Expected: FAIL with "Cannot find module '../../middlewares/tenantResolver'"

- [ ] **Step 4: Implement tenantResolver middleware**

Create `backend/src/middlewares/tenantResolver.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { findActiveTenantBySlug } from '../platform/queries';
import { getTenantPrisma } from '../platform/tenant-prisma';

const PLATFORM_SUBDOMAINS = ['admin', 'www', 'api'];

function extractSlug(hostname: string): string | null {
  // hostname examples:
  //   dermicapro.plataforma.com  -> dermicapro
  //   dermicapro.localhost       -> dermicapro
  //   localhost                  -> null (no subdomain)
  //   admin.plataforma.com      -> admin (platform subdomain, skip)

  const parts = hostname.split('.');

  // No subdomain: "localhost" or "plataforma.com"
  if (parts.length <= 1) return null;
  // "plataforma.com" (just domain + tld) or "localhost" edge cases
  if (parts.length === 2 && parts[1] !== 'localhost') return null;

  const subdomain = parts[0];

  if (PLATFORM_SUBDOMAINS.includes(subdomain)) return null;

  return subdomain;
}

export async function tenantResolver(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const slug = extractSlug(req.hostname);

    if (!slug) {
      next();
      return;
    }

    const tenant = await findActiveTenantBySlug(slug);

    if (!tenant) {
      res.status(404).json({ error: 'Clinica no encontrada' });
      return;
    }

    req.tenant = tenant;
    req.tenantPrisma = getTenantPrisma(tenant.slug);
    next();
  } catch (error) {
    console.error('Tenant resolution error:', error);
    res.status(500).json({ error: 'Error al resolver clinica' });
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && npx jest src/__tests__/middlewares/tenantResolver.test.ts --verbose`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/types/express.d.ts backend/src/middlewares/tenantResolver.ts
git add backend/src/__tests__/middlewares/tenantResolver.test.ts
git commit -m "feat(middleware): add tenant resolver for subdomain-based multi-tenancy"
```

---

### Task 4: JWT and Auth Middleware Changes

**Files:**
- Modify: `backend/src/utils/jwt.ts`
- Modify: `backend/src/types/auth.types.ts`
- Modify: `backend/src/middlewares/auth.ts`
- Test: `backend/src/__tests__/middlewares/auth.test.ts`

**Interfaces:**
- Consumes: `req.tenant` and `req.tenantPrisma` from Task 3
- Produces:
  - `JwtPayload` extended with `tenantSlug: string`
  - `PatientJwtPayload` extended with `tenantSlug: string`
  - `authenticate` middleware now uses `req.tenantPrisma` and validates tenant slug match

- [ ] **Step 1: Update JwtPayload types**

Modify `backend/src/utils/jwt.ts` -- add `tenantSlug` to `JwtPayload`:

```typescript
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { PatientJwtPayload } from '../types/auth.types';

export interface JwtPayload {
  id: string;
  email: string;
  roleId?: string | null;
  roleName?: string;
  tenantSlug: string;
}

export const generateAccessToken = (payload: JwtPayload | PatientJwtPayload): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
};

export const generateRefreshToken = (payload: JwtPayload | PatientJwtPayload): string => {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  } as jwt.SignOptions);
};

export const verifyAccessToken = (token: string): JwtPayload | PatientJwtPayload => {
  return jwt.verify(token, config.jwt.secret) as JwtPayload | PatientJwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload | PatientJwtPayload => {
  return jwt.verify(token, config.jwt.refreshSecret) as JwtPayload | PatientJwtPayload;
};
```

- [ ] **Step 2: Update PatientJwtPayload**

Modify `backend/src/types/auth.types.ts` -- add `tenantSlug` to `PatientJwtPayload`:

```typescript
export interface PatientJwtPayload {
  id: string;
  email: string | null;
  type: 'patient';
  tenantSlug: string;
}

// ... rest of the file stays the same
```

- [ ] **Step 3: Update express.d.ts user type**

This was already done in Task 3 -- `tenantSlug` is included in `req.user`.

- [ ] **Step 4: Update auth middleware to use tenant prisma and validate tenant slug**

Modify `backend/src/middlewares/auth.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { PatientJwtPayload } from '../types/auth.types';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token no proporcionado' });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    // Validate tenant slug matches the subdomain
    if (req.tenant && decoded.tenantSlug !== req.tenant.slug) {
      res.status(403).json({ error: 'Token no pertenece a esta clinica' });
      return;
    }

    if ('type' in decoded && (decoded as PatientJwtPayload).type === 'patient') {
      res.status(401).json({ error: 'Los tokens de paciente no estan permitidos en este endpoint' });
      return;
    }

    const payload = decoded as JwtPayload;

    // Use tenant-scoped prisma instead of global
    const prisma = req.tenantPrisma;
    if (!prisma) {
      res.status(500).json({ error: 'Contexto de clinica no disponible' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true },
    });

    if (!user) {
      res.status(401).json({ error: 'Token invalido o expirado' });
      return;
    }

    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token invalido o expirado' });
  }
};

export const authorize = (...roleNames: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }

    if (!req.user.roleName || !roleNames.includes(req.user.roleName)) {
      res.status(403).json({ error: 'Permisos insuficientes' });
      return;
    }

    next();
  };
};
```

- [ ] **Step 5: Write auth middleware tests**

Create `backend/src/__tests__/middlewares/auth.test.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middlewares/auth';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env';

function createMockReqRes(token?: string, tenantSlug?: string) {
  const req = {
    headers: {
      authorization: token ? `Bearer ${token}` : undefined,
    },
    tenant: tenantSlug ? { slug: tenantSlug } : undefined,
    tenantPrisma: {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }),
      },
    },
  } as unknown as Request;

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;

  const next = jest.fn() as NextFunction;
  return { req, res, next };
}

function generateTestToken(payload: any): string {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: '1h' });
}

describe('authenticate middleware', () => {
  test('rejects request without token', async () => {
    const { req, res, next } = createMockReqRes();
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('accepts valid token with matching tenant', async () => {
    const token = generateTestToken({
      id: 'user-1',
      email: 'test@test.com',
      tenantSlug: 'dermicapro',
    });
    const { req, res, next } = createMockReqRes(token, 'dermicapro');
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user?.tenantSlug).toBe('dermicapro');
  });

  test('rejects token with mismatched tenant slug', async () => {
    const token = generateTestToken({
      id: 'user-1',
      email: 'test@test.com',
      tenantSlug: 'dermicapro',
    });
    const { req, res, next } = createMockReqRes(token, 'otra_clinica');
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Run tests**

Run: `cd backend && npx jest src/__tests__/middlewares/auth.test.ts --verbose`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/src/utils/jwt.ts backend/src/types/auth.types.ts
git add backend/src/middlewares/auth.ts backend/src/__tests__/middlewares/auth.test.ts
git commit -m "feat(auth): add tenantSlug to JWT and validate against subdomain"
```

---

### Task 5: Auth Controller -- Add tenantSlug to Token Generation

**Files:**
- Modify: `backend/src/controllers/auth.controller.ts`
- Modify: `backend/src/controllers/patientAuth.controller.ts`

**Interfaces:**
- Consumes: `req.tenant.slug`, `req.tenantPrisma` from middleware chain
- Produces: JWT tokens now include `tenantSlug` field

- [ ] **Step 1: Update auth.controller.ts**

In `backend/src/controllers/auth.controller.ts`, apply these changes:

1. Remove `import prisma from '../config/database';`
2. In every function body, add `const prisma = req.tenantPrisma!;` as the first line inside `try {}`
3. In `login`, `loginWithPin`, and `refresh`, add `tenantSlug: req.tenant!.slug` to the JWT payload

Login payload change (line ~32-37):

```typescript
    const payload = {
      id: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role?.name,
      tenantSlug: req.tenant!.slug,
    };
```

Refresh payload change (line ~84-89):

```typescript
    const payload = {
      id: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role?.name,
      tenantSlug: req.tenant!.slug,
    };
```

loginWithPin payload change (line ~289-294):

```typescript
    const payload = {
      id: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role?.name,
      tenantSlug: req.tenant!.slug,
    };
```

Every function that uses `prisma` directly must use `req.tenantPrisma!` instead. The full list of functions in this file:
- `login` -- uses prisma
- `refresh` -- uses prisma
- `me` -- uses prisma
- `logout` -- no prisma usage
- `updateMe` -- uses prisma
- `changePassword` -- uses prisma
- `loginWithPin` -- uses prisma
- `setPin` -- uses prisma
- `removePin` -- uses prisma

For each function, the change is:
```typescript
export const functionName = async (req: Request, res: Response): Promise<void> => {
  try {
    const prisma = req.tenantPrisma!;
    // ... rest of function unchanged
```

- [ ] **Step 2: Update patientAuth.controller.ts**

Same pattern -- remove global prisma import, add `const prisma = req.tenantPrisma!;` in each function, and add `tenantSlug: req.tenant!.slug` to patient JWT payloads.

Patient login payload:
```typescript
    const payload: PatientJwtPayload = {
      id: patient.id,
      email: patient.email,
      type: 'patient',
      tenantSlug: req.tenant!.slug,
    };
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/auth.controller.ts backend/src/controllers/patientAuth.controller.ts
git commit -m "feat(auth): inject tenant prisma and tenantSlug in auth controllers"
```

---

### Task 6: Migrate All Controllers from Global Prisma to req.tenantPrisma

**Files:**
- Modify: `backend/src/controllers/patients.controller.ts`
- Modify: `backend/src/controllers/appointments.controller.ts`
- Modify: `backend/src/controllers/services.controller.ts`
- Modify: `backend/src/controllers/users.controller.ts`
- Modify: `backend/src/controllers/commissions.controller.ts`
- Modify: `backend/src/controllers/payments.controller.ts`
- Modify: `backend/src/controllers/paymentOrders.controller.ts`
- Modify: `backend/src/controllers/roles.controller.ts`
- Modify: `backend/src/controllers/settings.controller.ts`

**Interfaces:**
- Consumes: `req.tenantPrisma` from middleware chain
- Produces: All controllers now use tenant-scoped database access

The change is mechanical and identical for all 9 controllers:

1. Remove `import prisma from '../config/database';`
2. In each exported async function, add `const prisma = req.tenantPrisma!;` as the first line inside `try {}`

- [ ] **Step 1: Update patients.controller.ts**

Remove line 2: `import prisma from '../config/database';`

In each function (`getAllPatients`, `getPatientById`, `createPatient`, `updatePatient`, `deletePatient`, etc.), add at the top of the try block:

```typescript
export const getAllPatients = async (req: Request, res: Response): Promise<void> => {
  try {
    const prisma = req.tenantPrisma!;
    // ... rest unchanged
```

- [ ] **Step 2: Update appointments.controller.ts**

Same pattern. Remove global import. Add `const prisma = req.tenantPrisma!;` in each function.

- [ ] **Step 3: Update services.controller.ts**

Same pattern.

- [ ] **Step 4: Update users.controller.ts**

Same pattern.

- [ ] **Step 5: Update commissions.controller.ts**

Same pattern.

- [ ] **Step 6: Update payments.controller.ts**

Same pattern.

- [ ] **Step 7: Update paymentOrders.controller.ts**

Same pattern.

- [ ] **Step 8: Update roles.controller.ts**

Same pattern.

- [ ] **Step 9: Update settings.controller.ts**

Same pattern.

- [ ] **Step 10: Verify TypeScript compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors (all controllers now reference `req.tenantPrisma` which is typed in `express.d.ts`)

- [ ] **Step 11: Commit**

```bash
git add backend/src/controllers/
git commit -m "refactor(controllers): migrate all controllers from global prisma to req.tenantPrisma"
```

---

### Task 7: Migrate Services from Global Prisma

**Files:**
- Modify: `backend/src/services/dashboard/dashboard.service.ts`
- Modify: `backend/src/services/analytics/analytics.service.ts`
- Modify: `backend/src/services/paymentOrder.service.ts`
- Modify: `backend/src/controllers/dashboard.controller.ts`
- Modify: `backend/src/controllers/analytics.controller.ts`

**Interfaces:**
- Consumes: `req.tenantPrisma` from controllers
- Produces: Services accept PrismaClient per-request instead of using singletons

The dashboard and analytics services already accept PrismaClient via constructor. The problem is they export singletons. The fix is to remove the singletons and create instances per-request in the controllers.

- [ ] **Step 1: Remove singleton from dashboard.service.ts**

In `backend/src/services/dashboard/dashboard.service.ts`:

1. Remove `import prisma from '../../config/database';`
2. Remove the last line: `export const dashboardService = new DashboardService(prisma);`
3. The class stays as-is since the constructor already accepts PrismaClient

The file should end with just the class export (no singleton):
```typescript
// Remove this line at the bottom:
// export const dashboardService = new DashboardService(prisma);
```

- [ ] **Step 2: Update dashboard.controller.ts to create per-request instance**

In `backend/src/controllers/dashboard.controller.ts`:

```typescript
import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard/dashboard.service';
import { AppError } from '../middlewares/errorHandler';

export const getDashboard = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Usuario no autenticado', 401);
    }

    const { period } = req.query;
    const roleName = req.user.roleName;
    const userId = req.user.id;

    if (!roleName) {
      throw new AppError('Usuario sin rol asignado', 403);
    }

    const dashboardService = new DashboardService(req.tenantPrisma!);
    const data = await dashboardService.getDashboard(roleName, userId, {
      period,
    });

    res.json({ data });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error al obtener dashboard:', error);
      res.status(500).json({ error: 'Error al obtener datos del dashboard' });
    }
  }
};

export const getAvailableRoles = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const dashboardService = new DashboardService(req.tenantPrisma!);
    const roles = dashboardService.getAvailableRoles();
    res.json({ roles });
  } catch (error) {
    console.error('Error al obtener roles disponibles:', error);
    res.status(500).json({ error: 'Error al obtener roles disponibles' });
  }
};
```

- [ ] **Step 3: Remove singleton from analytics.service.ts**

In `backend/src/services/analytics/analytics.service.ts`:

1. Remove `import prismaClient from '../../config/database';`
2. Change constructor to accept PrismaClient as parameter:
```typescript
import { PrismaClient } from '@prisma/client';

class AnalyticsService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ... all methods stay the same
}

// Remove: export const analyticsService = new AnalyticsService();
export { AnalyticsService };
```

- [ ] **Step 4: Update analytics.controller.ts to create per-request instance**

In `backend/src/controllers/analytics.controller.ts`, change the import and create instance per request:

```typescript
import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics/analytics.service';
import { AnalyticsFilters } from '../types/analytics.types';

export const getExecutiveSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const analyticsService = new AnalyticsService(req.tenantPrisma!);
    const filters: AnalyticsFilters = {
      period: (req.query.period as any) || 'month',
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
    };
    const data = await analyticsService.getExecutiveSummary(filters);
    res.json(data);
  } catch (error: any) {
    console.error('Executive summary error:', error);
    res.status(500).json({ error: error.message || 'Error al obtener resumen ejecutivo' });
  }
};

// Apply same pattern to ALL other analytics functions:
// getFinancialAnalytics, getOperationsAnalytics, getSalesAnalytics,
// getCustomerAnalytics, getServiceAnalytics
// Each one creates: const analyticsService = new AnalyticsService(req.tenantPrisma!);
```

- [ ] **Step 5: Update paymentOrder.service.ts**

In `backend/src/services/paymentOrder.service.ts`:

1. Remove `import prisma from '../config/database';`
2. Change class to accept PrismaClient via constructor:

```typescript
import { PrismaClient, PaymentOrder, PaymentOrderStatus, ServiceInstance } from '@prisma/client';
import { AppError } from '../middlewares/errorHandler';

// ... interfaces stay the same

export class PaymentOrderService {
  constructor(private prisma: PrismaClient) {}

  // ... all methods use this.prisma instead of the global
```

Then in `paymentOrders.controller.ts`, wherever `PaymentOrderService` is instantiated, pass `req.tenantPrisma!`:

```typescript
const service = new PaymentOrderService(req.tenantPrisma!);
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add backend/src/services/ backend/src/controllers/dashboard.controller.ts
git add backend/src/controllers/analytics.controller.ts
git commit -m "refactor(services): remove singletons, inject tenant prisma per-request"
```

---

### Task 8: Wire Middleware into Express App

**Files:**
- Modify: `backend/src/index.ts`
- Modify: `backend/src/config/database.ts`

**Interfaces:**
- Consumes: `tenantResolver` from `middlewares/tenantResolver`, `disconnectAllTenants` from `platform/tenant-prisma`, `platformPool` from `platform/db`
- Produces: Express app with tenant resolution in the middleware chain

- [ ] **Step 1: Update database.ts to keep it as fallback**

The global prisma singleton in `backend/src/config/database.ts` is no longer imported by any controller. Keep it minimal for backward compatibility during transition (e.g., health checks):

```typescript
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg(process.env.DATABASE_URL!);

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

export default prisma;
```

- [ ] **Step 2: Update index.ts**

Modify `backend/src/index.ts` to add tenant resolver middleware and update shutdown handlers:

```typescript
import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { generalLimiter } from './middlewares/rateLimiter';
import { requestLogger } from './middlewares/requestLogger';
import { tenantResolver } from './middlewares/tenantResolver';
import { disconnectAllTenants } from './platform/tenant-prisma';
import platformPool from './platform/db';
import prisma from './config/database';
import fs from 'fs';
import path from 'path';

const app = express();

app.set('trust proxy', 1);

app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

if (config.env === 'production') {
  app.use('/api', generalLimiter);
}

if (!fs.existsSync(config.upload.directory)) {
  fs.mkdirSync(config.upload.directory, { recursive: true });
}

app.use('/uploads', express.static(path.resolve(config.upload.directory)));

app.get('/health', async (_req, res) => {
  try {
    await platformPool.query('SELECT 1');
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Tenant resolution BEFORE API routes
app.use('/api', tenantResolver);
app.use('/api', routes);

app.use(errorHandler);

const startServer = async () => {
  try {
    // Verify platform database connection
    await platformPool.query('SELECT 1');
    console.log('Platform database connected successfully');

    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

const shutdown = async () => {
  console.log('Shutting down...');
  await disconnectAllTenants();
  await platformPool.end();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startServer();
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add backend/src/index.ts backend/src/config/database.ts
git commit -m "feat(app): wire tenant resolver middleware into Express pipeline"
```

---

### Task 9: Upload Isolation by Tenant

**Files:**
- Modify: `backend/src/index.ts` (static file serving)
- Grep for Multer usage and modify upload paths

**Interfaces:**
- Consumes: `req.tenant.slug`
- Produces: Files saved to `uploads/<tenant_slug>/` instead of `uploads/`

- [ ] **Step 1: Find all Multer configurations**

Run: `grep -rn "multer\|upload" backend/src/middlewares/ backend/src/routes/ --include="*.ts" | grep -i "multer\|destination\|storage"`

Identify where the upload destination is configured. Update the Multer storage configuration to use `req.tenant.slug` in the destination path:

```typescript
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const tenantSlug = (req as any).tenant?.slug || 'default';
    const dir = path.join(config.upload.directory, tenantSlug);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
```

- [ ] **Step 2: Update static file serving in index.ts**

The current `app.use('/uploads', express.static(...))` serves all files. With tenant isolation, serve per-tenant:

```typescript
// Serve tenant-specific uploads
app.use('/uploads', (req, res, next) => {
  if (req.tenant) {
    const tenantDir = path.resolve(config.upload.directory, req.tenant.slug);
    express.static(tenantDir)(req, res, next);
  } else {
    express.static(path.resolve(config.upload.directory))(req, res, next);
  }
});
```

Note: The `/uploads` route also needs tenant resolution. Move it after the tenant resolver or apply tenant resolver to it.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add backend/src/
git commit -m "feat(uploads): isolate file uploads by tenant directory"
```

---

### Task 10: Development Environment Setup

**Files:**
- Create: `backend/scripts/setup-dev-tenant.sql`
- Modify: `docker-compose.yml` (add init script)

**Interfaces:**
- Consumes: Existing Prisma schema, platform SQL script
- Produces: A working development environment with platform tables and a `tenant_dev` schema for local testing

- [ ] **Step 1: Create dev tenant setup script**

Create `backend/scripts/setup-dev-tenant.sql`:

```sql
-- Run platform schema creation first
-- Then create a development tenant schema

-- Create dev tenant schema
CREATE SCHEMA IF NOT EXISTS tenant_dev;

-- Register dev tenant in platform tables
INSERT INTO tenants (name, slug, is_active, contact_email)
VALUES ('Development Clinic', 'dev', true, 'dev@localhost')
ON CONFLICT (slug) DO NOTHING;

-- Copy all tables from public to tenant_dev
-- This will be done by Prisma migrate pointing to the tenant schema
```

- [ ] **Step 2: Document local development workflow**

For local development with subdomains, developers need to add entries to their hosts file:

```
# Add to C:\Windows\System32\drivers\etc\hosts (Windows)
# or /etc/hosts (Mac/Linux)
127.0.0.1 dev.localhost
127.0.0.1 admin.localhost
```

Then the frontend Vite dev server and backend both accept `dev.localhost:5173` and `dev.localhost:5000`.

- [ ] **Step 3: Update env.example with new variables**

Add to `backend/.env.example`:

```env
# Platform domain (used for tenant resolution)
PLATFORM_DOMAIN=localhost
```

- [ ] **Step 4: Commit**

```bash
git add backend/scripts/setup-dev-tenant.sql
git commit -m "feat(dev): add development tenant setup script and docs"
```

---

### Task 11: Verify End-to-End

**Files:** No new files

**Interfaces:**
- Consumes: All previous tasks
- Produces: Verification that the multi-tenant middleware chain works

- [ ] **Step 1: Run TypeScript compilation**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run all existing tests**

Run: `cd backend && npx jest --verbose`
Expected: Existing tests pass (some may need mock updates for `req.tenantPrisma`)

- [ ] **Step 3: Fix any failing tests**

Tests that create mock requests will need `tenantPrisma` added to the mock. Common fix:

```typescript
const req = {
  // existing mock fields...
  tenantPrisma: prisma, // add this
  tenant: { slug: 'test' }, // add this
} as unknown as Request;
```

- [ ] **Step 4: Manual smoke test**

1. Start services: `make up`
2. Apply platform schema: `make shell-db` then run `create-platform-schema.sql`
3. Create dev tenant schema and apply Prisma migrations to it
4. Test health endpoint: `curl http://localhost:5000/health`
5. Test tenant resolution: `curl -H "Host: dev.localhost" http://localhost:5000/api/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"admin@dermicapro.com","password":"admin123"}'`

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "test: fix existing tests for multi-tenant middleware chain"
```

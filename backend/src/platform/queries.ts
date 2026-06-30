import platformPool from './db';
import { Tenant, PlatformAdmin, TenantMigration, TenantMetrics, CreateTenantDto, UpdateTenantDto } from './types';

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

export { platformPool };

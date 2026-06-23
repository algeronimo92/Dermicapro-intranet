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

export { platformPool };

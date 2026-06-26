import { Pool } from 'pg';

const platformPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

export async function ensurePlatformTables(): Promise<void> {
  await platformPool.query(`
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

    CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
    CREATE INDEX IF NOT EXISTS idx_tenants_is_active ON tenants(is_active);
    CREATE INDEX IF NOT EXISTS idx_tenant_metrics_tenant_id ON tenant_metrics(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_tenant_migrations_tenant_id ON tenant_migrations(tenant_id);
  `);
}

export default platformPool;

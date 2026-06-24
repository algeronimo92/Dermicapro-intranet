-- Development tenant setup
-- Run AFTER create-platform-schema.sql
--
-- Usage from psql:
--   \i backend/scripts/create-platform-schema.sql
--   \i backend/scripts/setup-dev-tenant.sql
--
-- Usage from make:
--   make shell-db
--   \i /scripts/setup-dev-tenant.sql

-- Create the development tenant schema
CREATE SCHEMA IF NOT EXISTS tenant_dev;

-- Register the dev tenant in the platform table
INSERT INTO tenants (name, slug, is_active, contact_email)
VALUES ('Development Clinic', 'dev', true, 'dev@localhost')
ON CONFLICT (slug) DO NOTHING;

-- Prisma migrations must then be applied against the tenant schema.
-- From inside the backend container:
--   DATABASE_URL=postgresql://...?schema=tenant_dev npx prisma migrate deploy

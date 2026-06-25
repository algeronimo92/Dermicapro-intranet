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
    if (migrationFolders.length > 0) {
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
    }
  } finally {
    try { await client.query('SET search_path TO public'); } catch { /* ignore */ }
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

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

async function buildEnumAwareMigrationSql(
  pool: Pool,
  sourceSchema: string,
  targetSchema: string,
  table: string,
): Promise<string> {
  const colResult = await pool.query(
    `SELECT column_name, data_type, udt_name
     FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2
     ORDER BY ordinal_position`,
    [targetSchema, table],
  );

  const insertCols = colResult.rows.map((r: any) => `"${r.column_name}"`);
  const selectCols = colResult.rows.map((row: any) => {
    if (row.data_type === 'USER-DEFINED') {
      return `"${row.column_name}"::text::"${targetSchema}"."${row.udt_name}"`;
    }
    return `"${row.column_name}"`;
  });

  return `INSERT INTO "${targetSchema}"."${table}" (${insertCols.join(', ')}) SELECT ${selectCols.join(', ')} FROM "${sourceSchema}"."${table}" ON CONFLICT DO NOTHING`;
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

  const client: PoolClient = await pool.connect();
  try {
    await client.query(`SET search_path TO "${targetSchema}"`);
    for (const folder of folders) {
      const sql = fs.readFileSync(path.join(migrationsDir, folder, 'migration.sql'), 'utf8');
      await client.query(sql);
      console.log(`  v ${folder}`);
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
  if (!dryRun) {
    await pool.query('SET session_replication_role = replica');
  }
  try {
    for (const table of TABLES_IN_ORDER) {
      const sourceCount = await getTableCount(pool, sourceSchema, table);
      if (dryRun) {
        console.log(`  [DRY RUN] Would migrate ${table}: ${sourceCount} rows`);
        continue;
      }
      const sql = await buildEnumAwareMigrationSql(pool, sourceSchema, targetSchema, table);
      await pool.query(sql);
      const targetCount = await getTableCount(pool, targetSchema, table);
      const match = sourceCount === targetCount ? 'OK' : 'MISMATCH';
      console.log(`  ${match} ${table}: ${sourceCount} -> ${targetCount}`);
    }
  } finally {
    if (!dryRun) {
      await pool.query('SET session_replication_role = DEFAULT');
    }
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
    console.log(`  ${match ? 'OK' : 'MISMATCH'} ${table}: ${src} -> ${dst}`);
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
        console.error('\nVerification failed -- some tables have mismatched counts');
        process.exit(1);
      }
    }

    console.log('\nMigration complete!');
  } finally {
    await pool.end();
  }
}

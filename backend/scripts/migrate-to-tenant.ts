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

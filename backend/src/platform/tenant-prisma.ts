import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const VALID_SLUG = /^[a-z0-9_]{1,63}$/;

const tenantClients = new Map<string, { prisma: PrismaClient; pool: Pool }>();

export function getTenantPrisma(slug: string): PrismaClient {
  if (!VALID_SLUG.test(slug)) {
    throw new Error(`Invalid tenant slug: ${slug}`);
  }

  const cached = tenantClients.get(slug);
  if (cached) return cached.prisma;

  const schemaName = `tenant_${slug}`;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });

  pool.on('connect', (client) => {
    client.query(`SET search_path TO "${schemaName}"`).catch((err) => {
      console.error(`[tenant-prisma] Failed to set search_path for ${schemaName}:`, err);
      client.release(true); // destroy connection on search_path failure
    });
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

export async function disconnectTenant(slug: string): Promise<void> {
  const cached = tenantClients.get(slug);
  if (cached) {
    tenantClients.delete(slug);
    await cached.prisma.$disconnect();
    await cached.pool.end();
  }
}

export function getTenantCacheSize(): number {
  return tenantClients.size;
}

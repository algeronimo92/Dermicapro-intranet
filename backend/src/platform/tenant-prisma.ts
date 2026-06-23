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

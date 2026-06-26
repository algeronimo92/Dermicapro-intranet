import { getTenantPrisma } from './tenant-prisma';
import { listActiveTenants, upsertTenantMetrics } from './queries';

export async function aggregateTenantMetrics(slug: string, tenantId: string): Promise<void> {
  const prisma = getTenantPrisma(slug);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalPatients, totalAppointmentsMonth, activeUsers, lastUser] = await Promise.all([
    prisma.patient.count(),
    prisma.appointment.count({
      where: { scheduledDate: { gte: startOfMonth } },
    }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    }),
  ]);

  await upsertTenantMetrics(tenantId, {
    totalPatients,
    totalAppointmentsMonth,
    activeUsers,
    lastAccess: lastUser?.updatedAt ?? null,
  });
}

export async function refreshAllTenantsMetrics(): Promise<void> {
  const tenants = await listActiveTenants();
  await Promise.allSettled(
    tenants.map((t) => aggregateTenantMetrics(t.slug, t.id)),
  );
}

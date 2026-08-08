import client from 'prom-client';
import prisma from '../config/database';
import { registry } from '../middlewares/metrics';

/**
 * Métricas de negocio: fallas silenciosas que no aparecen en CPU ni en logs de
 * error, pero que cuestan dinero o dejan datos inconsistentes.
 *
 * Se refrescan en segundo plano en vez de calcularse durante el scrape: una
 * consulta lenta bloqueando /metrics haría que Prometheus perdiera TODAS las
 * métricas del backend por timeout, no sólo estas.
 */

const STUCK_APPOINTMENT_HOURS = Number(process.env.METRICS_STUCK_APPOINTMENT_HOURS || 6);
const AGED_COMMISSION_DAYS = Number(process.env.METRICS_AGED_COMMISSION_DAYS || 7);
const OVER_PACKAGE_WINDOW_HOURS = Number(process.env.METRICS_OVER_PACKAGE_WINDOW_HOURS || 24);
const REFRESH_INTERVAL_MS = Number(process.env.METRICS_BUSINESS_INTERVAL_MS || 60_000);

const appointmentsStuck = new client.Gauge({
  name: 'dermicapro_appointments_stuck_in_progress',
  help: `Citas en estado in_progress cuya hora programada pasó hace más de ${STUCK_APPOINTMENT_HOURS}h`,
  registers: [registry],
});

const commissionsPendingAged = new client.Gauge({
  name: 'dermicapro_commissions_pending_aged',
  help: `Comisiones en estado pending creadas hace más de ${AGED_COMMISSION_DAYS} días`,
  registers: [registry],
});

// No hay constraint en la base que cubra esto: un CHECK de Postgres no puede
// cruzar dos tablas. (completed_sessions <= total_sessions sí está garantizado
// por service_instances_completed_sessions_lte_total_check, así que medirlo
// sería una métrica que nunca puede dispararse.)
//
// Acumulado histórico: sólo baja si alguien corrige o borra la sesión. Sirve
// para el dashboard, NO para alertar.
const sessionsOverPackage = new client.Gauge({
  name: 'dermicapro_sessions_over_package',
  help: 'Sesiones activas cuyo sessionNumber supera el totalSessions de su paquete (histórico)',
  registers: [registry],
});

// La misma condición, pero sólo sobre sesiones creadas en la última ventana.
// Sobre esta se alerta: una violación vieja y ya revisada sale sola de la
// ventana, mientras que el acumulado dejaría la alerta encendida para siempre
// y acabaría enseñando al equipo a ignorar los avisos.
const sessionsOverPackageRecent = new client.Gauge({
  name: 'dermicapro_sessions_over_package_recent',
  help: `Sesiones creadas en las últimas ${OVER_PACKAGE_WINDOW_HOURS}h cuyo sessionNumber supera el totalSessions de su paquete`,
  registers: [registry],
});

// Sin esto, si el refresco muere las gauges se quedan congeladas en su último
// valor y parecería que todo está bien. La alerta se apoya en este timestamp.
const lastSuccess = new client.Gauge({
  name: 'dermicapro_business_metrics_last_success_timestamp_seconds',
  help: 'Momento del último refresco correcto de las métricas de negocio',
  registers: [registry],
});

const refreshErrors = new client.Counter({
  name: 'dermicapro_business_metrics_refresh_errors_total',
  help: 'Fallos al refrescar las métricas de negocio',
  registers: [registry],
});

// Las dos cifras salen del mismo escaneo: son la misma condición con distinto
// filtro de fecha, y dividirlo en dos queries sólo duplicaría el join.
async function countSessionsOverPackage(
  recentSince: Date
): Promise<{ total: number; recent: number }> {
  const rows = await prisma.$queryRaw<Array<{ total: number; recent: number }>>`
    SELECT
      COUNT(*)::int AS total,
      (COUNT(*) FILTER (WHERE s.created_at >= ${recentSince}))::int AS recent
    FROM sessions s
    JOIN service_instances si ON si.id = s.service_instance_id
    WHERE s.deleted_at IS NULL
      AND s.session_number IS NOT NULL
      AND s.session_number > si.total_sessions
  `;
  return { total: rows[0]?.total ?? 0, recent: rows[0]?.recent ?? 0 };
}

export async function refreshBusinessMetrics(): Promise<void> {
  const now = Date.now();
  const stuckBefore = new Date(now - STUCK_APPOINTMENT_HOURS * 60 * 60 * 1000);
  const agedBefore = new Date(now - AGED_COMMISSION_DAYS * 24 * 60 * 60 * 1000);
  const overPackageSince = new Date(now - OVER_PACKAGE_WINDOW_HOURS * 60 * 60 * 1000);

  const [stuck, aged, overSessions] = await Promise.all([
    prisma.appointment.count({
      where: { status: 'in_progress', scheduledDate: { lt: stuckBefore } },
    }),
    prisma.commission.count({
      where: { status: 'pending', createdAt: { lt: agedBefore } },
    }),
    countSessionsOverPackage(overPackageSince),
  ]);

  appointmentsStuck.set(stuck);
  commissionsPendingAged.set(aged);
  sessionsOverPackage.set(overSessions.total);
  sessionsOverPackageRecent.set(overSessions.recent);
  lastSuccess.set(Date.now() / 1000);
}

let timer: NodeJS.Timeout | null = null;

export function startBusinessMetrics(): void {
  if (timer) return;

  const tick = async () => {
    try {
      await refreshBusinessMetrics();
    } catch (error) {
      // Un fallo aquí no debe tumbar el servidor: el contador lo deja
      // registrado y la alerta salta por el timestamp obsoleto.
      refreshErrors.inc();
      console.error(
        JSON.stringify({
          event: 'business_metrics_error',
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  };

  void tick();
  timer = setInterval(tick, REFRESH_INTERVAL_MS);
  // No debe mantener vivo el proceso al apagarse.
  timer.unref();
}

export function stopBusinessMetrics(): void {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

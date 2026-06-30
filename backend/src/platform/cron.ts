import platformPool from './db';
import { refreshAllTenantsMetrics } from './metrics';

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
// Stable numeric key for pg_try_advisory_lock — must be unique per cron job.
const METRICS_LOCK_ID = 7483920;
let cronTimer: NodeJS.Timeout | null = null;

// Uses a Postgres advisory lock so that only one backend instance runs the
// metrics aggregation when multiple replicas are deployed.
async function runWithAdvisoryLock(): Promise<void> {
  const { rows } = await platformPool.query(
    'SELECT pg_try_advisory_lock($1) AS acquired',
    [METRICS_LOCK_ID],
  );
  if (!rows[0].acquired) return;
  try {
    await refreshAllTenantsMetrics();
  } finally {
    await platformPool.query('SELECT pg_advisory_unlock($1)', [METRICS_LOCK_ID]).catch(() => {});
  }
}

export function startMetricsCron(): void {
  if (cronTimer) return;
  // Initial run fires immediately without the lock — each replica runs it once
  // at startup (idempotent upserts make this safe).
  refreshAllTenantsMetrics().catch((err) =>
    console.error('[metrics-cron] Initial run failed:', err),
  );
  cronTimer = setInterval(() => {
    runWithAdvisoryLock().catch((err) =>
      console.error('[metrics-cron] Scheduled run failed:', err),
    );
  }, SIX_HOURS_MS);
}

export function stopMetricsCron(): void {
  if (cronTimer) {
    clearInterval(cronTimer);
    cronTimer = null;
  }
}

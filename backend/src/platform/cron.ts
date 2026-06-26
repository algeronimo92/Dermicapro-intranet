import { refreshAllTenantsMetrics } from './metrics';

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
let cronTimer: NodeJS.Timeout | null = null;

export function startMetricsCron(): void {
  if (cronTimer) return;
  refreshAllTenantsMetrics().catch((err) =>
    console.error('[metrics-cron] Initial run failed:', err),
  );
  cronTimer = setInterval(() => {
    refreshAllTenantsMetrics().catch((err) =>
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

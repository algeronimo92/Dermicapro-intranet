/**
 * Subscription Billing Cron Job
 *
 * Procesa los cobros recurrentes de suscripciones con Niubiz.
 * Debe ejecutarse diariamente (recomendado: 6:00 AM hora local).
 *
 * Uso:
 * - Ejecutar directamente: npx ts-node src/jobs/subscription-billing.job.ts
 * - Desde cron: 0 6 * * * cd /path/to/backend && npx ts-node src/jobs/subscription-billing.job.ts
 * - Con Docker: configurar en docker-compose o como container separado
 */

import { niubizSubscriptionService } from '../services/niubiz-subscription.service';

async function main() {
  console.log('========================================');
  console.log('[Billing Job] Starting subscription billing process');
  console.log(`[Billing Job] Time: ${new Date().toISOString()}`);
  console.log('========================================');

  try {
    const results = await niubizSubscriptionService.processRecurringPayments();

    console.log('========================================');
    console.log('[Billing Job] Completed');
    console.log(`  Processed: ${results.processed}`);
    console.log(`  Successful: ${results.successful}`);
    console.log(`  Failed: ${results.failed}`);
    console.log(`  Cancelled: ${results.cancelled}`);
    console.log('========================================');

    // Exit with error code if there were failures
    if (results.failed > 0) {
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('[Billing Job] Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { main as runBillingJob };

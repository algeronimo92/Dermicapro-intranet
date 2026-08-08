import client from 'prom-client';
import { pgPool } from '../config/database';
import { registry } from './metrics';

/**
 * Estado del pool de conexiones a PostgreSQL.
 *
 * Aquí sí se usa collect(): leer estas propiedades es acceder a tres contadores
 * en memoria, sin ida y vuelta a la base, así que no hay riesgo de que el
 * scrape se quede colgado. Las métricas de negocio, que sí consultan la base,
 * se refrescan aparte por eso mismo.
 *
 * postgres-exporter ve las conexiones desde el lado del servidor; esto las ve
 * desde el lado de la aplicación. La diferencia importa: `waiting` sólo se ve
 * aquí, y es la señal de que el pool se quedó corto.
 */

new client.Gauge({
  name: 'dermicapro_pg_pool_total',
  help: 'Conexiones abiertas por el pool (en uso más inactivas)',
  registers: [registry],
  collect() {
    this.set(pgPool.totalCount);
  },
});

new client.Gauge({
  name: 'dermicapro_pg_pool_idle',
  help: 'Conexiones del pool inactivas y listas para usarse',
  registers: [registry],
  collect() {
    this.set(pgPool.idleCount);
  },
});

new client.Gauge({
  name: 'dermicapro_pg_pool_waiting',
  help: 'Peticiones esperando una conexión libre del pool',
  registers: [registry],
  collect() {
    this.set(pgPool.waitingCount);
  },
});

// Sólo existe para que el módulo se importe por su efecto de registro sin que
// un import "suelto" parezca un error a quien lea index.ts.
export function registerDbMetrics(): void {
  // Las gauges se registran al cargar el módulo.
}

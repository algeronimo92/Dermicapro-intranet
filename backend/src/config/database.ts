import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool, PoolClient } from 'pg';
import { currentDbRole, dbRoleContext, INSUFFICIENT_PRIVILEGE, markPrivilegeDenied } from './dbRoleContext';

// Rol que tiene cada conexión física en este momento (null = dueño). Evita
// repetir SET ROLE cuando la conexión ya está en el rol correcto.
const connectionRole = new WeakMap<PoolClient, string | null>();
const instrumented = new WeakSet<PoolClient>();

// Nombre de rol seguro para interpolar: sólo vienen de dbRoleFor(), pero se
// valida igual porque SET ROLE no admite parámetros.
const SAFE_ROLE = /^(app_[a-z_]+|emp_[0-9a-f]{32})$/;

/**
 * Pool que, al entregar cada conexión, la pone en el rol de PostgreSQL de la
 * petición actual (ver config/dbRoleContext.ts).
 *
 * PrismaPg usa este pool de dos formas: pool.query() para consultas sueltas y
 * pool.connect() para transacciones. pool.query() también pasa por connect(),
 * así que sobrescribir connect() cubre ambos caminos.
 *
 * Falla cerrado: si SET ROLE falla, la conexión se descarta y la consulta no
 * se ejecuta, en vez de seguir corriendo como el dueño de la base.
 */
class RoleAwarePool extends Pool {
  connect(): Promise<PoolClient>;
  connect(callback: (err: Error | undefined, client: PoolClient | undefined, done: (release?: unknown) => void) => void): void;
  connect(callback?: (err: Error | undefined, client: PoolClient | undefined, done: (release?: unknown) => void) => void): Promise<PoolClient> | void {
    const role = currentDbRole();
    const promise = this.connectWithRole(role);
    if (!callback) return promise;
    promise.then(
      (client) => callback(undefined, client, (release?: unknown) => client.release(release as Error | boolean | undefined)),
      (err: Error) => callback(err, undefined, () => undefined),
    );
  }

  private async connectWithRole(role: string | null): Promise<PoolClient> {
    const client = await super.connect();
    this.instrument(client);
    if (connectionRole.get(client) === role && connectionRole.has(client)) return client;
    try {
      if (role !== null && !SAFE_ROLE.test(role)) throw new Error(`Rol de base de datos inválido: ${role}`);
      await client.query(role ? `SET ROLE ${role}` : 'RESET ROLE');
      connectionRole.set(client, role);
      return client;
    } catch (error) {
      client.release(true); // destruye la conexión: su rol quedó en estado desconocido
      throw error;
    }
  }

  // Anota en el contexto de la petición qué tabla rechazó PostgreSQL, para que
  // la respuesta diga "tu rol no tiene privilegios sobre X" en vez de un 500.
  private instrument(client: PoolClient): void {
    if (instrumented.has(client)) return;
    instrumented.add(client);
    const original = client.query.bind(client) as (...args: unknown[]) => unknown;
    (client as unknown as { query: (...args: unknown[]) => unknown }).query = (...args: unknown[]) => {
      const store = dbRoleContext.getStore();
      // pool.query() llama a client.query() con callback; las transacciones, sin él.
      const last = args[args.length - 1];
      if (typeof last === 'function') {
        args[args.length - 1] = (error: { code?: string; message?: string } | null, ...rest: unknown[]) => {
          if (error?.code === INSUFFICIENT_PRIVILEGE) markPrivilegeDenied(store, error.message ?? '');
          return (last as (...a: unknown[]) => unknown)(error, ...rest);
        };
        return original(...args);
      }
      const result = original(...args);
      if (result && typeof (result as Promise<unknown>).catch === 'function') {
        (result as Promise<unknown>).catch((error: { code?: string; message?: string }) => {
          if (error?.code === INSUFFICIENT_PRIVILEGE) markPrivilegeDenied(store, error.message ?? '');
        });
      }
      return result;
    };
  }
}

// El pool se crea aquí en vez de dejar que lo haga PrismaPg a partir del string
// de conexión, para poder exponer su estado como métricas (ver
// middlewares/db-metrics.ts) y para aplicar el rol de base de datos por
// petición. Con un driver adapter el pool es de `pg`, no del motor de Prisma.
export const pgPool = new RoleAwarePool({ connectionString: process.env.DATABASE_URL });

// Sin este handler, un error en una conexión inactiva emite un evento 'error'
// sin escuchadores y tumba el proceso entero.
pgPool.on('error', (error) => {
  console.error(
    JSON.stringify({
      event: 'pg_pool_error',
      error: error instanceof Error ? error.message : String(error),
    })
  );
});

const adapter = new PrismaPg(pgPool);

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;

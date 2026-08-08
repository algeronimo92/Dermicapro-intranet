import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// El pool se crea aquí en vez de dejar que lo haga PrismaPg a partir del string
// de conexión, para poder exponer su estado como métricas (ver
// middlewares/db-metrics.ts). Con un driver adapter el pool es de `pg`, no del
// motor de Prisma, así que las métricas internas de Prisma no lo verían.
export const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });

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

import { PrismaClient } from '@prisma/client';
import { COLLECTED_PAYMENTS } from '../collectedPayments';
import { AdminDashboardStrategy } from '../dashboard/strategies/admin.strategy';
import { FinancialAnalyticsStrategy } from '../analytics/strategies/FinancialAnalyticsStrategy';
import { ExecutiveSummaryStrategy } from '../analytics/strategies/ExecutiveSummaryStrategy';

// Prisma falso: cualquier modelo/método responde vacío y se registran los
// filtros de cada consulta a `payment` para comprobar qué se suma como ingreso.
function fakePrisma() {
  const paymentCalls: { method: string; where: unknown }[] = [];
  const empty = (method: string) => {
    if (method === 'aggregate') return { _sum: {}, _count: 0 };
    if (method === 'count') return 0;
    return [];
  };
  const model = (name: string) => new Proxy({}, {
    get: (_t, method: string) => async (args?: { where?: unknown }) => {
      if (name === 'payment') paymentCalls.push({ method, where: args?.where });
      return empty(method);
    },
  });
  const prisma = new Proxy({}, { get: (_t, name: string) => model(name) }) as unknown as PrismaClient;
  return { prisma, paymentCalls };
}

const range = { gte: new Date('2026-11-01'), lte: new Date('2026-11-30') };

function expectOnlyCollected(calls: { where: unknown }[]) {
  expect(calls.length).toBeGreaterThan(0);
  for (const { where } of calls) expect(where).toMatchObject(COLLECTED_PAYMENTS);
}

describe('ingresos cobrados', () => {
  it('excluye pagos anulados y pagos con saldo a favor', () => {
    expect(COLLECTED_PAYMENTS).toEqual({ voidedAt: null, paymentMethod: { not: 'account_credit' } });
  });

  it('dashboard de administrador: ingresos por método', async () => {
    const { prisma, paymentCalls } = fakePrisma();
    await (new AdminDashboardStrategy(prisma) as unknown as { getFinancials(r: typeof range): Promise<unknown> })
      .getFinancials(range);
    expectOnlyCollected(paymentCalls);
  });

  it('analítica financiera: total, por método, tendencia y flujo de caja', async () => {
    const { prisma, paymentCalls } = fakePrisma();
    await (new FinancialAnalyticsStrategy(prisma) as unknown as { fetchData(r: typeof range): Promise<unknown> })
      .fetchData(range);
    expectOnlyCollected(paymentCalls);
  });

  it('resumen ejecutivo: ingresos y tendencia', async () => {
    const { prisma, paymentCalls } = fakePrisma();
    await (new ExecutiveSummaryStrategy(prisma) as unknown as { fetchData(r: typeof range): Promise<unknown> })
      .fetchData(range);
    expectOnlyCollected(paymentCalls);
  });
});

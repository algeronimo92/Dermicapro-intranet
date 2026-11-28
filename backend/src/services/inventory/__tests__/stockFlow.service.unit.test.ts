import prisma from '../../../config/database';
import { clinicDay, getStockFlow, parseFlowRange } from '../stockFlow.service';

jest.mock('../../../config/database', () => ({ __esModule: true, default: {
  product: { findUnique: jest.fn(), aggregate: jest.fn(), findMany: jest.fn() },
  inventoryMovement: { findMany: jest.fn(), groupBy: jest.fn() },
} }));

const db = prisma as unknown as {
  product: Record<string, jest.Mock>;
  inventoryMovement: Record<string, jest.Mock>;
};

beforeEach(() => jest.resetAllMocks());

describe('clinicDay', () => {
  it('usa la hora de la clínica (UTC-5)', () => {
    expect(clinicDay(new Date('2026-11-21T03:00:00.000Z'))).toBe('2026-11-20');
    expect(clinicDay(new Date('2026-11-21T06:00:00.000Z'))).toBe('2026-11-21');
  });
});

describe('parseFlowRange', () => {
  it('por defecto son los últimos 30 días', () => {
    expect(parseFlowRange(undefined, undefined, new Date('2026-11-28T15:00:00.000Z')))
      .toEqual({ from: '2026-10-30', to: '2026-11-28' });
  });

  it.each([
    ['fecha inválida', '2026-02-30', '2026-03-01'],
    ['desde después de hasta', '2026-11-20', '2026-11-10'],
    ['más de un año', '2025-01-01', '2026-11-28'],
  ])('rechaza %s', (_label, from, to) => {
    expect(() => parseFlowRange(from, to)).toThrow(expect.objectContaining({ statusCode: 400 }));
  });
});

describe('getStockFlow', () => {
  it('reconstruye el stock al cierre de cada día desde el stock actual', async () => {
    db.product.findUnique.mockResolvedValue({ stock: 9 });
    db.inventoryMovement.findMany.mockResolvedValue([
      { productId: 'p1', type: 'in', reason: 'purchase', quantity: 5, createdAt: new Date('2026-11-20T15:00:00Z') },
      { productId: 'p1', type: 'out', reason: 'supplier_return', quantity: 2, createdAt: new Date('2026-11-22T15:00:00Z') },
    ]);
    // Después del rango entró 1 más: el cierre del 22 fue 8.
    db.inventoryMovement.groupBy.mockResolvedValue([{ type: 'in', _sum: { quantity: 1 } }]);

    const flow = await getStockFlow({ from: '2026-11-20', to: '2026-11-22' }, 'p1');

    expect(flow.days).toEqual([
      { date: '2026-11-20', in: 5, out: 0, stock: 10 },
      { date: '2026-11-21', in: 0, out: 0, stock: 10 },
      { date: '2026-11-22', in: 0, out: 2, stock: 8 },
    ]);
    expect(flow).toMatchObject({ startStock: 5, endStock: 8, totalIn: 5, totalOut: 2, topProducts: [] });
    expect(flow.byReason).toEqual([
      { reason: 'purchase', type: 'in', quantity: 5 },
      { reason: 'supplier_return', type: 'out', quantity: 2 },
    ]);
  });

  it('sin producto suma todo el inventario y lista los más movidos', async () => {
    db.product.aggregate.mockResolvedValue({ _sum: { stock: 30 } });
    db.inventoryMovement.findMany.mockResolvedValue([
      { productId: 'p1', type: 'in', reason: 'purchase', quantity: 4, createdAt: new Date('2026-11-20T15:00:00Z') },
      { productId: 'p2', type: 'in', reason: 'purchase', quantity: 10, createdAt: new Date('2026-11-20T16:00:00Z') },
    ]);
    db.inventoryMovement.groupBy.mockResolvedValue([]);
    db.product.findMany.mockResolvedValue([{ id: 'p1', name: 'Sérum' }, { id: 'p2', name: 'Crema' }]);

    const flow = await getStockFlow({ from: '2026-11-20', to: '2026-11-20' }, null);

    expect(flow.endStock).toBe(30);
    expect(flow.startStock).toBe(16);
    expect(flow.topProducts.map(p => p.name)).toEqual(['Crema', 'Sérum']);
  });

  it('producto inexistente: 404', async () => {
    db.product.findUnique.mockResolvedValue(null);
    await expect(getStockFlow({ from: '2026-11-20', to: '2026-11-20' }, 'x')).rejects.toMatchObject({ statusCode: 404 });
  });
});

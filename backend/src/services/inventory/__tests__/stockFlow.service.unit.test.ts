import prisma from '../../../config/database';
import { clinicDay, getDailyStock, parseFlowRange } from '../stockFlow.service';

jest.mock('../../../config/database', () => ({ __esModule: true, default: {
  product: { findUnique: jest.fn() },
  inventoryMovement: { findMany: jest.fn() },
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

describe('getDailyStock', () => {
  it('reconstruye el stock al cierre de cada día desde el stock actual', async () => {
    db.product.findUnique.mockResolvedValue({ stock: 9 });
    db.inventoryMovement.findMany.mockResolvedValue([
      { type: 'in', quantity: 5, createdAt: new Date('2026-11-20T15:00:00Z') },
      { type: 'out', quantity: 2, createdAt: new Date('2026-11-22T15:00:00Z') },
      // Después del rango entró 1 más: el cierre del 22 fue 8.
      { type: 'in', quantity: 1, createdAt: new Date('2026-11-25T15:00:00Z') },
    ]);

    const result = await getDailyStock({ from: '2026-11-20', to: '2026-11-22' }, 'p1');

    expect(result.days).toEqual([
      { date: '2026-11-20', stock: 10 },
      { date: '2026-11-21', stock: 10 },
      { date: '2026-11-22', stock: 8 },
    ]);
  });

  it('producto inexistente: 404', async () => {
    db.product.findUnique.mockResolvedValue(null);
    await expect(getDailyStock({ from: '2026-11-20', to: '2026-11-20' }, 'x')).rejects.toMatchObject({ statusCode: 404 });
  });
});

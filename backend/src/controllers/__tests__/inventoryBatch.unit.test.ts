import { Request, Response } from 'express';
import prisma from '../../config/database';
import { createMovementsBatch, parseBatchRows } from '../inventory.controller';

jest.mock('../../config/database', () => ({ __esModule: true, default: {
  product: { updateMany: jest.fn(), findUnique: jest.fn() },
  inventoryMovement: { create: jest.fn() },
  $transaction: jest.fn(),
} }));

const updateMany = prisma.product.updateMany as jest.Mock;
const findUnique = prisma.product.findUnique as jest.Mock;
const createMovement = prisma.inventoryMovement.create as jest.Mock;
const transaction = prisma.$transaction as jest.Mock;

function request(rows: unknown) {
  return { body: { rows }, user: { id: 'user-1' } } as unknown as Request;
}
function response() {
  const res = { json: jest.fn(), status: jest.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response & { json: jest.Mock; status: jest.Mock };
}

beforeEach(() => {
  jest.resetAllMocks();
  transaction.mockImplementation((callback: (tx: typeof prisma) => unknown) => callback(prisma));
  updateMany.mockResolvedValue({ count: 1 });
});

describe('parseBatchRows', () => {
  const row = { productId: 'p1', expectedStock: 5, out: { quantity: 2, reason: 'sale' } };

  it('acepta una fila válida e ignora cantidades en 0', () => {
    expect(parseBatchRows({ rows: [{ ...row, in: { quantity: 0, reason: 'purchase' } }] })).toEqual([
      { productId: 'p1', expectedStock: 5, in: null, out: { quantity: 2, reason: 'sale' }, note: null },
    ]);
  });

  it.each([
    ['sin filas', { rows: [] }],
    ['producto repetido', { rows: [row, row] }],
    ['fila sin entrada ni salida', { rows: [{ productId: 'p1', expectedStock: 5 }] }],
    ['salida mayor al stock', { rows: [{ ...row, out: { quantity: 6, reason: 'sale' } }] }],
    ['motivo de salida inválido', { rows: [{ ...row, out: { quantity: 1, reason: 'purchase' } }] }],
    ['motivo inicial no permitido', { rows: [{ ...row, in: { quantity: 1, reason: 'initial' } }] }],
    ['cantidad decimal', { rows: [{ ...row, out: { quantity: 1.5, reason: 'sale' } }] }],
    ['stock esperado negativo', { rows: [{ ...row, expectedStock: -1 }] }],
  ])('rechaza %s', (_label, body) => {
    expect(() => parseBatchRows(body)).toThrow(expect.objectContaining({ statusCode: 400 }));
  });

  it('permite que la entrada cubra una salida mayor al stock esperado', () => {
    const [parsed] = parseBatchRows({ rows: [{
      productId: 'p1', expectedStock: 1, in: { quantity: 3, reason: 'purchase' }, out: { quantity: 4, reason: 'sale' },
    }] });
    expect(parsed.in?.quantity).toBe(3);
    expect(parsed.out?.quantity).toBe(4);
  });
});

describe('createMovementsBatch', () => {
  it('aplica el stock final de forma condicional y registra entrada y salida en orden', async () => {
    const res = response();
    await createMovementsBatch(request([{
      productId: 'p1', expectedStock: 5, in: { quantity: 3, reason: 'purchase' }, out: { quantity: 2, reason: 'sale' }, note: 'cierre',
    }]), res);

    expect(updateMany).toHaveBeenCalledWith({ where: { id: 'p1', stock: 5 }, data: { stock: 6 } });
    const [entry, exit] = createMovement.mock.calls.map(([args]) => args.data);
    expect(entry).toMatchObject({ type: 'in', reason: 'purchase', quantity: 3, stockAfter: 8, note: 'cierre', createdById: 'user-1' });
    expect(exit).toMatchObject({ type: 'out', reason: 'sale', quantity: 2, stockAfter: 6 });
    expect(exit.createdAt.getTime()).toBeGreaterThan(entry.createdAt.getTime());
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].data).toEqual({ movements: 2, stocks: [{ productId: 'p1', stock: 6 }] });
  });

  it('responde 409 con el producto y su stock actual si cambió mientras tanto', async () => {
    updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    findUnique.mockResolvedValue({ name: 'Voluma', stock: 1 });
    const res = response();
    await createMovementsBatch(request([
      { productId: 'p1', expectedStock: 5, out: { quantity: 1, reason: 'sale' } },
      { productId: 'p2', expectedStock: 2, out: { quantity: 1, reason: 'sale' } },
    ]), res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ productId: 'p2', currentStock: 1 }));
  });

  it('no toca la base si alguna fila es inválida', async () => {
    const res = response();
    await createMovementsBatch(request([{ productId: 'p1', expectedStock: 0, out: { quantity: 1, reason: 'sale' } }]), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(transaction).not.toHaveBeenCalled();
  });
});

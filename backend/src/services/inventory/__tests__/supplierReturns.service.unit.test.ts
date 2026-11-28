import { Prisma } from '@prisma/client';
import { parseReturnItems, parseReturnReason, registerSupplierReturn } from '../supplierReturns.service';

function fakeTx() {
  return {
    product: { findMany: jest.fn(), updateMany: jest.fn(), findUniqueOrThrow: jest.fn() },
    supplierReturn: { create: jest.fn() },
    supplierReturnItem: { create: jest.fn() },
    inventoryMovement: { create: jest.fn() },
  };
}
type FakeTx = ReturnType<typeof fakeTx>;
const asTx = (tx: FakeTx) => tx as unknown as Prisma.TransactionClient;

const base = {
  returnDate: new Date('2026-11-20T00:00:00.000Z'),
  reason: 'expired' as const,
  supplierName: 'Distribuidora',
  note: null,
  items: [{ productId: 'p1', quantity: 2 }],
};

describe('parseReturnReason', () => {
  it('acepta un motivo conocido', () => {
    expect(parseReturnReason('damaged')).toBe('damaged');
  });

  it.each([undefined, '', 'sale', 3])('rechaza %p', value => {
    expect(() => parseReturnReason(value)).toThrow(expect.objectContaining({ statusCode: 400 }));
  });
});

describe('parseReturnItems', () => {
  it('exige al menos un producto', () => {
    expect(() => parseReturnItems([])).toThrow(/al menos un producto a devolver/);
  });

  it('normaliza las cantidades', () => {
    expect(parseReturnItems([{ productId: 'p1', quantity: '2' }])).toEqual([{ productId: 'p1', quantity: 2 }]);
  });
});

describe('registerSupplierReturn', () => {
  let tx: FakeTx;
  beforeEach(() => {
    tx = fakeTx();
    tx.product.findMany.mockResolvedValue([{ id: 'p1', name: 'Sérum' }]);
    tx.product.updateMany.mockResolvedValue({ count: 1 });
    tx.product.findUniqueOrThrow.mockResolvedValue({ stock: 3 });
    tx.supplierReturn.create.mockResolvedValue({ id: 'r1' });
    tx.supplierReturnItem.create.mockResolvedValue({ id: 'ri1' });
  });

  it('resta el stock y deja una salida ligada a la línea', async () => {
    await registerSupplierReturn(asTx(tx), base, 'user-1');
    expect(tx.product.updateMany).toHaveBeenCalledWith({
      where: { id: 'p1', stock: { gte: 2 } },
      data: { stock: { decrement: 2 } },
    });
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'out', reason: 'supplier_return', quantity: 2, stockAfter: 3, supplierReturnItemId: 'ri1',
      }),
    });
  });

  it('no deja el stock en negativo', async () => {
    tx.product.updateMany.mockResolvedValue({ count: 0 });
    await expect(registerSupplierReturn(asTx(tx), base, 'user-1'))
      .rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining('Sérum') });
    expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
  });

  it('con motivo «Otro» exige la nota', async () => {
    await expect(registerSupplierReturn(asTx(tx), { ...base, reason: 'other' }, 'user-1'))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(tx.supplierReturn.create).not.toHaveBeenCalled();
  });

  it('rechaza productos que ya no existen', async () => {
    tx.product.findMany.mockResolvedValue([]);
    await expect(registerSupplierReturn(asTx(tx), base, 'user-1')).rejects.toMatchObject({ statusCode: 404 });
  });
});

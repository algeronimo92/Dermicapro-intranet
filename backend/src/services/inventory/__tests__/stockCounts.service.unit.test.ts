import { Prisma } from '@prisma/client';
import { parseCountItems, registerStockCount, StockCountConflictError } from '../stockCounts.service';

function fakeTx() {
  return {
    $queryRaw: jest.fn(),
    product: { update: jest.fn() },
    stockCount: { create: jest.fn() },
    stockCountItem: { create: jest.fn() },
    inventoryMovement: { create: jest.fn() },
  };
}
type FakeTx = ReturnType<typeof fakeTx>;
const asTx = (tx: FakeTx) => tx as unknown as Prisma.TransactionClient;

describe('parseCountItems', () => {
  it('normaliza los números', () => {
    expect(parseCountItems([{ productId: 'p1', expectedStock: '4', countedStock: '3' }]))
      .toEqual([{ productId: 'p1', expectedStock: 4, countedStock: 3 }]);
  });

  it.each([
    ['vacío', []],
    ['repetido', [{ productId: 'p1', expectedStock: 1, countedStock: 1 }, { productId: 'p1', expectedStock: 1, countedStock: 2 }]],
    ['contado negativo', [{ productId: 'p1', expectedStock: 1, countedStock: -1 }]],
    ['contado decimal', [{ productId: 'p1', expectedStock: 1, countedStock: 1.5 }]],
    ['sin lo esperado', [{ productId: 'p1', countedStock: 1 }]],
  ])('rechaza %s', (_label, value) => {
    expect(() => parseCountItems(value)).toThrow(expect.objectContaining({ statusCode: 400 }));
  });
});

describe('registerStockCount', () => {
  let tx: FakeTx;
  beforeEach(() => {
    tx = fakeTx();
    tx.$queryRaw.mockResolvedValue([
      { id: 'p1', name: 'Sérum', stock: 4 },
      { id: 'p2', name: 'Crema', stock: 2 },
      { id: 'p3', name: 'Gel', stock: 5 },
    ]);
    tx.stockCount.create.mockResolvedValue({ id: 'c1' });
    tx.stockCountItem.create.mockImplementation(({ data }) => Promise.resolve({ id: `line-${data.productId}` }));
  });

  const items = [
    { productId: 'p1', expectedStock: 4, countedStock: 3 }, // falta 1
    { productId: 'p2', expectedStock: 2, countedStock: 5 }, // sobran 3
    { productId: 'p3', expectedStock: 5, countedStock: 5 }, // cuadra
  ];

  it('ajusta sólo los productos con diferencia, ligados a su línea', async () => {
    await registerStockCount(asTx(tx), { note: null, items }, 'user-1');
    expect(tx.stockCountItem.create).toHaveBeenCalledTimes(3);
    expect(tx.product.update).toHaveBeenCalledTimes(2);
    expect(tx.product.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { stock: 3 } });
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ productId: 'p1', type: 'out', reason: 'adjustment', quantity: 1, stockAfter: 3, stockCountItemId: 'line-p1' }),
    });
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ productId: 'p2', type: 'in', reason: 'adjustment', quantity: 3, stockAfter: 5, stockCountItemId: 'line-p2' }),
    });
  });

  it('si el stock cambió mientras se contaba no guarda nada y devuelve los conflictos', async () => {
    tx.$queryRaw.mockResolvedValue([
      { id: 'p1', name: 'Sérum', stock: 6 },
      { id: 'p2', name: 'Crema', stock: 2 },
      { id: 'p3', name: 'Gel', stock: 5 },
    ]);
    const error = await registerStockCount(asTx(tx), { note: null, items }, 'user-1').catch(e => e);
    expect(error).toBeInstanceOf(StockCountConflictError);
    expect(error.statusCode).toBe(409);
    expect(error.conflicts).toEqual([{ productId: 'p1', name: 'Sérum', stock: 6 }]);
    expect(tx.stockCount.create).not.toHaveBeenCalled();
  });

  it('rechaza productos que ya no existen', async () => {
    tx.$queryRaw.mockResolvedValue([{ id: 'p1', name: 'Sérum', stock: 4 }]);
    await expect(registerStockCount(asTx(tx), { note: null, items }, 'user-1')).rejects.toMatchObject({ statusCode: 404 });
  });
});

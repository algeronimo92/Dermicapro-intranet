import { Prisma } from '@prisma/client';
import {
  parsePurchaseDate,
  parsePurchaseItems,
  purchaseDbError,
  registerPurchase,
} from '../purchases.service';

function fakeTx() {
  return {
    registeredInvoice: { findUnique: jest.fn() },
    product: { findMany: jest.fn(), update: jest.fn() },
    purchase: { create: jest.fn() },
    purchaseItem: { create: jest.fn() },
    inventoryMovement: { create: jest.fn() },
  };
}
type FakeTx = ReturnType<typeof fakeTx>;
const asTx = (tx: FakeTx) => tx as unknown as Prisma.TransactionClient;

describe('parsePurchaseDate', () => {
  it('sin fecha usa hoy (sin hora)', () => {
    const date = parsePurchaseDate(undefined);
    expect(date.getUTCHours()).toBe(0);
  });

  it('acepta una fecha válida', () => {
    expect(parsePurchaseDate('2026-11-20').toISOString()).toBe('2026-11-20T00:00:00.000Z');
  });

  it.each(['20-11-2026', '2026-02-30', 'hoy', 123])('rechaza %p', value => {
    expect(() => parsePurchaseDate(value)).toThrow(expect.objectContaining({ statusCode: 400 }));
  });

  it('rechaza fechas futuras', () => {
    expect(() => parsePurchaseDate('2999-01-01')).toThrow(/futura/);
  });
});

describe('parsePurchaseItems', () => {
  it('normaliza cantidades en texto', () => {
    expect(parsePurchaseItems([{ productId: 'p1', quantity: '3' }])).toEqual([{ productId: 'p1', quantity: 3 }]);
  });

  it.each([
    ['vacía', []],
    ['no es lista', 'x'],
    ['producto repetido', [{ productId: 'p1', quantity: 1 }, { productId: 'p1', quantity: 2 }]],
    ['cantidad cero', [{ productId: 'p1', quantity: 0 }]],
    ['cantidad decimal', [{ productId: 'p1', quantity: 1.5 }]],
    ['sin producto', [{ quantity: 1 }]],
  ])('rechaza %s', (_label, value) => {
    expect(() => parsePurchaseItems(value)).toThrow(expect.objectContaining({ statusCode: 400 }));
  });
});

describe('registerPurchase', () => {
  const input = {
    purchaseDate: new Date('2026-11-20T00:00:00.000Z'),
    invoiceId: 'inv-1',
    note: 'pedido semanal',
    items: [{ productId: 'p1', quantity: 5 }, { productId: 'p2', quantity: 2 }],
  };

  let tx: FakeTx;
  beforeEach(() => {
    tx = fakeTx();
    tx.registeredInvoice.findUnique.mockResolvedValue({ category: 'products', purchase: null });
    tx.product.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
    tx.purchase.create.mockResolvedValue({ id: 'pur-1' });
    tx.purchaseItem.create.mockImplementation(({ data }) => Promise.resolve({ id: `line-${data.productId}` }));
    tx.product.update.mockImplementation(({ where }) => Promise.resolve({ stock: where.id === 'p1' ? 8 : 2 }));
  });

  it('crea la compra, suma stock y deja una entrada "Compra" ligada a cada línea', async () => {
    await registerPurchase(asTx(tx), input, 'user-1');

    expect(tx.purchase.create).toHaveBeenCalledWith({ data: expect.objectContaining({ invoiceId: 'inv-1', createdById: 'user-1' }) });
    expect(tx.product.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'p1' }, data: { stock: { increment: 5 } },
    }));
    const movements = tx.inventoryMovement.create.mock.calls.map(([args]) => args.data);
    expect(movements[0]).toMatchObject({
      productId: 'p1', type: 'in', reason: 'purchase', quantity: 5, stockAfter: 8, purchaseItemId: 'line-p1',
    });
    expect(movements[1]).toMatchObject({ productId: 'p2', stockAfter: 2, purchaseItemId: 'line-p2' });
  });

  it('sin factura no consulta Facturas', async () => {
    await registerPurchase(asTx(tx), { ...input, invoiceId: null }, 'user-1');
    expect(tx.registeredInvoice.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ['inexistente (o de Tratamientos para inventario)', null, 404],
    ['de Tratamientos', { category: 'treatments', purchase: null }, 400],
    ['ya ligada a otra compra', { category: 'products', purchase: { id: 'otra' } }, 409],
  ])('rechaza una factura %s sin tocar el stock', async (_label, invoice, status) => {
    tx.registeredInvoice.findUnique.mockResolvedValue(invoice);
    await expect(registerPurchase(asTx(tx), input, 'user-1')).rejects.toMatchObject({ statusCode: status });
    expect(tx.purchase.create).not.toHaveBeenCalled();
    expect(tx.product.update).not.toHaveBeenCalled();
  });

  it('rechaza si un producto ya no existe', async () => {
    tx.product.findMany.mockResolvedValue([{ id: 'p1' }]);
    await expect(registerPurchase(asTx(tx), input, 'user-1')).rejects.toMatchObject({ statusCode: 404 });
    expect(tx.purchase.create).not.toHaveBeenCalled();
  });
});

describe('purchaseDbError', () => {
  it('traduce la factura duplicada y el trigger de tipo', () => {
    const dup = new Prisma.PrismaClientKnownRequestError('dup', {
      code: 'P2002', clientVersion: 'x', meta: { target: ['invoice_id'] },
    });
    expect(purchaseDbError(dup)).toMatchObject({ statusCode: 409 });
    expect(purchaseDbError(new Error('INVOICE_NOT_PRODUCTS: ...'))).toMatchObject({ statusCode: 400 });
    expect(purchaseDbError(new Error('otra cosa'))).toBeNull();
  });
});

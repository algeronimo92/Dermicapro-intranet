import { Request, Response } from 'express';
import prisma from '../../config/database';
import { createProduct, listMovements, updateProduct, updateStockAlerts } from '../inventory.controller';
import { createPurchase, listPurchases } from '../purchases.controller';
import { registerPurchase } from '../../services/inventory/purchases.service';

jest.mock('../../config/database', () => ({ __esModule: true, default: {
  product: { create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn(), findUniqueOrThrow: jest.fn() },
  inventoryMovement: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  purchase: { findMany: jest.fn(), count: jest.fn() },
  $transaction: jest.fn(),
} }));

jest.mock('../../services/inventory/purchases.service', () => {
  const actual = jest.requireActual('../../services/inventory/purchases.service');
  return { ...actual, registerPurchase: jest.fn() };
});

const db = prisma as unknown as {
  product: Record<string, jest.Mock>;
  inventoryMovement: Record<string, jest.Mock>;
  purchase: Record<string, jest.Mock>;
  $transaction: jest.Mock;
};
const register = registerPurchase as jest.Mock;

type Access = { purchases?: boolean; purchase?: boolean; invoicesView?: boolean };
function request(body: unknown = {}, access: Access = {}, params: Record<string, string> = {}) {
  return {
    body,
    params,
    query: {},
    user: { id: 'user-1' },
    moduleAccess: {
      inventory: { view: true, create: true, edit: true, purchases: !!access.purchases, purchase: !!access.purchase },
      invoices: { view: !!access.invoicesView, create: false, edit: false, delete: false },
    },
  } as unknown as Request;
}
function response() {
  const res = { json: jest.fn(), status: jest.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response & { json: jest.Mock; status: jest.Mock };
}

const product = { name: 'Sérum', salePrice: 90 };

beforeEach(() => {
  jest.resetAllMocks();
  db.$transaction.mockImplementation((cb: (tx: unknown) => unknown) => cb(prisma));
  db.product.create.mockResolvedValue({ id: 'p1' });
  db.product.findUniqueOrThrow.mockResolvedValue({ id: 'p1', stock: 4 });
  db.inventoryMovement.findMany.mockResolvedValue([]);
  db.inventoryMovement.count.mockResolvedValue(0);
});

describe('createProduct', () => {
  it('stock inicial sin factura: movimiento "Inventario inicial", sin compra', async () => {
    const res = response();
    await createProduct(request({ ...product, initialStock: 4 }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(register).not.toHaveBeenCalled();
    expect(db.inventoryMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ reason: 'initial', quantity: 4, stockAfter: 4 }),
    });
  });

  it('stock inicial con factura: se registra como compra ligada a la factura', async () => {
    const res = response();
    await createProduct(request({ ...product, initialStock: 4, invoiceId: 'inv-1' }, { purchase: true }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(register).toHaveBeenCalledWith(prisma, expect.objectContaining({
      invoiceId: 'inv-1', items: [{ productId: 'p1', quantity: 4 }],
    }), 'user-1');
    expect(db.inventoryMovement.create).not.toHaveBeenCalled();
  });

  it('con factura exige poder registrar compras', async () => {
    const res = response();
    await createProduct(request({ ...product, initialStock: 4, invoiceId: 'inv-1' }), res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(db.product.create).not.toHaveBeenCalled();
  });

  it('rechaza un objetivo menor que el mínimo', async () => {
    const res = response();
    await createProduct(request({ ...product, minStock: 5, targetStock: 3 }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('updateProduct', () => {
  it('no permite editar el stock a mano', async () => {
    const res = response();
    await updateProduct(request({ stock: 10 }, {}, { id: 'p1' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.product.update).not.toHaveBeenCalled();
  });

  it('valida el objetivo contra el mínimo guardado', async () => {
    db.product.findUnique.mockResolvedValue({ id: 'p1', minStock: 6, targetStock: null });
    const res = response();
    await updateProduct(request({ targetStock: 4 }, {}, { id: 'p1' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('updateStockAlerts', () => {
  it('guarda mínimo y objetivo de varios productos en una transacción', async () => {
    db.product.updateMany.mockResolvedValue({ count: 1 });
    const res = response();
    await updateStockAlerts(request({ rows: [
      { productId: 'p1', minStock: 2, targetStock: 10 },
      { productId: 'p2', minStock: 3, targetStock: '' },
    ] }), res);
    expect(db.product.updateMany).toHaveBeenCalledWith({ where: { id: 'p2' }, data: { minStock: 3, targetStock: null } });
    expect(res.json.mock.calls[0][0].data).toEqual({ updated: 2 });
  });

  it.each([
    ['sin filas', { rows: [] }],
    ['objetivo menor que el mínimo', { rows: [{ productId: 'p1', minStock: 5, targetStock: 2 }] }],
    ['producto repetido', { rows: [{ productId: 'p1', minStock: 1 }, { productId: 'p1', minStock: 2 }] }],
    ['mínimo negativo', { rows: [{ productId: 'p1', minStock: -1 }] }],
  ])('rechaza %s', async (_label, body) => {
    const res = response();
    await updateStockAlerts(request(body), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe('listMovements', () => {
  it('sólo incluye la compra de origen si la persona puede ver compras', async () => {
    await listMovements(request({}, {}, { id: 'p1' }), response());
    expect(db.inventoryMovement.findMany.mock.calls[0][0].include).not.toHaveProperty('purchaseItem');

    await listMovements(request({}, { purchases: true }, { id: 'p1' }), response());
    expect(db.inventoryMovement.findMany.mock.calls[1][0].include).toHaveProperty('purchaseItem');
  });
});

describe('compras', () => {
  it('el listado sólo incluye la factura si la persona ve Facturas', async () => {
    db.purchase.findMany.mockResolvedValue([]);
    db.purchase.count.mockResolvedValue(0);
    await listPurchases(request({}, { purchases: true }), response());
    expect(db.purchase.findMany.mock.calls[0][0].include).not.toHaveProperty('invoice');

    await listPurchases(request({}, { purchases: true, invoicesView: true }), response());
    expect(db.purchase.findMany.mock.calls[1][0].include).toHaveProperty('invoice');
  });

  it('ligar una factura exige acceso a Facturas', async () => {
    const res = response();
    await createPurchase(request({ items: [{ productId: 'p1', quantity: 1 }], invoiceId: 'inv-1' }, { purchase: true }), res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(register).not.toHaveBeenCalled();
  });

  it('registra la compra en una transacción', async () => {
    register.mockResolvedValue({ id: 'pur-1' });
    const res = response();
    await createPurchase(request({
      items: [{ productId: 'p1', quantity: 3 }], purchaseDate: '2026-11-20', note: '  semanal ',
    }, { purchase: true }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(register).toHaveBeenCalledWith(prisma, expect.objectContaining({
      invoiceId: null, note: 'semanal', items: [{ productId: 'p1', quantity: 3 }],
    }), 'user-1');
  });
});

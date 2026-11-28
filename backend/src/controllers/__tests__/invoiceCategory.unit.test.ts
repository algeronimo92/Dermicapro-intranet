import { Request, Response } from 'express';
import prisma from '../../config/database';
import { createInvoice, getInvoiceDefaults, updateInvoice } from '../invoices.controller';

jest.mock('uuid', () => ({ v4: () => 'test-upload-id' }));
jest.mock('../../config/database', () => ({ __esModule: true, default: {
  registeredInvoice: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  $transaction: jest.fn(),
} }));
jest.mock('../../services/invoice-attachment-storage', () => ({ invoiceAttachmentStorage: { upload: jest.fn(), remove: jest.fn() } }));
jest.mock('../../services/invoice-object-cleanup.service', () => ({
  queueInvoiceObjectDeletions: jest.fn(), processInvoiceObjectDeletions: jest.fn(),
}));

const create = prisma.registeredInvoice.create as jest.Mock;
const find = prisma.registeredInvoice.findUnique as jest.Mock;
const transaction = prisma.$transaction as jest.Mock;

const fields = {
  documentType: 'Factura', issuerRuc: '20123456789', issuerName: 'Proveedor', issueDate: '2026-11-20',
  currency: 'PEN', taxableSubtotal: '10.00', tax: '1.80', total: '11.80',
};
const request = (roleName: string, body: Record<string, unknown> = {}) =>
  ({ params: { id: 'inv-1' }, body: { ...fields, ...body }, files: [], user: { id: 'u1', roleName } }) as unknown as Request;
function response() {
  const res = { json: jest.fn(), status: jest.fn(), end: jest.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response & { json: jest.Mock };
}

beforeEach(() => {
  jest.resetAllMocks();
  create.mockResolvedValue({ id: 'inv-1' });
});

describe('tipo de factura', () => {
  it('inventario sólo puede usar Productos (y es su valor por defecto)', async () => {
    const res = response();
    getInvoiceDefaults(request('inventory'), res);
    expect(res.json.mock.calls[0][0].categories).toEqual(['products']);

    await createInvoice(request('inventory'), response());
    expect(create.mock.calls[0][0].data.category).toBe('products');

    await expect(createInvoice(request('inventory', { category: 'treatments' }), response()))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it('el resto elige; sin elegir queda como Tratamientos', async () => {
    const res = response();
    getInvoiceDefaults(request('accountant'), res);
    expect(res.json.mock.calls[0][0].categories).toEqual(['treatments', 'products']);

    await createInvoice(request('accountant'), response());
    expect(create.mock.calls[0][0].data.category).toBe('treatments');
    await createInvoice(request('admin', { category: 'products' }), response());
    expect(create.mock.calls[1][0].data.category).toBe('products');
  });

  it('una factura ligada a una compra no puede dejar de ser de Productos', async () => {
    find.mockResolvedValue({ revision: 0, attachments: [] });
    transaction.mockRejectedValue(new Error('INVOICE_CATEGORY_LOCKED: la factura está ligada a una compra'));
    await expect(updateInvoice(request('accountant', { revision: '0', category: 'treatments' }), response()))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  it('sin tipo en la edición se conserva el actual', async () => {
    find.mockResolvedValue({ revision: 0, attachments: [] });
    const update = jest.fn().mockResolvedValue({ id: 'inv-1', revision: 1 });
    transaction.mockImplementation((cb: (tx: unknown) => unknown) => cb({ registeredInvoice: { update } }));
    await updateInvoice(request('accountant', { revision: '0' }), response());
    expect(update.mock.calls[0][0].data).not.toHaveProperty('category');
  });
});

import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { updateInvoice, deleteInvoice } from '../invoices.controller';
import { invoiceAttachmentStorage } from '../../services/invoice-attachment-storage';
import { queueInvoiceObjectDeletions } from '../../services/invoice-object-cleanup.service';
jest.mock('uuid', () => ({ v4: () => 'test-upload-id' }));

jest.mock('../../config/database', () => ({ __esModule: true, default: {
  registeredInvoice: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
  $transaction: jest.fn(),
} }));
jest.mock('../../services/invoice-attachment-storage', () => ({ invoiceAttachmentStorage: {
  upload: jest.fn(), remove: jest.fn(),
} }));
jest.mock('../../services/invoice-object-cleanup.service', () => ({
  queueInvoiceObjectDeletions: jest.fn(), processInvoiceObjectDeletions: jest.fn(),
}));

const find = prisma.registeredInvoice.findUnique as jest.Mock;
const update = prisma.registeredInvoice.update as jest.Mock;
const remove = prisma.registeredInvoice.delete as jest.Mock;
const transaction = prisma.$transaction as jest.Mock;
const upload = invoiceAttachmentStorage!.upload as jest.Mock;
const queue = queueInvoiceObjectDeletions as jest.Mock;
const fields = {
  revision: '0', documentType: 'Factura', issuerRuc: '20123456789', issuerName: 'Proveedor de prueba',
  issueDate: '2026-11-10', currency: 'PEN', taxableSubtotal: '10.00', tax: '1.80', total: '11.80',
};
function request(body = {}, files: unknown[] = []) {
  return { params: { id: 'invoice-id' }, body: { ...fields, ...body }, files, user: { id: 'admin' } } as unknown as Request;
}
function response() {
  const res = { json: jest.fn(), status: jest.fn(), end: jest.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response;
}
beforeEach(() => {
  jest.resetAllMocks();
  find.mockResolvedValue({ revision: 0, attachments: [{ id: 'old-file', objectKey: 'facturas/old' }] });
  transaction.mockImplementation((callback: (tx: typeof prisma) => unknown) => callback(prisma));
  update.mockResolvedValue({ id: 'invoice-id', revision: 1 });
  upload.mockResolvedValue({ versionId: 'version' });
});

it('conserva adjuntos existentes al editar datos y exige la revisión actual de forma atómica', async () => {
  await updateInvoice(request(), response());
  expect(update).toHaveBeenCalledWith(expect.objectContaining({
    where: { id: 'invoice-id', revision: 0 },
    data: expect.objectContaining({ revision: { increment: 1 }, attachments: { deleteMany: { id: { in: [] } }, create: [] } }),
  }));
});
it('retira adjuntos y agenda la limpieza dentro de la misma transacción', async () => {
  await updateInvoice(request({ retainedAttachmentIds: '[]' }), response());
  expect(update.mock.calls[0][0].data.attachments.deleteMany.id.in).toEqual(['old-file']);
  expect(queue).toHaveBeenCalledWith(prisma, [{ key: 'facturas/old' }]);
});
it.each(['["foreign-file"]', '["old-file","old-file"]', 'invalid'])('rechaza adjuntos ajenos o inválidos %s', async retainedAttachmentIds => {
  await expect(updateInvoice(request({ retainedAttachmentIds }), response())).rejects.toMatchObject({ statusCode: 400 });
  expect(update).not.toHaveBeenCalled();
});
it('rechaza una edición desactualizada antes de subir archivos', async () => {
  await expect(updateInvoice(request({ revision: '1' }), response())).rejects.toMatchObject({ statusCode: 409 });
  expect(upload).not.toHaveBeenCalled();
});
it('impide superar cinco archivos entre conservados y nuevos', async () => {
  await expect(updateInvoice(request({}, Array(5).fill({})), response())).rejects.toMatchObject({ statusCode: 400 });
  expect(upload).not.toHaveBeenCalled();
});
it('limpia una subida nueva si otra edición gana la carrera', async () => {
  update.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('race', { code: 'P2025', clientVersion: '7.8' }));
  const file = { originalname: 'test.pdf', mimetype: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') };
  await expect(updateInvoice(request({}, [file]), response())).rejects.toMatchObject({ statusCode: 409 });
  expect(queue).toHaveBeenCalledWith(prisma, [expect.objectContaining({ key: expect.stringMatching(/^facturas\/invoice-id\//), versionId: 'version' })]);
});
it('elimina el registro y agenda solo los objetos MinIO, incluidos adjuntos heredados', async () => {
  find.mockResolvedValue({ revision: 0, attachments: [{ objectKey: 'facturas/old' }, { objectKey: null }] });
  const res = response();
  await deleteInvoice(request(), res);
  expect(remove).toHaveBeenCalledWith({ where: { id: 'invoice-id', revision: 0 } });
  expect(queue).toHaveBeenCalledWith(prisma, [{ key: 'facturas/old' }]);
  expect(res.status).toHaveBeenCalledWith(204);
});
it('no elimina una revisión nueva con un detalle viejo', async () => {
  await expect(deleteInvoice(request({ revision: 1 }), response())).rejects.toMatchObject({ statusCode: 409 });
  expect(remove).not.toHaveBeenCalled();
});
it('permite repetir una eliminación confirmada sin errores', async () => {
  find.mockResolvedValue(null);
  const res = response();
  await deleteInvoice(request(), res);
  expect(res.status).toHaveBeenCalledWith(204);
});

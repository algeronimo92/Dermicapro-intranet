import prisma from '../../config/database';
import { invoiceAttachmentStorage } from '../invoice-attachment-storage';
import { processInvoiceObjectDeletions } from '../invoice-object-cleanup.service';

jest.mock('../../config/database', () => ({ __esModule: true, default: {
  invoiceObjectDeletion: { findMany: jest.fn(), deleteMany: jest.fn(), updateMany: jest.fn() },
  registeredInvoiceAttachment: { findUnique: jest.fn() },
} }));
jest.mock('../invoice-attachment-storage', () => ({ invoiceAttachmentStorage: { remove: jest.fn() } }));
const jobs = prisma.invoiceObjectDeletion.findMany as jest.Mock;
const deleted = prisma.invoiceObjectDeletion.deleteMany as jest.Mock;
const retry = prisma.invoiceObjectDeletion.updateMany as jest.Mock;
const reference = prisma.registeredInvoiceAttachment.findUnique as jest.Mock;
const remove = invoiceAttachmentStorage!.remove as jest.Mock;
beforeEach(() => {
  jest.resetAllMocks();
  jobs.mockResolvedValue([{ id: 'job', objectKey: 'facturas/file', versionId: 'v1' }]);
  reference.mockResolvedValue(null);
});
it('retira objetos huérfanos y confirma el trabajo después de eliminarlos', async () => {
  await processInvoiceObjectDeletions();
  expect(remove).toHaveBeenCalledWith('facturas/file', 'v1');
  expect(deleted).toHaveBeenCalledWith({ where: { id: 'job' } });
});
it('conserva objetos que siguen asociados a un comprobante', async () => {
  reference.mockResolvedValue({ id: 'attachment' });
  await processInvoiceObjectDeletions();
  expect(remove).not.toHaveBeenCalled();
});
it('deja pendiente la limpieza si falla MinIO y programa otro intento', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  remove.mockRejectedValue(new Error('offline'));
  await processInvoiceObjectDeletions();
  expect(deleted).not.toHaveBeenCalled();
  expect(retry).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'job' }, data: { nextAttemptAt: expect.any(Date) } }));
  log.mockRestore();
});

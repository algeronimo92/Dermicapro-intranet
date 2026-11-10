import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { invoiceAttachmentStorage } from './invoice-attachment-storage';

export type InvoiceObject = { key: string; versionId?: string | null };

export async function queueInvoiceObjectDeletions(tx: Prisma.TransactionClient, objects: InvoiceObject[]) {
  if (!objects.length) return;
  await tx.invoiceObjectDeletion.createMany({
    data: objects.map(object => ({ objectKey: object.key, versionId: object.versionId })),
    skipDuplicates: true,
  });
}

let running: Promise<void> | undefined;
let timer: NodeJS.Timeout | undefined;

async function processBatch(): Promise<void> {
  const storage = invoiceAttachmentStorage;
  if (!storage) return;
  const jobs = await prisma.invoiceObjectDeletion.findMany({
    where: { nextAttemptAt: { lte: new Date() } },
    orderBy: [{ nextAttemptAt: 'asc' }, { id: 'asc' }],
    take: 20,
  });
  await Promise.all(jobs.map(async job => {
    try {
      const referenced = await prisma.registeredInvoiceAttachment.findUnique({
        where: { objectKey: job.objectKey }, select: { id: true },
      });
      if (!referenced) await storage.remove(job.objectKey, job.versionId);
      await prisma.invoiceObjectDeletion.deleteMany({ where: { id: job.id } });
    } catch (error) {
      await prisma.invoiceObjectDeletion.updateMany({
        where: { id: job.id }, data: { nextAttemptAt: new Date(Date.now() + 60_000) },
      });
      console.error(JSON.stringify({
        event: 'invoice_object_cleanup_error',
        job_id: job.id,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }));
}

export function processInvoiceObjectDeletions(): Promise<void> {
  if (!running) {
    running = processBatch().catch(error => {
      console.error(JSON.stringify({
        event: 'invoice_object_cleanup_batch_error',
        error: error instanceof Error ? error.message : String(error),
      }));
    }).finally(() => { running = undefined; });
  }
  return running;
}

export function startInvoiceObjectCleanup(): void {
  if (timer) return;
  void processInvoiceObjectDeletions();
  timer = setInterval(() => { void processInvoiceObjectDeletions(); }, 60_000);
  timer.unref();
}

export function stopInvoiceObjectCleanup(): void {
  if (timer) clearInterval(timer);
  timer = undefined;
}

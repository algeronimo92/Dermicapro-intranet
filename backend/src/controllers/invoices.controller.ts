import { randomUUID } from 'node:crypto';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../config/database';
import { AppError, logUnexpectedError } from '../middlewares/errorHandler';
import { hasMagicBytes } from '../middlewares/upload';
import { invoiceAttachmentStorage } from '../services/invoice-attachment-storage';
import ExcelJS from 'exceljs';
import { getInvoiceReport, invoiceDate, invoiceDocumentTypes, invoiceWhere, parseInvoiceQuery } from '../services/invoice-report.service';

const invoiceCustomer = {
  customerDocument: '20615564819',
  customerName: 'CENTRO AVANZADO DE REJUVENECIMIENTO FACIAL Y TECNOESTETICA S.A.C.',
  customerAddress: 'Av. Víctor Larco Herrera Nro. 877, Urb. Vista Alegre, La Libertad – Trujillo – Víctor Larco Herrera',
};

const amount = z.string().trim().regex(
  /^(?:\d{1,10}(?:\.\d{1,2})?|\.\d{1,2})$/,
  'Ingresa un importe válido con hasta dos decimales',
);

const invoiceInput = z.object({
  documentType: z.enum(invoiceDocumentTypes),
  issuerRuc: z.string().trim().regex(/^\d{11}$/, 'El RUC debe tener 11 dígitos'),
  issuerName: z.string().trim().min(1).max(200),
  issueDate: invoiceDate,
  issueTime: z.union([z.iso.time({ precision: -1 }), z.literal('')]).optional(),
  currency: z.enum(['PEN', 'USD']).default('PEN'),
  taxableSubtotal: amount,
  discount: z.union([amount, z.literal('')]).optional(),
  tax: amount,
  total: amount,
  paymentCondition: z.enum(['Contado', 'Crédito']).default('Contado'),
});

const summarySelect = {
  id: true,
  documentType: true,
  issuerRuc: true,
  issuerName: true,
  issueDate: true,
  currency: true,
  total: true,
  _count: { select: { attachments: true } },
} satisfies Prisma.RegisteredInvoiceSelect;

const detailSelect = {
  ...summarySelect,
  customerDocument: true,
  customerName: true,
  customerAddress: true,
  issueTime: true,
  taxableSubtotal: true,
  discount: true,
  tax: true,
  paymentCondition: true,
  createdBy: { select: { firstName: true, lastName: true } },
  attachments: { select: { id: true, fileName: true }, orderBy: { id: 'asc' } },
} satisfies Prisma.RegisteredInvoiceSelect;

type UploadedObject = { key: string; versionId?: string | null };

async function removeUploadedObjects(req: Request, objects: UploadedObject[]) {
  if (!invoiceAttachmentStorage) return;
  const storage = invoiceAttachmentStorage;
  const results = await Promise.allSettled(objects.map(object => storage.remove(object.key, object.versionId)));
  for (const result of results) {
    if (result.status === 'rejected') logUnexpectedError(req, result.reason);
  }
}

export function getInvoiceDefaults(_req: Request, res: Response): void {
  res.json(invoiceCustomer);
}

export async function listInvoices(req: Request, res: Response): Promise<void> {
  const query = parseInvoiceQuery(req.query);
  const where = invoiceWhere(query);
  const limit = 20;
  const [data, total] = await prisma.$transaction([
    prisma.registeredInvoice.findMany({
      select: summarySelect,
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * limit,
      take: limit,
    }),
    prisma.registeredInvoice.count({ where }),
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  res.json({ data, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
}

export async function invoiceReport(req: Request, res: Response): Promise<void> {
  res.json(await getInvoiceReport(parseInvoiceQuery(req.query)));
}

export async function exportInvoices(req: Request, res: Response): Promise<void> {
  const query = parseInvoiceQuery(req.query);
  const where = { ...invoiceWhere(query), createdAt: { lte: new Date() } };
  res.attachment('facturas.xlsx');
  res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res, useStyles: true });
  const sheet = workbook.addWorksheet('Facturas');
  sheet.columns = [
    { header: 'Tipo de documento', key: 'documentType', width: 22 },
    { header: 'RUC emisor', key: 'issuerRuc', width: 16 },
    { header: 'Razón social emisor', key: 'issuerName', width: 40 },
    { header: 'Fecha de emisión', key: 'issueDate', width: 18, style: { numFmt: 'dd/mm/yyyy' } },
    { header: 'Moneda', key: 'currency', width: 12 },
    { header: 'Subtotal gravado', key: 'taxableSubtotal', width: 20, style: { numFmt: '#,##0.00' } },
    { header: 'Descuento', key: 'discount', width: 16, style: { numFmt: '#,##0.00' } },
    { header: 'IGV', key: 'tax', width: 16, style: { numFmt: '#,##0.00' } },
    { header: 'Total', key: 'total', width: 18, style: { numFmt: '#,##0.00' } },
    { header: 'Condición de pago', key: 'paymentCondition', width: 22 },
    { header: 'Cantidad de adjuntos', key: 'attachmentCount', width: 22 },
  ];
  sheet.getRow(1).font = { bold: true };
  let cursor: { id: string } | undefined;
  try {
    while (!res.destroyed) {
      const rows = await prisma.registeredInvoice.findMany({
        where,
        select: {
          ...summarySelect, taxableSubtotal: true, discount: true, tax: true, paymentCondition: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        cursor,
        skip: cursor ? 1 : 0,
        take: 500,
      });
      for (const row of rows) {
        sheet.addRow({
          ...row,
          taxableSubtotal: row.taxableSubtotal.toNumber(),
          discount: row.discount?.toNumber() ?? 0,
          tax: row.tax.toNumber(),
          total: row.total.toNumber(),
          paymentCondition: row.paymentCondition === 'Contado' ? 'Al contado' : row.paymentCondition,
          attachmentCount: row._count.attachments,
        }).commit();
      }
      if (rows.length < 500) break;
      cursor = { id: rows[rows.length - 1].id };
    }
    await workbook.commit();
  } catch (error) {
    if (!res.headersSent) throw error;
    logUnexpectedError(req, error);
    res.destroy();
  }
}

export async function createInvoice(req: Request, res: Response): Promise<void> {
  const input = invoiceInput.safeParse(req.body);
  if (!input.success) {
    const issue = input.error.issues[0];
    const fieldErrors: Partial<Record<keyof z.infer<typeof invoiceInput>, string>> = {
      issuerName: 'Ingresa la razón social del emisor (hasta 200 caracteres)',
      documentType: 'Selecciona un tipo de documento válido',
      issueDate: 'Ingresa una fecha de emisión válida',
      issueTime: 'Ingresa una hora de emisión válida',
      currency: 'Selecciona una moneda válida',
      paymentCondition: 'Selecciona una condición de pago válida',
    };
    const field = issue.path[0] as keyof z.infer<typeof invoiceInput>;
    throw new AppError(fieldErrors[field] ?? issue.message, 400);
  }

  const files = (req.files ?? []) as Express.Multer.File[];
  const validatedFiles = files.map(file => {
    if (!hasMagicBytes(file.buffer, file.mimetype)) {
      throw new AppError('El contenido de un adjunto no coincide con su tipo de archivo', 400);
    }
    return {
      fileName: file.originalname.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 255) || 'comprobante',
      mimeType: file.mimetype,
      buffer: file.buffer,
    };
  });
  const storage = invoiceAttachmentStorage;
  if (!storage && validatedFiles.length > 0) {
    throw new AppError('Almacenamiento de adjuntos no disponible', 503);
  }
  const { issueDate, issueTime, discount, ...fields } = input.data;

  const invoiceId = randomUUID();
  const uploadedObjects: UploadedObject[] = [];
  const attachments: Prisma.RegisteredInvoiceAttachmentCreateWithoutInvoiceInput[] = [];

  try {
    if (storage) {
      for (const { buffer, ...file } of validatedFiles) {
        const object: UploadedObject = { key: `facturas/${invoiceId}/${randomUUID()}` };
        uploadedObjects.push(object);
        const uploaded = await storage.upload(object.key, buffer, file.mimeType);
        object.versionId = uploaded.versionId;
        attachments.push({ ...file, objectKey: object.key });
      }
    }
  } catch (error) {
    await removeUploadedObjects(req, uploadedObjects);
    logUnexpectedError(req, error);
    throw new AppError('No se pudieron guardar los adjuntos. Intenta nuevamente.', 502);
  }

  try {
    const invoice = await prisma.registeredInvoice.create({
      data: {
        id: invoiceId,
        ...fields,
        ...invoiceCustomer,
        issueDate: new Date(issueDate),
        issueTime: issueTime || null,
        discount: discount || null,
        createdById: req.user!.id,
        attachments: { create: attachments },
      },
      select: { id: true },
    });
    res.status(201).json(invoice);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2003', 'P2004'].includes(error.code)) {
      await removeUploadedObjects(req, uploadedObjects);
    } else if (uploadedObjects.length) {
      // Si el resultado del commit es incierto, conservar los objetos evita romper un registro confirmado.
      console.warn(JSON.stringify({ event: 'invoice_attachment_commit_uncertain', invoice_id: invoiceId, request_id: req.id }));
    }
    throw error;
  }
}

export async function getInvoice(req: Request, res: Response): Promise<void> {
  const invoice = await prisma.registeredInvoice.findUnique({
    where: { id: req.params.id },
    select: detailSelect,
  });
  if (!invoice) throw new AppError('Comprobante no encontrado', 404);
  res.json(invoice);
}

export async function downloadInvoiceAttachment(req: Request, res: Response): Promise<void> {
  const attachment = await prisma.registeredInvoiceAttachment.findUnique({
    where: { id: req.params.attachmentId, invoiceId: req.params.id },
    select: { fileName: true, mimeType: true, content: true, objectKey: true },
  });
  if (!attachment) throw new AppError('Adjunto no encontrado', 404);

  let content: Buffer;
  if (attachment.objectKey) {
    if (!invoiceAttachmentStorage) throw new AppError('Almacenamiento de adjuntos no disponible', 503);
    try {
      content = await invoiceAttachmentStorage.download(attachment.objectKey);
    } catch (error) {
      logUnexpectedError(req, error);
      throw new AppError('No se pudo descargar el adjunto. Intenta nuevamente.', 502);
    }
  } else {
    if (!attachment.content) throw new AppError('Adjunto no encontrado', 404);
    content = Buffer.from(attachment.content);
  }

  res.attachment(attachment.fileName);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.type(attachment.mimeType).send(content);
}

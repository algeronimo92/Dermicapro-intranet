import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';

export const invoiceDocumentTypes = ['Factura', 'Boleta', 'Nota de crédito', 'Nota de débito'] as const;
export const invoiceDate = z.iso.date().refine(value => !value.startsWith('0000-'));

const queryInput = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  search: z.string().trim().max(200).default(''),
  currency: z.enum(['PEN', 'USD']).optional(),
  documentType: z.enum(invoiceDocumentTypes).optional(),
  dateFrom: invoiceDate.optional(),
  dateTo: invoiceDate.optional(),
}).refine(value => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo, {
  message: 'La fecha inicial debe ser anterior o igual a la fecha final',
});

export type InvoiceQuery = z.infer<typeof queryInput>;

export function parseInvoiceQuery(query: unknown): InvoiceQuery {
  const result = queryInput.safeParse(query);
  if (!result.success) throw new AppError('Revisa los filtros de fecha, moneda, tipo y búsqueda', 400);
  return result.data;
}

export function invoiceWhere(query: InvoiceQuery): Prisma.RegisteredInvoiceWhereInput {
  return {
    currency: query.currency,
    documentType: query.documentType,
    issueDate: {
      gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
      lte: query.dateTo ? new Date(query.dateTo) : undefined,
    },
    OR: query.search ? [
      { issuerName: { contains: query.search, mode: 'insensitive' } },
      { issuerRuc: { contains: query.search } },
    ] : undefined,
  };
}

type Category = 'documentsAmount' | 'creditNotes' | 'debitNotes';
const categories: Record<string, Category> = {
  Factura: 'documentsAmount',
  Boleta: 'documentsAmount',
  'Nota de crédito': 'creditNotes',
  'Nota de débito': 'debitNotes',
};

export async function getInvoiceReport(query: InvoiceQuery) {
  const currency = query.currency ?? 'PEN';
  const where = invoiceWhere({ ...query, currency });
  const [groups, withoutAttachments] = await prisma.$transaction([
    prisma.registeredInvoice.groupBy({
      by: ['issueDate', 'issuerRuc', 'issuerName', 'documentType'],
      where,
      _sum: { total: true, tax: true },
      _count: { _all: true },
      orderBy: { issueDate: 'desc' },
    }),
    prisma.registeredInvoice.count({ where: { ...where, attachments: { none: {} } } }),
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });

  const totals = {
    documentsAmount: new Prisma.Decimal(0),
    creditNotes: new Prisma.Decimal(0),
    debitNotes: new Prisma.Decimal(0),
  };
  let documentsTax = new Prisma.Decimal(0);
  let count = 0;
  let creditNoteCount = 0;
  let debitNoteCount = 0;
  const providers = new Map<string, { ruc: string; name: string; total: Prisma.Decimal }>();
  const end = new Date(query.dateTo ?? groups[0]?.issueDate ?? new Date());
  const firstMonth = (query.dateFrom ?? groups.at(-1)?.issueDate.toISOString())?.slice(0, 7);
  const months = new Map<string, Record<Category, Prisma.Decimal>>();
  for (let index = 0; index < 12; index++) {
    const date = new Date(end);
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() - 11 + index);
    const month = date.toISOString().slice(0, 7);
    if (firstMonth && month < firstMonth) continue;
    months.set(month, {
      documentsAmount: new Prisma.Decimal(0),
      creditNotes: new Prisma.Decimal(0),
      debitNotes: new Prisma.Decimal(0),
    });
  }

  for (const group of groups) {
    const category = categories[group.documentType];
    const amount = group._sum.total ?? new Prisma.Decimal(0);
    const tax = group._sum.tax ?? new Prisma.Decimal(0);
    count += group._count._all;
    totals[category] = totals[category].add(amount);
    const month = months.get(group.issueDate.toISOString().slice(0, 7));
    if (month) month[category] = month[category].add(amount);

    if (category === 'documentsAmount') {
      documentsTax = documentsTax.add(tax);
      const provider = providers.get(group.issuerRuc) ?? {
        ruc: group.issuerRuc, name: group.issuerName, total: new Prisma.Decimal(0),
      };
      provider.total = provider.total.add(amount);
      providers.set(group.issuerRuc, provider);
    }
    if (category === 'creditNotes') creditNoteCount += group._count._all;
    if (category === 'debitNotes') debitNoteCount += group._count._all;
  }

  return {
    currency,
    count,
    withoutAttachments,
    documentsAmount: totals.documentsAmount.toFixed(2),
    documentsTax: documentsTax.toFixed(2),
    creditNotes: { count: creditNoteCount, amount: totals.creditNotes.toFixed(2) },
    debitNotes: { count: debitNoteCount, amount: totals.debitNotes.toFixed(2) },
    monthly: count ? Array.from(months, ([month, values]) => ({
      month,
      documentsAmount: values.documentsAmount.toFixed(2),
      creditNotes: values.creditNotes.toFixed(2),
      debitNotes: values.debitNotes.toFixed(2),
    })) : [],
    providers: Array.from(providers.values())
      .sort((a, b) => b.total.comparedTo(a.total) || a.name.localeCompare(b.name))
      .slice(0, 5)
      .map(provider => ({ ...provider, total: provider.total.toFixed(2) })),
  };
}

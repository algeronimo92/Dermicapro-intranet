import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { AppError, logUnexpectedError } from '../middlewares/errorHandler';
import {
  parsePurchaseDate,
  parsePurchaseItems,
  purchaseDbError,
  registerPurchase,
} from '../services/inventory/purchases.service';

const userSummary = { select: { id: true, firstName: true, lastName: true } } as const;

const invoiceSummary = {
  select: { id: true, documentType: true, issuerRuc: true, issuerName: true, issueDate: true, currency: true, total: true },
} as const;

function handleError(req: Request, res: Response, error: unknown, fallback: string) {
  const known = purchaseDbError(error);
  if (known) error = known;
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }
  logUnexpectedError(req, error);
  res.status(500).json({ error: fallback });
}

// La factura de cada compra sólo se incluye si la persona puede ver Facturas
// (si no, leer registered_invoices fallaría por privilegios).
const canSeeInvoices = (req: Request) => Boolean(req.moduleAccess?.invoices.view);

export const listPurchases = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const withInvoice = canSeeInvoices(req);

    const where: Prisma.PurchaseWhereInput = {};
    if (search) {
      where.OR = [
        { note: { contains: search, mode: 'insensitive' } },
        { items: { some: { product: { name: { contains: search, mode: 'insensitive' } } } } },
        ...(withInvoice ? [{ invoice: { issuerName: { contains: search, mode: 'insensitive' as const } } }] : []),
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        include: {
          createdBy: userSummary,
          items: { select: { quantity: true, product: { select: { name: true } } } },
          ...(withInvoice && { invoice: invoiceSummary }),
        },
        orderBy: [{ purchaseDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.purchase.count({ where }),
    ]);

    const data = rows.map(({ items, ...purchase }) => ({
      ...purchase,
      hasInvoice: purchase.invoiceId !== null,
      productCount: items.length,
      unitCount: items.reduce((sum, item) => sum + item.quantity, 0),
      productNames: items.slice(0, 3).map(item => item.product.name),
    }));

    res.json({ data, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (error) {
    handleError(req, res, error, 'Error al obtener las compras');
  }
};

export const getPurchase = async (req: Request, res: Response): Promise<void> => {
  try {
    const purchase = await prisma.purchase.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: userSummary,
        items: {
          select: {
            id: true,
            quantity: true,
            product: { select: { id: true, name: true, brand: true, presentation: true, photoUrl: true, stock: true } },
          },
          orderBy: { product: { name: 'asc' } },
        },
        ...(canSeeInvoices(req) && { invoice: invoiceSummary }),
      },
    });
    if (!purchase) throw new AppError('Compra no encontrada', 404);
    res.json({ data: { ...purchase, hasInvoice: purchase.invoiceId !== null } });
  } catch (error) {
    handleError(req, res, error, 'Error al obtener la compra');
  }
};

export const createPurchase = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body ?? {};
    const items = parsePurchaseItems(body.items);
    const purchaseDate = parsePurchaseDate(body.purchaseDate);
    const invoiceId = typeof body.invoiceId === 'string' && body.invoiceId.trim() ? body.invoiceId.trim() : null;
    if (invoiceId && !canSeeInvoices(req)) throw new AppError('No tienes acceso a Facturas para ligar una factura', 403);
    if (body.note !== undefined && body.note !== null && typeof body.note !== 'string') {
      throw new AppError('La nota debe ser texto', 400);
    }
    const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 300) : null;

    const purchase = await prisma.$transaction(
      tx => registerPurchase(tx, { purchaseDate, invoiceId, note, items }, req.user!.id),
      { timeout: 30_000 },
    );

    res.status(201).json({ data: purchase, message: 'Compra registrada' });
  } catch (error) {
    handleError(req, res, error, 'Error al registrar la compra');
  }
};

/** Facturas de Productos que todavía no están ligadas a ninguna compra. */
export const listAvailableInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!canSeeInvoices(req)) {
      res.json({ data: [] });
      return;
    }
    const data = await prisma.registeredInvoice.findMany({
      where: { category: 'products', purchase: null },
      select: invoiceSummary.select,
      orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });
    res.json({ data });
  } catch (error) {
    handleError(req, res, error, 'Error al obtener las facturas');
  }
};

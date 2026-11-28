import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError, logUnexpectedError } from '../middlewares/errorHandler';
import {
  parseCountItems,
  registerStockCount,
  StockCountConflictError,
} from '../services/inventory/stockCounts.service';

const userSummary = { select: { id: true, firstName: true, lastName: true } } as const;

function handleError(req: Request, res: Response, error: unknown, fallback: string) {
  if (error instanceof StockCountConflictError) {
    res.status(409).json({ error: error.message, conflicts: error.conflicts });
    return;
  }
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }
  logUnexpectedError(req, error);
  res.status(500).json({ error: fallback });
}

/** Resumen de un conteo a partir de sus líneas. */
function summarize(items: { expectedStock: number; countedStock: number }[]) {
  let surplus = 0;
  let shortage = 0;
  for (const item of items) {
    const diff = item.countedStock - item.expectedStock;
    if (diff > 0) surplus += diff;
    if (diff < 0) shortage -= diff;
  }
  return {
    productCount: items.length,
    differenceCount: items.filter(i => i.countedStock !== i.expectedStock).length,
    surplus,
    shortage,
  };
}

export const listStockCounts = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const [rows, total] = await Promise.all([
      prisma.stockCount.findMany({
        include: { createdBy: userSummary, items: { select: { expectedStock: true, countedStock: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.stockCount.count(),
    ]);

    const data = rows.map(({ items, ...stockCount }) => ({ ...stockCount, ...summarize(items) }));
    res.json({ data, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (error) {
    handleError(req, res, error, 'Error al obtener los conteos');
  }
};

export const getStockCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const stockCount = await prisma.stockCount.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: userSummary,
        items: {
          select: {
            id: true,
            expectedStock: true,
            countedStock: true,
            product: { select: { id: true, name: true, brand: true, presentation: true } },
          },
          orderBy: { product: { name: 'asc' } },
        },
      },
    });
    if (!stockCount) throw new AppError('Conteo no encontrado', 404);
    res.json({ data: { ...stockCount, ...summarize(stockCount.items) } });
  } catch (error) {
    handleError(req, res, error, 'Error al obtener el conteo');
  }
};

export const createStockCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body ?? {};
    const items = parseCountItems(body.items);
    if (body.note !== undefined && body.note !== null && typeof body.note !== 'string') {
      throw new AppError('La nota debe ser texto', 400);
    }
    const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 300) : null;

    const stockCount = await prisma.$transaction(
      tx => registerStockCount(tx, { note, items }, req.user!.id),
      { timeout: 60_000 },
    );

    res.status(201).json({ data: stockCount, message: 'Conteo registrado' });
  } catch (error) {
    handleError(req, res, error, 'Error al registrar el conteo');
  }
};

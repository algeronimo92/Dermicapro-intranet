import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { AppError, logUnexpectedError } from '../middlewares/errorHandler';
import { parsePurchaseDate } from '../services/inventory/purchases.service';
import {
  parseReturnItems,
  parseReturnReason,
  registerSupplierReturn,
} from '../services/inventory/supplierReturns.service';

const userSummary = { select: { id: true, firstName: true, lastName: true } } as const;

function handleError(req: Request, res: Response, error: unknown, fallback: string) {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }
  logUnexpectedError(req, error);
  res.status(500).json({ error: fallback });
}

function optionalText(value: unknown, field: string, max: number): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new AppError(`${field} debe ser texto`, 400);
  return value.trim().slice(0, max) || null;
}

export const listSupplierReturns = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const where: Prisma.SupplierReturnWhereInput = {};
    if (search) {
      where.OR = [
        { supplierName: { contains: search, mode: 'insensitive' } },
        { note: { contains: search, mode: 'insensitive' } },
        { items: { some: { product: { name: { contains: search, mode: 'insensitive' } } } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.supplierReturn.findMany({
        where,
        include: {
          createdBy: userSummary,
          items: {
            select: { id: true, quantity: true, product: { select: { id: true, name: true, brand: true, presentation: true } } },
            orderBy: { product: { name: 'asc' } },
          },
        },
        orderBy: [{ returnDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.supplierReturn.count({ where }),
    ]);

    res.json({ data, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (error) {
    handleError(req, res, error, 'Error al obtener las devoluciones');
  }
};

export const createSupplierReturn = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body ?? {};
    const items = parseReturnItems(body.items);
    const reason = parseReturnReason(body.reason);
    const returnDate = parsePurchaseDate(body.returnDate, 'devolución');
    const supplierName = optionalText(body.supplierName, 'El proveedor', 150);
    const note = optionalText(body.note, 'La nota', 300);

    const supplierReturn = await prisma.$transaction(
      tx => registerSupplierReturn(tx, { returnDate, reason, supplierName, note, items }, req.user!.id),
      { timeout: 30_000 },
    );

    res.status(201).json({ data: supplierReturn, message: 'Devolución registrada' });
  } catch (error) {
    handleError(req, res, error, 'Error al registrar la devolución');
  }
};

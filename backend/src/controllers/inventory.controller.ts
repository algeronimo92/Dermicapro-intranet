import { Request, Response } from 'express';
import { Prisma, InventoryMovementReason, InventoryMovementType, ProductCategory } from '@prisma/client';
import prisma from '../config/database';
import { AppError, logUnexpectedError } from '../middlewares/errorHandler';

const CATEGORIES = Object.values(ProductCategory);

// Qué motivos valen para cada tipo de movimiento. "initial" sólo se registra al
// crear el producto, nunca a mano.
const REASONS_BY_TYPE: Record<InventoryMovementType, InventoryMovementReason[]> = {
  in: ['purchase', 'adjustment'],
  out: ['sale', 'internal_use', 'loss', 'adjustment'],
};

const userSummary = { select: { id: true, firstName: true, lastName: true } } as const;

function handleError(req: Request, res: Response, error: unknown, fallback: string) {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    res.status(409).json({ error: 'Ya existe un producto con ese código de barras' });
    return;
  }
  logUnexpectedError(req, error);
  res.status(500).json({ error: fallback });
}

function optionalText(value: unknown, field: string, max = 120): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string') throw new AppError(`${field} debe ser texto`, 400);
  const trimmed = value.trim();
  if (trimmed.length > max) throw new AppError(`${field} no puede superar ${max} caracteres`, 400);
  return trimmed || null;
}

function nonNegativeInt(value: unknown, field: string): number {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 0) {
    throw new AppError(`${field} debe ser un número entero mayor o igual a 0`, 400);
  }
  return n;
}

function price(value: unknown): number {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 99999999) {
    throw new AppError('El precio de venta debe ser un número mayor o igual a 0', 400);
  }
  return Math.round(n * 100) / 100;
}

// Campos editables de un producto. El stock no está aquí a propósito: sólo
// cambia registrando un movimiento.
function parseProductInput(body: Record<string, unknown>, creating: boolean) {
  const data: Prisma.ProductUncheckedUpdateInput = {};

  const name = optionalText(body.name, 'El nombre', 150);
  if (creating && !name) throw new AppError('El nombre es requerido', 400);
  if (name === null) throw new AppError('El nombre es requerido', 400);
  if (name !== undefined) data.name = name;

  const brand = optionalText(body.brand, 'La marca', 80);
  if (brand !== undefined) data.brand = brand;

  const presentation = optionalText(body.presentation, 'La presentación', 60);
  if (presentation !== undefined) data.presentation = presentation;

  const barcode = optionalText(body.barcode, 'El código de barras', 64);
  if (barcode !== undefined) data.barcode = barcode;

  if (body.category !== undefined) {
    if (!CATEGORIES.includes(body.category as ProductCategory)) {
      throw new AppError('Categoría no válida', 400);
    }
    data.category = body.category as ProductCategory;
  }

  if (body.salePrice !== undefined) data.salePrice = price(body.salePrice);
  else if (creating) throw new AppError('El precio de venta es requerido', 400);

  if (body.minStock !== undefined) data.minStock = nonNegativeInt(body.minStock, 'El stock mínimo');

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== 'boolean') throw new AppError('isActive debe ser verdadero o falso', 400);
    data.isActive = body.isActive;
  }

  return data;
}

// ============================================
// Productos
// ============================================

export const listProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 24));
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const { category, brand } = req.query;

    const where: Prisma.ProductWhereInput = {};
    if (req.query.includeInactive !== 'true') where.isActive = true;
    if (typeof category === 'string' && CATEGORIES.includes(category as ProductCategory)) {
      where.category = category as ProductCategory;
    }
    if (typeof brand === 'string' && brand) where.brand = brand;
    if (req.query.lowStock === 'true') where.stock = { lte: prisma.product.fields.minStock };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { presentation: { contains: search, mode: 'insensitive' } },
        { barcode: search },
      ];
    }

    const [data, total, lowStockCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: [{ brand: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
      prisma.product.count({ where: { isActive: true, stock: { lte: prisma.product.fields.minStock } } }),
    ]);

    res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit), lowStockCount });
  } catch (error) {
    handleError(req, res, error, 'Error al obtener productos');
  }
};

export const listBrands = async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = await prisma.product.findMany({
      where: { brand: { not: null } },
      distinct: ['brand'],
      select: { brand: true },
      orderBy: { brand: 'asc' },
    });
    res.json({ data: rows.map(r => r.brand) });
  } catch (error) {
    handleError(req, res, error, 'Error al obtener marcas');
  }
};

export const getProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { createdBy: userSummary },
    });
    if (!product) throw new AppError('Producto no encontrado', 404);
    res.json({ data: product });
  } catch (error) {
    handleError(req, res, error, 'Error al obtener el producto');
  }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = parseProductInput(req.body ?? {}, true);
    const initialStock = req.body?.initialStock === undefined || req.body?.initialStock === ''
      ? 0
      : nonNegativeInt(req.body.initialStock, 'El stock inicial');
    const userId = req.user!.id;

    // Producto y su movimiento de inventario inicial en una sola transacción:
    // el historial arranca cuadrado con el stock.
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          ...(data as Prisma.ProductUncheckedCreateInput),
          stock: initialStock,
          createdById: userId,
        },
      });
      if (initialStock > 0) {
        await tx.inventoryMovement.create({
          data: {
            productId: created.id,
            type: 'in',
            reason: 'initial',
            quantity: initialStock,
            stockAfter: initialStock,
            createdById: userId,
          },
        });
      }
      return created;
    });

    res.status(201).json({ data: product, message: 'Producto creado' });
  } catch (error) {
    handleError(req, res, error, 'Error al crear el producto');
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.body?.stock !== undefined) {
      throw new AppError('El stock no se edita directamente: registra un movimiento de entrada, salida o ajuste', 400);
    }
    const existing = await prisma.product.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!existing) throw new AppError('Producto no encontrado', 404);

    const data = parseProductInput(req.body ?? {}, false);
    const product = await prisma.product.update({ where: { id: req.params.id }, data });
    res.json({ data: product, message: 'Producto actualizado' });
  } catch (error) {
    handleError(req, res, error, 'Error al actualizar el producto');
  }
};

export const uploadProductPhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) throw new AppError('No se proporcionó ninguna imagen', 400);
    const existing = await prisma.product.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!existing) throw new AppError('Producto no encontrado', 404);

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { photoUrl: `/uploads/${req.file.filename}` },
    });
    res.json({ data: product, message: 'Foto actualizada' });
  } catch (error) {
    handleError(req, res, error, 'Error al subir la foto');
  }
};

// ============================================
// Movimientos
// ============================================

export const listMovements = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const where: Prisma.InventoryMovementWhereInput = { productId: req.params.id };

    const [data, total] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where,
        include: { createdBy: userSummary },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.inventoryMovement.count({ where }),
    ]);

    res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    handleError(req, res, error, 'Error al obtener los movimientos');
  }
};

export const createMovement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, reason } = req.body ?? {};
    if (type !== 'in' && type !== 'out') throw new AppError('El tipo debe ser entrada o salida', 400);
    if (!REASONS_BY_TYPE[type as InventoryMovementType].includes(reason)) {
      throw new AppError('Motivo no válido para este tipo de movimiento', 400);
    }
    const quantity = nonNegativeInt(req.body.quantity, 'La cantidad');
    if (quantity === 0) throw new AppError('La cantidad debe ser mayor a 0', 400);
    const note = optionalText(req.body.note, 'La nota', 300) ?? null;
    const productId = req.params.id;
    const userId = req.user!.id;

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId }, select: { id: true } });
      if (!product) throw new AppError('Producto no encontrado', 404);

      // Actualización condicional: dos salidas simultáneas no pueden dejar el
      // stock en negativo, porque la segunda ya no cumple stock >= quantity.
      const updated = await tx.product.updateMany({
        where: type === 'out' ? { id: productId, stock: { gte: quantity } } : { id: productId },
        data: { stock: type === 'out' ? { decrement: quantity } : { increment: quantity } },
      });
      if (updated.count === 0) {
        const { stock } = await tx.product.findUniqueOrThrow({ where: { id: productId }, select: { stock: true } });
        throw new AppError(`Stock insuficiente: hay ${stock} unidad(es) disponibles`, 400);
      }

      const { stock: stockAfter } = await tx.product.findUniqueOrThrow({
        where: { id: productId }, select: { stock: true },
      });
      const movement = await tx.inventoryMovement.create({
        data: { productId, type, reason, quantity, stockAfter, note, createdById: userId },
        include: { createdBy: userSummary },
      });
      return { movement, stock: stockAfter };
    });

    res.status(201).json({ data: result, message: 'Movimiento registrado' });
  } catch (error) {
    handleError(req, res, error, 'Error al registrar el movimiento');
  }
};

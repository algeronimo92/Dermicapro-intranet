import { Request, Response } from 'express';
import { Prisma, ProductCategory } from '@prisma/client';
import prisma from '../config/database';
import { AppError, logUnexpectedError } from '../middlewares/errorHandler';
import { purchaseDbError } from '../services/inventory/purchases.service';
import { getDailyStock, parseFlowRange } from '../services/inventory/stockFlow.service';

// El inventario es sólo inventario: el stock cambia por compras, devoluciones
// al proveedor y conteos, nunca a mano ni por ventas.

const CATEGORIES = Object.values(ProductCategory);
const MAX_ALERT_ROWS = 500;

const userSummary = { select: { id: true, firstName: true, lastName: true } } as const;

function handleError(req: Request, res: Response, error: unknown, fallback: string) {
  const known = purchaseDbError(error);
  if (known) error = known;
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
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > 1_000_000) {
    throw new AppError(`${field} debe ser un número entero mayor o igual a 0`, 400);
  }
  return n;
}

/** Stock objetivo: vacío = sin objetivo (la lista de compras no sugiere cantidad). */
function optionalTarget(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return nonNegativeInt(value, 'El stock objetivo');
}

function checkAlertRange(minStock: number, targetStock: number | null) {
  if (targetStock !== null && targetStock < minStock) {
    throw new AppError('El stock objetivo no puede ser menor que el stock mínimo', 400);
  }
}

function price(value: unknown): number {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 99999999) {
    throw new AppError('El precio de venta debe ser un número mayor o igual a 0', 400);
  }
  return Math.round(n * 100) / 100;
}

// Campos editables de un producto. El stock no está aquí a propósito: sólo
// cambia con compras, devoluciones o conteos.
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
  const target = optionalTarget(body.targetStock);
  if (target !== undefined) data.targetStock = target;

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

/**
 * Crea la ficha de un producto, siempre con stock 0. Productos es sólo el
 * catálogo: el stock entra por Compras (con su factura) o por un conteo de
 * inventario, nunca al crear la ficha.
 */
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body ?? {};
    if (body.initialStock !== undefined || body.stock !== undefined || body.invoiceId !== undefined) {
      throw new AppError('El producto se crea sin stock: regístralo con una compra o un conteo de inventario', 400);
    }
    const data = parseProductInput(body, true);
    checkAlertRange((data.minStock as number | undefined) ?? 0, (data.targetStock as number | null | undefined) ?? null);

    const product = await prisma.product.create({
      data: { ...(data as Prisma.ProductUncheckedCreateInput), stock: 0, createdById: req.user!.id },
    });

    res.status(201).json({ data: product, message: 'Producto creado' });
  } catch (error) {
    handleError(req, res, error, 'Error al crear el producto');
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.body?.stock !== undefined) {
      throw new AppError('El stock no se edita directamente: registra una compra, una devolución o un conteo', 400);
    }
    const existing = await prisma.product.findUnique({
      where: { id: req.params.id }, select: { id: true, minStock: true, targetStock: true },
    });
    if (!existing) throw new AppError('Producto no encontrado', 404);

    const data = parseProductInput(req.body ?? {}, false);
    checkAlertRange(
      (data.minStock as number | undefined) ?? existing.minStock,
      data.targetStock !== undefined ? (data.targetStock as number | null) : existing.targetStock,
    );
    const product = await prisma.product.update({ where: { id: req.params.id }, data });
    res.json({ data: product, message: 'Producto actualizado' });
  } catch (error) {
    handleError(req, res, error, 'Error al actualizar el producto');
  }
};

/** Alertas de stock en lote: mínimo y objetivo de varios productos a la vez. */
export const updateStockAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = req.body?.rows;
    if (!Array.isArray(rows) || rows.length === 0) throw new AppError('No hay alertas para guardar', 400);
    if (rows.length > MAX_ALERT_ROWS) throw new AppError(`Máximo ${MAX_ALERT_ROWS} productos por vez`, 400);
    const seen = new Set<string>();
    const parsed = rows.map((raw: unknown, i: number) => {
      const row = (raw ?? {}) as Record<string, unknown>;
      const position = i + 1;
      if (typeof row.productId !== 'string' || !row.productId) throw new AppError(`Fila ${position}: falta el producto`, 400);
      if (seen.has(row.productId)) throw new AppError(`Fila ${position}: el producto está repetido`, 400);
      seen.add(row.productId);
      const minStock = nonNegativeInt(row.minStock, `Fila ${position}: el stock mínimo`);
      const targetStock = optionalTarget(row.targetStock) ?? null;
      if (targetStock !== null && targetStock < minStock) {
        throw new AppError(`Fila ${position}: el objetivo no puede ser menor que el mínimo`, 400);
      }
      return { productId: row.productId, minStock, targetStock };
    });

    const updated = await prisma.$transaction(async (tx) => {
      let count = 0;
      for (const row of parsed) {
        const result = await tx.product.updateMany({
          where: { id: row.productId },
          data: { minStock: row.minStock, targetStock: row.targetStock },
        });
        if (result.count === 0) throw new AppError('Uno de los productos ya no existe', 404);
        count += result.count;
      }
      return count;
    });

    res.json({ data: { updated }, message: `Alertas actualizadas en ${updated} producto(s)` });
  } catch (error) {
    handleError(req, res, error, 'Error al guardar las alertas');
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
// Historial (sólo lectura)
// ============================================

export const listMovements = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const where: Prisma.InventoryMovementWhereInput = { productId: req.params.id };
    // De qué compra salió cada entrada, sólo para quien puede ver compras
    // (si no, la consulta a purchase_items fallaría por privilegios).
    const withPurchase = Boolean(req.moduleAccess?.inventory.purchases);
    const withReturn = Boolean(req.moduleAccess?.inventory.returns);
    const withCount = Boolean(req.moduleAccess?.inventory.counts);

    const [data, total] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where,
        include: {
          createdBy: userSummary,
          ...(withPurchase && { purchaseItem: { select: { purchaseId: true } } }),
          ...(withReturn && { supplierReturnItem: { select: { supplierReturn: { select: { reason: true } } } } }),
          ...(withCount && { stockCountItem: { select: { countId: true } } }),
        },
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

// ============================================
// Resumen: stock diario de un producto
// ============================================

export const dailyStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const productId = typeof req.query.productId === 'string' ? req.query.productId : '';
    if (!productId) throw new AppError('Elige un producto', 400);
    const range = parseFlowRange(req.query.from, req.query.to);
    res.json({ data: await getDailyStock(range, productId) });
  } catch (error) {
    handleError(req, res, error, 'Error al obtener el stock diario');
  }
};

import { Prisma } from '@prisma/client';
import { AppError } from '../../middlewares/errorHandler';

export const MAX_COUNT_ITEMS = 1000;
export const MAX_COUNTED = 1_000_000;

export interface StockCountItemInput {
  productId: string;
  /** El stock que la persona vio en pantalla al contar. */
  expectedStock: number;
  countedStock: number;
}

/** Producto cuyo stock cambió entre que se cargó la pantalla y se guardó el conteo. */
export interface StockCountConflict {
  productId: string;
  name: string;
  stock: number;
}

/** El stock cambió mientras se contaba: hay que revisar esas filas y volver a guardar. */
export class StockCountConflictError extends AppError {
  constructor(public readonly conflicts: StockCountConflict[]) {
    super(
      conflicts.length === 1
        ? `El stock de «${conflicts[0].name}» cambió mientras contabas. Revísalo y vuelve a guardar.`
        : `El stock de ${conflicts.length} productos cambió mientras contabas. Revísalos y vuelve a guardar.`,
      409,
    );
  }
}

function count(value: unknown, field: string): number {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > MAX_COUNTED) {
    throw new AppError(`${field} debe ser un entero mayor o igual a 0`, 400);
  }
  return n;
}

export function parseCountItems(value: unknown): StockCountItemInput[] {
  if (!Array.isArray(value) || value.length === 0) throw new AppError('Cuenta al menos un producto', 400);
  if (value.length > MAX_COUNT_ITEMS) throw new AppError(`Máximo ${MAX_COUNT_ITEMS} productos por conteo`, 400);
  const seen = new Set<string>();
  return value.map((raw, i) => {
    const position = i + 1;
    const item = (raw ?? {}) as Record<string, unknown>;
    if (typeof item.productId !== 'string' || !item.productId) throw new AppError(`Fila ${position}: falta el producto`, 400);
    if (seen.has(item.productId)) throw new AppError(`Fila ${position}: el producto está repetido`, 400);
    seen.add(item.productId);
    return {
      productId: item.productId,
      expectedStock: count(item.expectedStock, `Fila ${position}: el stock del sistema`),
      countedStock: count(item.countedStock, `Fila ${position}: lo contado`),
    };
  });
}

/**
 * Registra un conteo dentro de una transacción. Por cada producto guarda lo
 * esperado y lo contado; si difieren, fija el stock en lo contado y deja un
 * "Ajuste por conteo" (entrada o salida por la diferencia) ligado a la línea.
 *
 * Si el stock de algún producto ya no es el que la persona vio (entró una
 * compra mientras contaba, por ejemplo), no guarda nada y devuelve los
 * productos en conflicto para revisarlos: ajustar sobre un número viejo
 * borraría ese movimiento.
 */
export async function registerStockCount(
  tx: Prisma.TransactionClient,
  input: { note: string | null; items: StockCountItemInput[] },
  userId: string,
) {
  const ids = input.items.map(i => i.productId);
  // Bloquea las filas hasta el commit: nadie mueve ese stock mientras se ajusta.
  const locked = await tx.$queryRaw<{ id: string; name: string; stock: number }[]>`
    SELECT id, name, stock FROM products WHERE id IN (${Prisma.join(ids)}) FOR UPDATE`;
  if (locked.length !== ids.length) throw new AppError('Uno de los productos ya no existe', 404);
  const current = new Map(locked.map(p => [p.id, p]));

  const conflicts = input.items
    .map(item => current.get(item.productId)!)
    .filter((p, i) => p.stock !== input.items[i].expectedStock)
    .map(p => ({ productId: p.id, name: p.name, stock: p.stock }));
  if (conflicts.length) throw new StockCountConflictError(conflicts);

  const stockCount = await tx.stockCount.create({ data: { note: input.note, createdById: userId } });

  for (const item of input.items) {
    const line = await tx.stockCountItem.create({
      data: {
        countId: stockCount.id,
        productId: item.productId,
        expectedStock: item.expectedStock,
        countedStock: item.countedStock,
      },
      select: { id: true },
    });
    const difference = item.countedStock - item.expectedStock;
    if (difference === 0) continue;
    await tx.product.update({ where: { id: item.productId }, data: { stock: item.countedStock } });
    await tx.inventoryMovement.create({
      data: {
        productId: item.productId,
        type: difference > 0 ? 'in' : 'out',
        reason: 'adjustment',
        quantity: Math.abs(difference),
        stockAfter: item.countedStock,
        note: input.note,
        createdById: userId,
        stockCountItemId: line.id,
      },
    });
  }

  return stockCount;
}

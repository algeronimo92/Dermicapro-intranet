import { Prisma, SupplierReturnReason } from '@prisma/client';
import { AppError } from '../../middlewares/errorHandler';
import { parsePurchaseItems, type PurchaseItemInput } from './purchases.service';

export const RETURN_REASONS = Object.values(SupplierReturnReason);

export interface SupplierReturnInput {
  returnDate: Date;
  reason: SupplierReturnReason;
  supplierName: string | null;
  note: string | null;
  items: PurchaseItemInput[];
}

export function parseReturnReason(value: unknown): SupplierReturnReason {
  if (!RETURN_REASONS.includes(value as SupplierReturnReason)) {
    throw new AppError('Elige el motivo de la devolución', 400);
  }
  return value as SupplierReturnReason;
}

/** Mismas reglas que las líneas de una compra (enteros >= 1, sin repetidos). */
export function parseReturnItems(value: unknown): PurchaseItemInput[] {
  if (!Array.isArray(value) || value.length === 0) throw new AppError('Agrega al menos un producto a devolver', 400);
  return parsePurchaseItems(value);
}

/**
 * Registra una devolución al proveedor dentro de una transacción: la
 * devolución, sus líneas, resta el stock de cada producto y deja una salida
 * "Devolución al proveedor" ligada a cada línea.
 *
 * El stock no puede quedar negativo: se resta sólo si alcanza (y la base lo
 * garantiza también con stock_after >= 0).
 */
export async function registerSupplierReturn(
  tx: Prisma.TransactionClient,
  input: SupplierReturnInput,
  userId: string,
) {
  if (input.reason === 'other' && !input.note) {
    throw new AppError('Con el motivo «Otro», explica en la nota por qué se devuelve', 400);
  }

  const products = await tx.product.findMany({
    where: { id: { in: input.items.map(i => i.productId) } },
    select: { id: true, name: true },
  });
  if (products.length !== input.items.length) throw new AppError('Uno de los productos ya no existe', 404);
  const names = new Map(products.map(p => [p.id, p.name]));

  const supplierReturn = await tx.supplierReturn.create({
    data: {
      returnDate: input.returnDate,
      reason: input.reason,
      supplierName: input.supplierName,
      note: input.note,
      createdById: userId,
    },
  });

  for (const item of input.items) {
    // Resta sólo si hay stock suficiente; la fila queda bloqueada hasta el commit.
    const { count } = await tx.product.updateMany({
      where: { id: item.productId, stock: { gte: item.quantity } },
      data: { stock: { decrement: item.quantity } },
    });
    if (count === 0) {
      throw new AppError(`No hay stock suficiente de «${names.get(item.productId)}» para devolver ${item.quantity}`, 409);
    }
    const { stock } = await tx.product.findUniqueOrThrow({ where: { id: item.productId }, select: { stock: true } });
    const line = await tx.supplierReturnItem.create({
      data: { returnId: supplierReturn.id, productId: item.productId, quantity: item.quantity },
      select: { id: true },
    });
    await tx.inventoryMovement.create({
      data: {
        productId: item.productId,
        type: 'out',
        reason: 'supplier_return',
        quantity: item.quantity,
        stockAfter: stock,
        note: input.note,
        createdById: userId,
        supplierReturnItemId: line.id,
      },
    });
  }

  return supplierReturn;
}

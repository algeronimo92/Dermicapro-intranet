import { Prisma } from '@prisma/client';
import { AppError } from '../../middlewares/errorHandler';

export const MAX_PURCHASE_ITEMS = 200;
export const MAX_ITEM_QUANTITY = 100_000;

export interface PurchaseItemInput {
  productId: string;
  quantity: number;
}

export interface PurchaseInput {
  purchaseDate: Date;
  invoiceId: string | null;
  note: string | null;
  items: PurchaseItemInput[];
}

/** Fecha 'YYYY-MM-DD' (sin hora) y no futura. */
export function parsePurchaseDate(value: unknown): Date {
  if (value === undefined || value === null || value === '') {
    const today = new Date();
    return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  }
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError('Ingresa una fecha de compra válida', 400);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new AppError('Ingresa una fecha de compra válida', 400);
  }
  // Un día de margen por la zona horaria de la clínica.
  if (date.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
    throw new AppError('La fecha de compra no puede ser futura', 400);
  }
  return date;
}

export function parsePurchaseItems(value: unknown): PurchaseItemInput[] {
  if (!Array.isArray(value) || value.length === 0) throw new AppError('Agrega al menos un producto a la compra', 400);
  if (value.length > MAX_PURCHASE_ITEMS) throw new AppError(`Máximo ${MAX_PURCHASE_ITEMS} productos por compra`, 400);
  const seen = new Set<string>();
  return value.map((raw, i) => {
    const position = i + 1;
    const item = (raw ?? {}) as Record<string, unknown>;
    if (typeof item.productId !== 'string' || !item.productId) throw new AppError(`Línea ${position}: falta el producto`, 400);
    if (seen.has(item.productId)) throw new AppError(`Línea ${position}: el producto está repetido`, 400);
    seen.add(item.productId);
    const quantity = typeof item.quantity === 'string' && item.quantity.trim() !== '' ? Number(item.quantity) : item.quantity;
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
      throw new AppError(`Línea ${position}: la cantidad debe ser un entero entre 1 y ${MAX_ITEM_QUANTITY}`, 400);
    }
    return { productId: item.productId, quantity };
  });
}

/**
 * Registra una compra dentro de una transacción: la compra, sus líneas, suma
 * el stock de cada producto y deja una entrada "Compra" ligada a cada línea.
 *
 * La factura (si hay) debe ser de Productos y no estar ligada a otra compra;
 * la base lo garantiza también (trigger y unique), esto sólo da un mensaje claro.
 */
export async function registerPurchase(
  tx: Prisma.TransactionClient,
  input: PurchaseInput,
  userId: string,
) {
  if (input.invoiceId) {
    const invoice = await tx.registeredInvoice.findUnique({
      where: { id: input.invoiceId },
      select: { category: true, purchase: { select: { id: true } } },
    });
    if (!invoice) throw new AppError('La factura no existe o no tienes acceso a ella', 404);
    if (invoice.category !== 'products') throw new AppError('La factura debe ser de tipo Productos', 400);
    if (invoice.purchase) throw new AppError('Esa factura ya está ligada a otra compra', 409);
  }

  const products = await tx.product.findMany({
    where: { id: { in: input.items.map(i => i.productId) } },
    select: { id: true },
  });
  if (products.length !== input.items.length) throw new AppError('Uno de los productos ya no existe', 404);

  const purchase = await tx.purchase.create({
    data: {
      purchaseDate: input.purchaseDate,
      invoiceId: input.invoiceId,
      note: input.note,
      createdById: userId,
    },
  });

  for (const item of input.items) {
    const line = await tx.purchaseItem.create({
      data: { purchaseId: purchase.id, productId: item.productId, quantity: item.quantity },
      select: { id: true },
    });
    // update devuelve el stock ya sumado; la fila queda bloqueada hasta el
    // commit, así que stockAfter es exacto aunque haya otra compra en paralelo.
    const { stock } = await tx.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
      select: { stock: true },
    });
    await tx.inventoryMovement.create({
      data: {
        productId: item.productId,
        type: 'in',
        reason: 'purchase',
        quantity: item.quantity,
        stockAfter: stock,
        note: input.note,
        createdById: userId,
        purchaseItemId: line.id,
      },
    });
  }

  return purchase;
}

/** Traduce los errores de la base propios de compras a mensajes para la persona. */
export function purchaseDbError(error: unknown): AppError | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    const target = String((error.meta as { target?: unknown } | undefined)?.target ?? '');
    if (target.includes('invoice')) return new AppError('Esa factura ya está ligada a otra compra', 409);
  }
  const message = error instanceof Error ? error.message : '';
  if (message.includes('INVOICE_NOT_PRODUCTS')) return new AppError('La factura debe ser de tipo Productos', 400);
  return null;
}

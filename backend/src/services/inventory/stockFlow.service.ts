import { InventoryMovementReason, InventoryMovementType } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../middlewares/errorHandler';
import { CLINIC_UTC_OFFSET_MINUTES } from '../../utils/dateUtils';

export const MAX_FLOW_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;
const OFFSET_MS = CLINIC_UTC_OFFSET_MINUTES * 60 * 1000;

export interface FlowDay {
  date: string; // YYYY-MM-DD en hora de la clínica
  in: number;
  out: number;
  /** Stock al cierre del día. */
  stock: number;
}

export interface FlowReasonTotal {
  reason: InventoryMovementReason;
  type: InventoryMovementType;
  quantity: number;
}

export interface FlowTopProduct {
  productId: string;
  name: string;
  in: number;
  out: number;
}

export interface StockFlow {
  from: string;
  to: string;
  productId: string | null;
  startStock: number;
  endStock: number;
  totalIn: number;
  totalOut: number;
  days: FlowDay[];
  byReason: FlowReasonTotal[];
  topProducts: FlowTopProduct[];
}

/** Día 'YYYY-MM-DD' de la clínica -> instante UTC en que empieza. */
function dayStart(day: string): Date {
  return new Date(new Date(`${day}T00:00:00.000Z`).getTime() - OFFSET_MS);
}

/** Instante -> día 'YYYY-MM-DD' en hora de la clínica. */
export function clinicDay(date: Date): string {
  return new Date(date.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

function parseDay(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new AppError(`${field} no es válida`, 400);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new AppError(`${field} no es válida`, 400);
  return value;
}

/** Rango del dashboard: por defecto, los últimos 30 días hasta hoy. */
export function parseFlowRange(fromRaw: unknown, toRaw: unknown, now = new Date()): { from: string; to: string } {
  const today = clinicDay(now);
  const to = toRaw ? parseDay(toRaw, 'La fecha final') : today;
  const from = fromRaw
    ? parseDay(fromRaw, 'La fecha inicial')
    : clinicDay(new Date(dayStart(to).getTime() - 29 * DAY_MS));
  if (from > to) throw new AppError('La fecha inicial no puede ser posterior a la final', 400);
  const days = Math.round((dayStart(to).getTime() - dayStart(from).getTime()) / DAY_MS) + 1;
  if (days > MAX_FLOW_DAYS) throw new AppError(`El rango no puede superar ${MAX_FLOW_DAYS} días`, 400);
  return { from, to };
}

const signed = (type: InventoryMovementType, quantity: number) => (type === 'in' ? quantity : -quantity);

/**
 * Flujo de stock por día: entradas, salidas y stock al cierre de cada día, de
 * un producto o de todo el inventario.
 *
 * El stock al cierre se reconstruye hacia atrás desde el stock actual,
 * descontando los movimientos posteriores: como el stock sólo cambia con un
 * movimiento, el resultado es exacto aunque el producto tenga historial viejo.
 */
export async function getStockFlow(range: { from: string; to: string }, productId: string | null): Promise<StockFlow> {
  const start = dayStart(range.from);
  const end = new Date(dayStart(range.to).getTime() + DAY_MS);
  const productWhere = productId ? { productId } : {};

  let currentStock: number;
  if (productId) {
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { stock: true } });
    if (!product) throw new AppError('Producto no encontrado', 404);
    currentStock = product.stock;
  } else {
    const { _sum } = await prisma.product.aggregate({ _sum: { stock: true } });
    currentStock = _sum.stock ?? 0;
  }

  const [movements, after] = await Promise.all([
    prisma.inventoryMovement.findMany({
      where: { ...productWhere, createdAt: { gte: start, lt: end } },
      select: { productId: true, type: true, reason: true, quantity: true, createdAt: true },
    }),
    prisma.inventoryMovement.groupBy({
      by: ['type'],
      where: { ...productWhere, createdAt: { gte: end } },
      _sum: { quantity: true },
    }),
  ]);

  const netAfter = after.reduce((sum, row) => sum + signed(row.type, row._sum.quantity ?? 0), 0);
  const endStock = currentStock - netAfter;

  // Un registro por día del rango, aunque no haya movimientos.
  const days: FlowDay[] = [];
  for (let t = start.getTime(); t < end.getTime(); t += DAY_MS) {
    days.push({ date: clinicDay(new Date(t)), in: 0, out: 0, stock: 0 });
  }
  const byDay = new Map(days.map(d => [d.date, d]));
  const reasons = new Map<string, FlowReasonTotal>();
  const perProduct = new Map<string, { in: number; out: number }>();

  for (const m of movements) {
    const day = byDay.get(clinicDay(m.createdAt));
    if (day) day[m.type] += m.quantity;
    const key = `${m.reason}:${m.type}`;
    const total = reasons.get(key) ?? { reason: m.reason, type: m.type, quantity: 0 };
    total.quantity += m.quantity;
    reasons.set(key, total);
    const product = perProduct.get(m.productId) ?? { in: 0, out: 0 };
    product[m.type] += m.quantity;
    perProduct.set(m.productId, product);
  }

  let stock = endStock;
  for (let i = days.length - 1; i >= 0; i--) {
    days[i].stock = stock;
    stock -= days[i].in - days[i].out;
  }

  let topProducts: FlowTopProduct[] = [];
  if (!productId && perProduct.size) {
    const top = [...perProduct.entries()]
      .sort(([, a], [, b]) => (b.in + b.out) - (a.in + a.out))
      .slice(0, 5);
    const names = await prisma.product.findMany({
      where: { id: { in: top.map(([id]) => id) } },
      select: { id: true, name: true },
    });
    const nameOf = new Map(names.map(p => [p.id, p.name]));
    topProducts = top.map(([id, totals]) => ({ productId: id, name: nameOf.get(id) ?? '—', ...totals }));
  }

  return {
    ...range,
    productId,
    startStock: stock,
    endStock,
    totalIn: days.reduce((sum, d) => sum + d.in, 0),
    totalOut: days.reduce((sum, d) => sum + d.out, 0),
    days,
    byReason: [...reasons.values()].sort((a, b) => b.quantity - a.quantity),
    topProducts,
  };
}

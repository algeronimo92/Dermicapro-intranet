import prisma from '../../config/database';
import { AppError } from '../../middlewares/errorHandler';
import { CLINIC_UTC_OFFSET_MINUTES } from '../../utils/dateUtils';

export const MAX_FLOW_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;
const OFFSET_MS = CLINIC_UTC_OFFSET_MINUTES * 60 * 1000;

export interface StockDay {
  date: string; // YYYY-MM-DD en hora de la clínica
  /** Stock al cierre del día. */
  stock: number;
}

export interface DailyStock {
  productId: string;
  from: string;
  to: string;
  days: StockDay[];
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

/** Rango del gráfico: por defecto, los últimos 30 días hasta hoy. */
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

/**
 * Stock de un producto al cierre de cada día del rango.
 *
 * Se reconstruye hacia atrás desde el stock actual, deshaciendo los
 * movimientos posteriores a cada día: como el stock sólo cambia con un
 * movimiento, el resultado es exacto.
 */
export async function getDailyStock(range: { from: string; to: string }, productId: string): Promise<DailyStock> {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { stock: true } });
  if (!product) throw new AppError('Producto no encontrado', 404);

  const start = dayStart(range.from);
  const end = new Date(dayStart(range.to).getTime() + DAY_MS);
  const movements = await prisma.inventoryMovement.findMany({
    where: { productId, createdAt: { gte: start } },
    select: { type: true, quantity: true, createdAt: true },
  });

  // Cambio neto de cada día del rango, y lo que cambió después del rango.
  const netByDay = new Map<string, number>();
  let netAfterRange = 0;
  for (const m of movements) {
    const delta = m.type === 'in' ? m.quantity : -m.quantity;
    if (m.createdAt >= end) netAfterRange += delta;
    else {
      const day = clinicDay(m.createdAt);
      netByDay.set(day, (netByDay.get(day) ?? 0) + delta);
    }
  }

  const days: StockDay[] = [];
  for (let t = start.getTime(); t < end.getTime(); t += DAY_MS) days.push({ date: clinicDay(new Date(t)), stock: 0 });

  let stock = product.stock - netAfterRange;
  for (let i = days.length - 1; i >= 0; i--) {
    days[i].stock = stock;
    stock -= netByDay.get(days[i].date) ?? 0;
  }

  return { productId, ...range, days };
}

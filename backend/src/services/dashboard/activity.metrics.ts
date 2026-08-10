import { PrismaClient, Prisma } from '@prisma/client';
import {
  ActivityMetrics,
  DailyActivityPoint,
  WeekdayActivityPoint,
  WeeklyActivityPoint,
} from '../../types/dashboard.types';
import {
  clinicDateKey,
  clinicDayStartUtc,
  clinicTodayKey,
  enumerateDateKeys,
  shiftDateKey,
  weekdayOfDateKey,
  weekStartKey,
} from '../../utils/dateUtils';

type Decimal = Prisma.Decimal;

/** Etiquetas ISO: índice 1 = lunes ... 7 = domingo */
const WEEKDAY_LABELS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** Máximo de puntos en la serie diaria: un año de barras diarias es ilegible */
const MAX_DAILY_POINTS = 92;

/** Días cubiertos por cada período; todos terminan hoy */
const PERIOD_DAYS: Record<string, number> = {
  today: 1,
  week: 7,
  month: 30,
  year: 365,
};

/** Acumulador mutable por día antes de convertirse en DailyActivityPoint */
interface DayBucket {
  sold: number;
  collected: number;
  salesCount: number;
  scheduled: number;
  attended: number;
  noShow: number;
}

const emptyBucket = (): DayBucket => ({
  sold: 0,
  collected: 0,
  salesCount: 0,
  scheduled: 0,
  attended: 0,
  noShow: 0,
});

const toNumber = (value: Decimal | null | undefined): number =>
  value ? parseFloat(value.toString()) : 0;

const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Métricas de ritmo del negocio: ventas diarias y semanales, citas agendadas
 * vs. atendidas por día, y el patrón por día de la semana.
 *
 * Todo se agrupa en hora de la clínica (America/Lima, UTC-5), no en UTC: de lo
 * contrario las operaciones posteriores a las 19:00 caerían en el día siguiente.
 */
export class ActivityMetricsService {
  constructor(private prisma: PrismaClient) {}

  async getActivity(period?: string): Promise<ActivityMetrics> {
    const todayKey = clinicTodayKey();
    const periodDays = PERIOD_DAYS[period ?? 'month'] ?? PERIOD_DAYS.month;
    const startKey = shiftDateKey(todayKey, -(periodDays - 1));

    // Rango UTC alineado a los límites del día en la clínica. El fin es
    // exclusivo e incluye el día de hoy completo, para que las citas ya
    // agendadas para más tarde también cuenten como "agendadas hoy".
    const rangeStart = clinicDayStartUtc(startKey);
    const rangeEnd = clinicDayStartUtc(shiftDateKey(todayKey, 1));

    const [serviceInstances, payments, appointments] = await Promise.all([
      this.prisma.serviceInstance.findMany({
        where: { createdAt: { gte: rangeStart, lt: rangeEnd } },
        select: { createdAt: true, finalPrice: true },
      }),
      this.prisma.payment.findMany({
        where: {
          paymentDate: { gte: rangeStart, lt: rangeEnd },
          voidedAt: null,
        },
        select: { paymentDate: true, amountPaid: true },
      }),
      this.prisma.appointment.findMany({
        where: { scheduledDate: { gte: rangeStart, lt: rangeEnd } },
        select: { scheduledDate: true, status: true },
      }),
    ]);

    // Un bucket por día del rango, incluidos los días sin actividad, para que
    // los gráficos muestren los huecos en lugar de comprimirlos.
    const dayKeys = enumerateDateKeys(startKey, todayKey);
    const buckets = new Map<string, DayBucket>(
      dayKeys.map((key) => [key, emptyBucket()])
    );

    for (const instance of serviceInstances) {
      const bucket = buckets.get(clinicDateKey(instance.createdAt));
      if (!bucket) continue;
      bucket.sold += toNumber(instance.finalPrice);
      bucket.salesCount += 1;
    }

    for (const payment of payments) {
      const bucket = buckets.get(clinicDateKey(payment.paymentDate));
      if (!bucket) continue;
      bucket.collected += toNumber(payment.amountPaid);
    }

    for (const appointment of appointments) {
      const bucket = buckets.get(clinicDateKey(appointment.scheduledDate));
      if (!bucket) continue;
      // Las canceladas no cuentan como agendadas: nunca ocuparon la agenda
      if (appointment.status === 'cancelled') continue;
      bucket.scheduled += 1;
      if (appointment.status === 'attended') bucket.attended += 1;
      if (appointment.status === 'no_show') bucket.noShow += 1;
    }

    const daily = this.buildDaily(dayKeys, buckets);
    const weekly = this.buildWeekly(dayKeys, buckets);
    const byWeekday = this.buildByWeekday(dayKeys, buckets);
    const summary = this.buildSummary(dayKeys, buckets, byWeekday, todayKey);

    return { daily, weekly, byWeekday, summary };
  }

  /**
   * Serie diaria, recortada a los últimos MAX_DAILY_POINTS días del período.
   * Las series semanal y por día de la semana sí cubren el período completo.
   */
  private buildDaily(
    dayKeys: string[],
    buckets: Map<string, DayBucket>
  ): DailyActivityPoint[] {
    return dayKeys.slice(-MAX_DAILY_POINTS).map((date) => {
      const bucket = buckets.get(date)!;
      return {
        date,
        sold: round2(bucket.sold),
        collected: round2(bucket.collected),
        salesCount: bucket.salesCount,
        scheduled: bucket.scheduled,
        attended: bucket.attended,
        noShow: bucket.noShow,
      };
    });
  }

  /** Agrupa los días en semanas ISO (lunes a domingo) */
  private buildWeekly(
    dayKeys: string[],
    buckets: Map<string, DayBucket>
  ): WeeklyActivityPoint[] {
    const weeks = new Map<string, WeeklyActivityPoint>();

    for (const date of dayKeys) {
      const bucket = buckets.get(date)!;
      const start = weekStartKey(date);

      let week = weeks.get(start);
      if (!week) {
        week = {
          weekStart: start,
          weekEnd: shiftDateKey(start, 6),
          sold: 0,
          collected: 0,
          salesCount: 0,
          scheduled: 0,
          attended: 0,
        };
        weeks.set(start, week);
      }

      week.sold += bucket.sold;
      week.collected += bucket.collected;
      week.salesCount += bucket.salesCount;
      week.scheduled += bucket.scheduled;
      week.attended += bucket.attended;
    }

    return Array.from(weeks.values())
      .map((week) => ({
        ...week,
        sold: round2(week.sold),
        collected: round2(week.collected),
      }))
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  }

  /**
   * Patrón por día de la semana. Devuelve totales y promedios: como el período
   * casi nunca contiene el mismo número de lunes que de domingos, comparar
   * totales crudos entre días sería engañoso.
   */
  private buildByWeekday(
    dayKeys: string[],
    buckets: Map<string, DayBucket>
  ): WeekdayActivityPoint[] {
    const totals = new Map<number, WeekdayActivityPoint>();

    for (let weekday = 1; weekday <= 7; weekday++) {
      totals.set(weekday, {
        weekday,
        label: WEEKDAY_LABELS[weekday],
        sold: 0,
        collected: 0,
        scheduled: 0,
        attended: 0,
        occurrences: 0,
        avgSold: 0,
        avgScheduled: 0,
        avgAttended: 0,
      });
    }

    for (const date of dayKeys) {
      const bucket = buckets.get(date)!;
      const entry = totals.get(weekdayOfDateKey(date))!;
      entry.sold += bucket.sold;
      entry.collected += bucket.collected;
      entry.scheduled += bucket.scheduled;
      entry.attended += bucket.attended;
      entry.occurrences += 1;
    }

    return Array.from(totals.values()).map((entry) => {
      const divisor = entry.occurrences || 1;
      return {
        ...entry,
        sold: round2(entry.sold),
        collected: round2(entry.collected),
        avgSold: round2(entry.sold / divisor),
        avgScheduled: round2(entry.scheduled / divisor),
        avgAttended: round2(entry.attended / divisor),
      };
    });
  }

  private buildSummary(
    dayKeys: string[],
    buckets: Map<string, DayBucket>,
    byWeekday: WeekdayActivityPoint[],
    todayKey: string
  ): ActivityMetrics['summary'] {
    const today = buckets.get(todayKey) ?? emptyBucket();

    // Semana en curso: del lunes a hoy, recortada al período si este es menor
    const currentWeekStart = weekStartKey(todayKey);
    const weekKeys = dayKeys.filter((key) => key >= currentWeekStart);

    const sum = (keys: string[], pick: (bucket: DayBucket) => number) =>
      keys.reduce((total, key) => total + pick(buckets.get(key)!), 0);

    const periodSold = sum(dayKeys, (b) => b.sold);
    const periodScheduled = sum(dayKeys, (b) => b.scheduled);
    const periodAttended = sum(dayKeys, (b) => b.attended);

    const withSales = byWeekday.filter((entry) => entry.occurrences > 0);
    const bestWeekday = withSales.length
      ? withSales.reduce((best, entry) =>
          entry.avgSold > best.avgSold ? entry : best
        )
      : null;

    return {
      todaySold: round2(today.sold),
      todayCollected: round2(today.collected),
      todayScheduled: today.scheduled,
      todayAttended: today.attended,
      weekSold: round2(sum(weekKeys, (b) => b.sold)),
      weekCollected: round2(sum(weekKeys, (b) => b.collected)),
      weekScheduled: sum(weekKeys, (b) => b.scheduled),
      weekAttended: sum(weekKeys, (b) => b.attended),
      avgDailySold: round2(periodSold / (dayKeys.length || 1)),
      avgDailyAttended: round2(periodAttended / (dayKeys.length || 1)),
      attendanceRate: periodScheduled
        ? Math.round((periodAttended / periodScheduled) * 100)
        : 0,
      bestWeekday: bestWeekday && bestWeekday.avgSold > 0 ? bestWeekday.label : null,
      periodDays: dayKeys.length,
      dailyRangeDays: Math.min(dayKeys.length, MAX_DAILY_POINTS),
    };
  }
}

import { PrismaClient } from '@prisma/client';
import { ActivityMetricsService } from '../activity.metrics';
import { ActivityMetrics, DailyActivityPoint } from '../../../types/dashboard.types';

/**
 * 2026-08-10 es lunes. Fijamos "ahora" a las 15:00 UTC (10:00 en Trujillo)
 * para que todos los rangos relativos a hoy sean deterministas.
 */
const NOW = new Date('2026-08-10T15:00:00.000Z');

interface FakeData {
  serviceInstances?: Array<{ createdAt: Date; finalPrice: number }>;
  payments?: Array<{ paymentDate: Date; amountPaid: number }>;
  appointments?: Array<{ scheduledDate: Date; status: string }>;
}

const makePrisma = (data: FakeData) => ({
  serviceInstance: { findMany: jest.fn().mockResolvedValue(data.serviceInstances ?? []) },
  payment:         { findMany: jest.fn().mockResolvedValue(data.payments ?? []) },
  appointment:     { findMany: jest.fn().mockResolvedValue(data.appointments ?? []) },
});

const buildService = (data: FakeData) => {
  const prisma = makePrisma(data);
  return {
    prisma,
    service: new ActivityMetricsService(prisma as unknown as PrismaClient),
  };
};

const dayOf = (result: ActivityMetrics, date: string): DailyActivityPoint =>
  result.daily.find((point) => point.date === date)!;

describe('ActivityMetricsService', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(NOW);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('rango consultado', () => {
    it('consulta desde el inicio del primer día hasta el final de hoy, en hora de la clínica', async () => {
      const { prisma, service } = buildService({});
      await service.getActivity('week');

      const where = prisma.serviceInstance.findMany.mock.calls[0][0].where;
      // 7 días terminando hoy: 2026-08-04 .. 2026-08-10, con corte a las 05:00 UTC
      expect(where.createdAt.gte.toISOString()).toBe('2026-08-04T05:00:00.000Z');
      expect(where.createdAt.lt.toISOString()).toBe('2026-08-11T05:00:00.000Z');
    });

    it('excluye los pagos anulados', async () => {
      const { prisma, service } = buildService({});
      await service.getActivity('week');

      expect(prisma.payment.findMany.mock.calls[0][0].where.voidedAt).toBeNull();
    });

    it('devuelve un punto por día del período, incluidos los días sin actividad', async () => {
      const { service } = buildService({});
      const result = await service.getActivity('week');

      expect(result.daily.map((d) => d.date)).toEqual([
        '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07',
        '2026-08-08', '2026-08-09', '2026-08-10',
      ]);
      expect(result.daily.every((d) => d.sold === 0 && d.scheduled === 0)).toBe(true);
    });
  });

  describe('agrupación en hora de la clínica', () => {
    it('cuenta una venta de las 20:00 en Perú en ese mismo día, no en el siguiente', async () => {
      const { service } = buildService({
        // 2026-08-09 20:00 en Trujillo = 2026-08-10 01:00 UTC
        serviceInstances: [{ createdAt: new Date('2026-08-10T01:00:00.000Z'), finalPrice: 500 }],
      });
      const result = await service.getActivity('week');

      expect(dayOf(result, '2026-08-09').sold).toBe(500);
      expect(dayOf(result, '2026-08-10').sold).toBe(0);
    });

    it('cuenta una cita nocturna en el día correcto', async () => {
      const { service } = buildService({
        appointments: [
          { scheduledDate: new Date('2026-08-10T02:30:00.000Z'), status: 'attended' },
        ],
      });
      const result = await service.getActivity('week');

      expect(dayOf(result, '2026-08-09').attended).toBe(1);
      expect(dayOf(result, '2026-08-10').attended).toBe(0);
    });
  });

  describe('citas agendadas y atendidas', () => {
    it('cuenta como agendadas todas las citas salvo las canceladas', async () => {
      const at = (hour: number) => new Date(`2026-08-10T${String(hour).padStart(2, '0')}:00:00.000Z`);
      const { service } = buildService({
        appointments: [
          { scheduledDate: at(14), status: 'reserved' },
          { scheduledDate: at(15), status: 'in_progress' },
          { scheduledDate: at(16), status: 'attended' },
          { scheduledDate: at(17), status: 'no_show' },
          { scheduledDate: at(18), status: 'cancelled' },
        ],
      });
      const result = await service.getActivity('week');
      const today = dayOf(result, '2026-08-10');

      expect(today.scheduled).toBe(4); // la cancelada no ocupa agenda
      expect(today.attended).toBe(1);
      expect(today.noShow).toBe(1);
    });

    it('calcula la tasa de asistencia sobre las agendadas del período', async () => {
      const at = (day: string) => new Date(`2026-08-${day}T14:00:00.000Z`);
      const { service } = buildService({
        appointments: [
          { scheduledDate: at('05'), status: 'attended' },
          { scheduledDate: at('06'), status: 'attended' },
          { scheduledDate: at('07'), status: 'attended' },
          { scheduledDate: at('08'), status: 'no_show' },
        ],
      });
      const result = await service.getActivity('week');

      expect(result.summary.attendanceRate).toBe(75);
    });
  });

  describe('ventas y cobros', () => {
    it('separa lo vendido de lo cobrado', async () => {
      const { service } = buildService({
        serviceInstances: [
          { createdAt: new Date('2026-08-10T14:00:00.000Z'), finalPrice: 800 },
          { createdAt: new Date('2026-08-10T16:00:00.000Z'), finalPrice: 200 },
        ],
        payments: [{ paymentDate: new Date('2026-08-10T17:00:00.000Z'), amountPaid: 300 }],
      });
      const result = await service.getActivity('week');
      const today = dayOf(result, '2026-08-10');

      expect(today.sold).toBe(1000);
      expect(today.salesCount).toBe(2);
      expect(today.collected).toBe(300);
      expect(result.summary.todaySold).toBe(1000);
      expect(result.summary.todayCollected).toBe(300);
    });

    it('promedia las ventas diarias sobre todos los días del período', async () => {
      const { service } = buildService({
        serviceInstances: [{ createdAt: new Date('2026-08-10T14:00:00.000Z'), finalPrice: 700 }],
      });
      const result = await service.getActivity('week');

      expect(result.summary.periodDays).toBe(7);
      expect(result.summary.avgDailySold).toBe(100); // 700 / 7 días
    });
  });

  describe('agrupación semanal', () => {
    it('agrupa en semanas de lunes a domingo', async () => {
      const { service } = buildService({
        serviceInstances: [
          // Aug 4 (mar) y Aug 9 (dom) caen en la semana que inicia el lunes Aug 3
          { createdAt: new Date('2026-08-04T14:00:00.000Z'), finalPrice: 100 },
          { createdAt: new Date('2026-08-09T14:00:00.000Z'), finalPrice: 250 },
          // Aug 10 es lunes: abre una semana nueva
          { createdAt: new Date('2026-08-10T14:00:00.000Z'), finalPrice: 400 },
        ],
      });
      const result = await service.getActivity('week');

      expect(result.weekly).toHaveLength(2);
      expect(result.weekly[0]).toMatchObject({
        weekStart: '2026-08-03',
        weekEnd: '2026-08-09',
        sold: 350,
        salesCount: 2,
      });
      expect(result.weekly[1]).toMatchObject({ weekStart: '2026-08-10', sold: 400 });
    });

    it('la semana en curso del resumen empieza el lunes', async () => {
      const { service } = buildService({
        serviceInstances: [
          { createdAt: new Date('2026-08-09T14:00:00.000Z'), finalPrice: 999 }, // domingo anterior
          { createdAt: new Date('2026-08-10T14:00:00.000Z'), finalPrice: 400 }, // lunes de hoy
        ],
      });
      const result = await service.getActivity('week');

      expect(result.summary.weekSold).toBe(400);
    });
  });

  describe('patrón por día de la semana', () => {
    it('devuelve los 7 días en orden ISO, de lunes a domingo', async () => {
      const { service } = buildService({});
      const result = await service.getActivity('week');

      expect(result.byWeekday.map((d) => d.label)).toEqual([
        'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom',
      ]);
      expect(result.byWeekday.map((d) => d.weekday)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('promedia dividiendo por las veces que ese día cayó en el período', async () => {
      // Período 'month' = 30 días (2026-07-12 .. 2026-08-10): 5 lunes, 4 martes
      const { service } = buildService({
        serviceInstances: [
          { createdAt: new Date('2026-07-13T14:00:00.000Z'), finalPrice: 1000 }, // lunes
          { createdAt: new Date('2026-08-10T14:00:00.000Z'), finalPrice: 500 },  // lunes
        ],
      });
      const result = await service.getActivity('month');
      const monday = result.byWeekday.find((d) => d.weekday === 1)!;
      const tuesday = result.byWeekday.find((d) => d.weekday === 2)!;

      expect(monday.occurrences).toBe(5);
      expect(tuesday.occurrences).toBe(4);
      expect(monday.sold).toBe(1500);
      expect(monday.avgSold).toBe(300); // 1500 / 5 lunes
    });

    it('identifica el día con mayor venta promedio', async () => {
      const { service } = buildService({
        serviceInstances: [
          { createdAt: new Date('2026-08-07T14:00:00.000Z'), finalPrice: 900 }, // viernes
          { createdAt: new Date('2026-08-04T14:00:00.000Z'), finalPrice: 100 }, // martes
        ],
      });
      const result = await service.getActivity('week');

      expect(result.summary.bestWeekday).toBe('Vie');
    });

    it('no señala mejor día cuando no hubo ventas', async () => {
      const { service } = buildService({});
      const result = await service.getActivity('week');

      expect(result.summary.bestWeekday).toBeNull();
    });
  });

  describe('períodos', () => {
    it('el período "today" cubre un solo día', async () => {
      const { service } = buildService({});
      const result = await service.getActivity('today');

      expect(result.daily).toHaveLength(1);
      expect(result.daily[0].date).toBe('2026-08-10');
      expect(result.summary.periodDays).toBe(1);
    });

    it('recorta la serie diaria a 92 puntos aunque el período sea un año', async () => {
      const { service } = buildService({});
      const result = await service.getActivity('year');

      expect(result.summary.periodDays).toBe(365);
      expect(result.daily).toHaveLength(92);
      expect(result.daily[91].date).toBe('2026-08-10'); // termina hoy
      // Las semanas y el patrón semanal sí cubren el año completo
      expect(result.byWeekday[0].occurrences).toBeGreaterThan(50);
    });

    it('un período desconocido cae en el comportamiento de "month"', async () => {
      const { service } = buildService({});
      const result = await service.getActivity(undefined);

      expect(result.summary.periodDays).toBe(30);
    });
  });
});

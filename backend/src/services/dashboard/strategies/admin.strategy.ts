import { BaseDashboardStrategy } from './base.strategy';
import {
  AdminDashboardData,
  DashboardFilters,
} from '../../../types/dashboard.types';
import { Prisma } from '@prisma/client';
type Decimal = Prisma.Decimal;

/**
 * Estrategia para el dashboard del Administrador
 * Proporciona vista global del negocio: ingresos, citas, ventas, comisiones
 */
export class AdminDashboardStrategy extends BaseDashboardStrategy {
  async execute(
    _userId: string,
    filters?: DashboardFilters
  ): Promise<AdminDashboardData> {
    const dateRange = this.getDateRange(filters?.period);

    // Ejecutar todas las queries en paralelo para mejor performance
    const [financials, appointments, sales, commissions, patients] = await Promise.all([
      this.getFinancials(dateRange),
      this.getAppointments(dateRange),
      this.getSales(dateRange),
      this.getCommissions(dateRange),
      this.getPatients(dateRange, filters?.period),
    ]);

    return {
      financials,
      appointments,
      sales,
      commissions,
      patients,
    };
  }

  /**
   * Obtiene datos financieros: ingresos totales, pendientes, pagados y por mes
   */
  private async getFinancials(dateRange: { gte: Date; lte: Date }) {
    // Aggregate de órdenes de pago agrupadas por estado
    const paymentOrdersByStatus = await this.prisma.paymentOrder.groupBy({
      by: ['status'],
      _sum: { totalAmount: true },
      where: {
        createdAt: dateRange,
      },
    });

    // Ingresos mensuales para el gráfico
    const monthlyPaymentOrders = await this.prisma.paymentOrder.groupBy({
      by: ['createdAt'],
      _sum: { totalAmount: true },
      where: {
        createdAt: dateRange,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calcular totales
    const totalRevenue = paymentOrdersByStatus.reduce(
      (sum, po) => sum + this.decimalToNumber(po._sum.totalAmount),
      0
    );

    const pendingRevenue =
      this.decimalToNumber(
        paymentOrdersByStatus.find((i) => i.status === 'pending')?._sum.totalAmount
      ) || 0;

    const paidRevenue =
      this.decimalToNumber(
        paymentOrdersByStatus.find((i) => i.status === 'paid')?._sum.totalAmount
      ) || 0;

    // Ingresos agrupados por método de pago
    const rawPaymentsByMethod = await this.prisma.payment.groupBy({
      by: ['paymentMethod'],
      _sum: { amountPaid: true },
      where: { createdAt: dateRange },
    });

    const paymentsByMethod = rawPaymentsByMethod.map((p) => ({
      method: p.paymentMethod,
      amount: this.decimalToNumber(p._sum.amountPaid),
    }));

    return {
      totalRevenue,
      pendingRevenue,
      paidRevenue,
      monthlyRevenue: this.groupByMonth(monthlyPaymentOrders),
      paymentsByMethod,
    };
  }

  /**
   * Obtiene estadísticas de citas: total, hoy, esta semana, por estado
   */
  private async getAppointments(dateRange: { gte: Date; lte: Date }) {
    const today = this.getToday();
    const tomorrow = this.getTomorrow();
    const weekAgo = this.getDaysAgo(7);

    const [total, todayCount, weekCount, byStatus] = await Promise.all([
      // Total de citas en el período
      this.prisma.appointment.count({
        where: { createdAt: dateRange },
      }),

      // Citas programadas para hoy
      this.prisma.appointment.count({
        where: {
          scheduledDate: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),

      // Citas de esta semana
      this.prisma.appointment.count({
        where: {
          scheduledDate: {
            gte: weekAgo,
            lte: new Date(),
          },
        },
      }),

      // Citas agrupadas por estado
      this.prisma.appointment.groupBy({
        by: ['status'],
        _count: true,
        where: {
          createdAt: dateRange,
        },
      }),
    ]);

    return {
      total,
      today: todayCount,
      thisWeek: weekCount,
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count,
      })),
    };
  }

  /**
   * Obtiene estadísticas de ventas: órdenes totales, valor y top servicios
   */
  private async getSales(dateRange: { gte: Date; lte: Date }) {
    const [totalOrders, topServices] = await Promise.all([
      // Aggregate de todas las órdenes
      this.prisma.serviceInstance.aggregate({
        _count: true,
        _sum: { finalPrice: true },
        where: {
          createdAt: dateRange,
        },
      }),

      // Top 5 servicios más vendidos
      this.prisma.serviceInstance.groupBy({
        by: ['serviceId'],
        _count: true,
        _sum: { finalPrice: true },
        where: {
          createdAt: dateRange,
        },
        orderBy: {
          _count: {
            serviceId: 'desc',
          },
        },
        take: 5,
      }),
    ]);

    // Obtener nombres de servicios
    const serviceIds = topServices.map((s) => s.serviceId);
    const services = await this.prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, name: true },
    });

    return {
      totalOrders: totalOrders._count,
      totalOrdersValue: this.decimalToNumber(totalOrders._sum.finalPrice) || 0,
      topServices: topServices.map((s) => ({
        serviceId: s.serviceId,
        name:
          services.find((srv) => srv.id === s.serviceId)?.name || 'Desconocido',
        count: s._count,
        revenue: this.decimalToNumber(s._sum.finalPrice) || 0,
      })),
    };
  }

  /**
   * Obtiene estadísticas de comisiones: pendientes, aprobadas, pagadas y total
   */
  private async getCommissions(dateRange: { gte: Date; lte: Date }) {
    const summary = await this.prisma.commission.groupBy({
      by: ['status'],
      _count: true,
      _sum: { commissionAmount: true },
      where: {
        createdAt: dateRange,
      },
    });

    return {
      pending: summary.find((s) => s.status === 'pending')?._count || 0,
      approved: summary.find((s) => s.status === 'approved')?._count || 0,
      paid: summary.find((s) => s.status === 'paid')?._count || 0,
      totalAmount: summary.reduce(
        (sum, s) => sum + this.decimalToNumber(s._sum.commissionAmount),
        0
      ),
    };
  }

  /**
   * Obtiene estadísticas de nuevos pacientes: total y agrupados según el período
   * - today/week/month → agrupa por día (YYYY-MM-DD)
   * - year            → agrupa por mes (YYYY-MM)
   */
  private async getPatients(
    dateRange: { gte: Date; lte: Date },
    period?: string
  ) {
    const [total, byDate] = await Promise.all([
      this.prisma.patient.count({
        where: { createdAt: dateRange },
      }),
      this.prisma.patient.groupBy({
        by: ['createdAt'],
        _count: true,
        where: { createdAt: dateRange },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const useMonthly = period === 'year';
    const granularity: 'day' | 'month' = useMonthly ? 'month' : 'day';

    // Datos reales agrupados
    const actual = new Map<string, number>();
    byDate.forEach((item) => {
      const key = useMonthly
        ? new Date(item.createdAt).toISOString().slice(0, 7)
        : new Date(item.createdAt).toISOString().slice(0, 10);
      actual.set(key, (actual.get(key) || 0) + item._count);
    });

    // Llenar rango completo con ceros para que el gráfico siempre se muestre
    const filled = new Map<string, number>();
    const cursor = new Date(dateRange.gte);
    const end = new Date(dateRange.lte);

    if (useMonthly) {
      cursor.setDate(1);
      while (cursor <= end) {
        const key = cursor.toISOString().slice(0, 7);
        filled.set(key, actual.get(key) ?? 0);
        cursor.setMonth(cursor.getMonth() + 1);
      }
    } else {
      while (cursor <= end) {
        const key = cursor.toISOString().slice(0, 10);
        filled.set(key, actual.get(key) ?? 0);
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    const byPeriod = Array.from(filled.entries())
      .map(([p, count]) => ({ period: p, count }))
      .sort((a, b) => a.period.localeCompare(b.period));

    return { total, byPeriod, granularity };
  }

  /**
   * Helper: Convierte Decimal de Prisma a number de forma segura
   */
  private decimalToNumber(value: Decimal | null | undefined): number {
    if (!value) return 0;
    return parseFloat(value.toString());
  }
}

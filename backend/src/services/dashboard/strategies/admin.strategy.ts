import { BaseDashboardStrategy } from './base.strategy';
import {
  AdminDashboardData,
  DashboardFilters,
} from '../../../types/dashboard.types';
import { Decimal } from '@prisma/client/runtime/library';

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
    const [financials, appointments, sales, commissions] = await Promise.all([
      this.getFinancials(dateRange),
      this.getAppointments(dateRange),
      this.getSales(dateRange),
      this.getCommissions(dateRange),
    ]);

    return {
      financials,
      appointments,
      sales,
      commissions,
    };
  }

  /**
   * Obtiene datos financieros: ingresos totales, pendientes, pagados y por mes
   */
  private async getFinancials(dateRange: { gte: Date; lte: Date }) {
    // Aggregate de facturas agrupadas por estado
    const invoicesByStatus = await this.prisma.invoice.groupBy({
      by: ['status'],
      _sum: { totalAmount: true },
      where: {
        createdAt: dateRange,
      },
    });

    // Ingresos mensuales para el gráfico
    const monthlyInvoices = await this.prisma.invoice.groupBy({
      by: ['createdAt'],
      _sum: { totalAmount: true },
      where: {
        createdAt: dateRange,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calcular totales
    const totalRevenue = invoicesByStatus.reduce(
      (sum, invoice) => sum + this.decimalToNumber(invoice._sum.totalAmount),
      0
    );

    const pendingRevenue =
      this.decimalToNumber(
        invoicesByStatus.find((i) => i.status === 'pending')?._sum.totalAmount
      ) || 0;

    const paidRevenue =
      this.decimalToNumber(
        invoicesByStatus.find((i) => i.status === 'paid')?._sum.totalAmount
      ) || 0;

    return {
      totalRevenue,
      pendingRevenue,
      paidRevenue,
      monthlyRevenue: this.groupByMonth(monthlyInvoices),
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
      this.prisma.order.aggregate({
        _count: true,
        _sum: { finalPrice: true },
        where: {
          createdAt: dateRange,
        },
      }),

      // Top 5 servicios más vendidos
      this.prisma.order.groupBy({
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
   * Helper: Convierte Decimal de Prisma a number de forma segura
   */
  private decimalToNumber(value: Decimal | null | undefined): number {
    if (!value) return 0;
    return parseFloat(value.toString());
  }
}

import { PrismaClient } from '@prisma/client';
import { BaseAnalyticsStrategy } from './BaseAnalyticsStrategy';
import { ExecutiveSummaryData, AnalyticsFilters } from '../../../types/analytics.types';

export class ExecutiveSummaryStrategy extends BaseAnalyticsStrategy<ExecutiveSummaryData> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  protected async fetchData(
    dateRange: { gte: Date; lte: Date },
    filters?: AnalyticsFilters
  ): Promise<any> {
    // Execute queries in parallel for better performance
    const [kpis, revenueTrend, topServices, appointmentsByStatus] = await Promise.all([
      this.getKPIs(dateRange),
      this.getRevenueTrend(dateRange),
      this.getTopServices(dateRange),
      this.getAppointmentsByStatus(dateRange)
    ]);

    return { kpis, revenueTrend, topServices, appointmentsByStatus };
  }

  protected transformData(data: any): ExecutiveSummaryData {
    return data as ExecutiveSummaryData;
  }

  // ==================== PRIVATE METHODS ====================

  private async getKPIs(dateRange: { gte: Date; lte: Date }) {
    // Revenue
    const revenueResult = await this.prisma.payment.aggregate({
      _sum: { amountPaid: true },
      where: { paymentDate: dateRange }
    });

    // Appointments
    const appointmentsCount = await this.prisma.appointment.count({
      where: { scheduledDate: dateRange }
    });

    // Attendance rate
    const attendedCount = await this.prisma.appointment.count({
      where: { scheduledDate: dateRange, status: 'attended' }
    });
    const attendanceRate = appointmentsCount > 0
      ? Math.round((attendedCount / appointmentsCount) * 100)
      : 0;

    // Pending commissions
    const commissionsResult = await this.prisma.commission.aggregate({
      _sum: { commissionAmount: true },
      where: {
        status: { in: ['pending', 'approved'] },
        createdAt: dateRange
      }
    });

    return {
      totalRevenue: this.decimalToNumber(revenueResult._sum.amountPaid),
      totalAppointments: appointmentsCount,
      attendanceRate,
      pendingCommissions: this.decimalToNumber(commissionsResult._sum.commissionAmount)
    };
  }

  private async getRevenueTrend(dateRange: { gte: Date; lte: Date }) {
    const payments = await this.prisma.payment.findMany({
      where: { paymentDate: dateRange },
      select: { paymentDate: true, amountPaid: true }
    });

    // Group by month
    const grouped = new Map<string, number>();
    payments.forEach((payment) => {
      const monthKey = `${payment.paymentDate.getFullYear()}-${String(
        payment.paymentDate.getMonth() + 1
      ).padStart(2, '0')}`;
      const current = grouped.get(monthKey) || 0;
      grouped.set(monthKey, current + this.decimalToNumber(payment.amountPaid));
    });

    return Array.from(grouped.entries())
      .map(([month, value]) => ({ month, value }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private async getTopServices(dateRange: { gte: Date; lte: Date }) {
    const services = await this.prisma.service.findMany({
      where: {
        orders: {
          some: { createdAt: dateRange }
        }
      },
      select: {
        id: true,
        name: true,
        orders: {
          where: { createdAt: dateRange },
          select: { finalPrice: true }
        }
      }
    });

    const ranked = services
      .map((service) => ({
        id: service.id,
        name: service.name,
        count: service.orders.length,
        revenue: service.orders.reduce(
          (sum, order) => sum + this.decimalToNumber(order.finalPrice),
          0
        )
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return ranked;
  }

  private async getAppointmentsByStatus(dateRange: { gte: Date; lte: Date }) {
    const grouped = await this.prisma.appointment.groupBy({
      by: ['status'],
      _count: true,
      where: { scheduledDate: dateRange }
    });

    const total = grouped.reduce((sum, item) => sum + item._count, 0);

    return grouped.map((item) => ({
      status: item.status,
      count: item._count,
      percentage: this.formatPercentage(item._count, total)
    }));
  }
}

import { PrismaClient } from '@prisma/client';
import { BaseAnalyticsStrategy } from './BaseAnalyticsStrategy';
import { FinancialAnalyticsData, AnalyticsFilters } from '../../../types/analytics.types';

export class FinancialAnalyticsStrategy extends BaseAnalyticsStrategy<FinancialAnalyticsData> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  protected async fetchData(
    dateRange: { gte: Date; lte: Date },
    filters?: AnalyticsFilters
  ): Promise<any> {
    const [revenue, cashFlow, accountsReceivable] = await Promise.all([
      this.getRevenue(dateRange),
      this.getCashFlow(dateRange),
      this.getAccountsReceivable()
    ]);

    return { revenue, cashFlow, accountsReceivable };
  }

  // ==================== REVENUE ====================
  private async getRevenue(dateRange: { gte: Date; lte: Date }) {
    // Total revenue
    const totalResult = await this.prisma.payment.aggregate({
      _sum: { amountPaid: true },
      where: { paymentDate: dateRange }
    });

    // By payment method
    const byMethodGrouped = await this.prisma.payment.groupBy({
      by: ['paymentMethod'],
      _sum: { amountPaid: true },
      _count: true,
      where: { paymentDate: dateRange }
    });

    const totalRevenue = this.decimalToNumber(totalResult._sum.amountPaid);

    const byPaymentMethod = byMethodGrouped.map((item) => ({
      method: item.paymentMethod,
      amount: this.decimalToNumber(item._sum.amountPaid),
      count: item._count,
      percentage: this.formatPercentage(
        this.decimalToNumber(item._sum.amountPaid),
        totalRevenue
      )
    }));

    // Trend
    const payments = await this.prisma.payment.findMany({
      where: { paymentDate: dateRange },
      select: { paymentDate: true, amountPaid: true }
    });

    const grouped = new Map<string, number>();
    payments.forEach((payment) => {
      const monthKey = `${payment.paymentDate.getFullYear()}-${String(
        payment.paymentDate.getMonth() + 1
      ).padStart(2, '0')}`;
      const current = grouped.get(monthKey) || 0;
      grouped.set(monthKey, current + this.decimalToNumber(payment.amountPaid));
    });

    const trend = Array.from(grouped.entries())
      .map(([month, value]) => ({ month, value }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Average ticket
    const orders = await this.prisma.order.findMany({
      where: { createdAt: dateRange },
      select: { finalPrice: true }
    });

    const averageTicket = orders.length > 0
      ? orders.reduce((sum, o) => sum + this.decimalToNumber(o.finalPrice), 0) / orders.length
      : 0;

    return {
      total: totalRevenue,
      byPaymentMethod,
      trend,
      averageTicket
    };
  }

  // ==================== CASH FLOW ====================
  private async getCashFlow(dateRange: { gte: Date; lte: Date }) {
    const payments = await this.prisma.payment.findMany({
      where: { paymentDate: dateRange },
      select: { paymentDate: true, amountPaid: true },
      orderBy: { paymentDate: 'asc' }
    });

    // Group by day
    const grouped = new Map<string, number>();
    payments.forEach((payment) => {
      const dateKey = payment.paymentDate.toISOString().split('T')[0];
      const current = grouped.get(dateKey) || 0;
      grouped.set(dateKey, current + this.decimalToNumber(payment.amountPaid));
    });

    const daily = Array.from(grouped.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Projected revenue (from scheduled appointments)
    const futureAppointments = await this.prisma.appointment.findMany({
      where: {
        scheduledDate: { gte: new Date() },
        status: 'reserved'
      },
      include: {
        appointmentServices: {
          include: {
            order: { select: { finalPrice: true } }
          }
        }
      }
    });

    const projected = futureAppointments.reduce((sum, apt) => {
      return sum + apt.appointmentServices.reduce((s, as) => {
        return s + this.decimalToNumber(as.order.finalPrice);
      }, 0);
    }, 0);

    return { daily, projected };
  }

  // ==================== ACCOUNTS RECEIVABLE ====================
  private async getAccountsReceivable() {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: { in: ['pending', 'partial'] }
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        payments: { select: { amountPaid: true } }
      }
    });

    const total = invoices.reduce((sum, inv) => {
      const paid = inv.payments.reduce((s, p) => s + this.decimalToNumber(p.amountPaid), 0);
      const remaining = this.decimalToNumber(inv.totalAmount) - paid;
      return sum + remaining;
    }, 0);

    // Aging
    const now = new Date();
    const aging = [
      { range: '0-30 días', amount: 0, count: 0 },
      { range: '31-60 días', amount: 0, count: 0 },
      { range: '61-90 días', amount: 0, count: 0 },
      { range: '90+ días', amount: 0, count: 0 }
    ];

    invoices.forEach((inv) => {
      const daysOld = Math.floor(
        (now.getTime() - inv.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      const paid = inv.payments.reduce((s, p) => s + this.decimalToNumber(p.amountPaid), 0);
      const remaining = this.decimalToNumber(inv.totalAmount) - paid;

      if (daysOld <= 30) {
        aging[0].amount += remaining;
        aging[0].count++;
      } else if (daysOld <= 60) {
        aging[1].amount += remaining;
        aging[1].count++;
      } else if (daysOld <= 90) {
        aging[2].amount += remaining;
        aging[2].count++;
      } else {
        aging[3].amount += remaining;
        aging[3].count++;
      }
    });

    // Top debtors
    const topDebtors = invoices
      .map((inv) => {
        const paid = inv.payments.reduce((s, p) => s + this.decimalToNumber(p.amountPaid), 0);
        const remaining = this.decimalToNumber(inv.totalAmount) - paid;
        return {
          patientId: inv.patientId,
          patientName: `${inv.patient.firstName} ${inv.patient.lastName}`,
          amount: remaining
        };
      })
      .filter((d) => d.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    return { total, aging, topDebtors };
  }
}

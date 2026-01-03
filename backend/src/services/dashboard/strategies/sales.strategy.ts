import { BaseDashboardStrategy } from './base.strategy';
import {
  SalesDashboardData,
  DashboardFilters,
} from '../../../types/dashboard.types';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Estrategia para el dashboard de Ventas
 * Enfocado en rendimiento personal: ventas, comisiones, metas, pacientes
 */
export class SalesDashboardStrategy extends BaseDashboardStrategy {
  async execute(
    userId: string,
    filters?: DashboardFilters
  ): Promise<SalesDashboardData> {
    const dateRange = this.getDateRange(filters?.period);

    // Ejecutar queries en paralelo
    const [sales, commissions, patients, goals] = await Promise.all([
      this.getSales(userId, dateRange),
      this.getCommissions(userId, dateRange),
      this.getPatients(userId),
      this.getGoals(userId, dateRange),
    ]);

    return {
      sales,
      commissions,
      patients,
      goals,
    };
  }

  /**
   * Obtiene estadísticas de ventas del vendedor
   */
  private async getSales(userId: string, dateRange: { gte: Date; lte: Date }) {
    // Aggregate de órdenes del vendedor
    const ordersAggregate = await this.prisma.order.aggregate({
      _count: true,
      _sum: { finalPrice: true },
      where: {
        createdById: userId,
        createdAt: dateRange,
      },
    });

    // Ingresos mensuales
    const monthlyOrders = await this.prisma.order.groupBy({
      by: ['createdAt'],
      _sum: { finalPrice: true },
      where: {
        createdById: userId,
        createdAt: dateRange,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return {
      totalOrders: ordersAggregate._count,
      totalRevenue: this.decimalToNumber(ordersAggregate._sum.finalPrice) || 0,
      monthlyRevenue: this.groupByMonth(monthlyOrders),
    };
  }

  /**
   * Obtiene estadísticas de comisiones del vendedor
   */
  private async getCommissions(
    userId: string,
    dateRange: { gte: Date; lte: Date }
  ) {
    // Resumen de comisiones por estado
    const summary = await this.prisma.commission.groupBy({
      by: ['status'],
      _count: true,
      _sum: { commissionAmount: true },
      where: {
        salesPersonId: userId,
        createdAt: dateRange,
      },
    });

    // Historial reciente de comisiones
    const history = await this.prisma.commission.findMany({
      where: {
        salesPersonId: userId,
        createdAt: dateRange,
      },
      include: {
        service: true, // Include completo (puede ser null)
        appointment: {
          select: {
            id: true,
            scheduledDate: true,
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    return {
      pending: summary.find((s) => s.status === 'pending')?._count || 0,
      approved: summary.find((s) => s.status === 'approved')?._count || 0,
      paid: summary.find((s) => s.status === 'paid')?._count || 0,
      totalEarned: summary.reduce(
        (sum, s) => sum + this.decimalToNumber(s._sum.commissionAmount),
        0
      ),
      history,
    };
  }

  /**
   * Obtiene estadísticas de pacientes del vendedor
   */
  private async getPatients(userId: string) {
    const [total, recentAppointments] = await Promise.all([
      // Total de pacientes creados por el vendedor
      this.prisma.patient.count({
        where: {
          createdById: userId,
        },
      }),

      // Últimas 5 citas creadas por el vendedor
      this.prisma.appointment.findMany({
        where: {
          createdById: userId,
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          scheduledDate: 'desc',
        },
        take: 5,
      }),
    ]);

    return {
      total,
      recentAppointments,
    };
  }

  /**
   * Calcula el progreso de metas del vendedor
   */
  private async getGoals(userId: string, dateRange: { gte: Date; lte: Date }) {
    // Meta mensual hardcodeada (TODO: hacer configurable por usuario)
    const monthlyGoal = 10000;

    // Total vendido en el período
    const achieved = await this.prisma.order.aggregate({
      _sum: { finalPrice: true },
      where: {
        createdById: userId,
        createdAt: dateRange,
      },
    });

    const achievedAmount = this.decimalToNumber(achieved._sum.finalPrice) || 0;
    const percentage = Math.min(
      Math.round((achievedAmount / monthlyGoal) * 100),
      100
    );

    return {
      monthly: monthlyGoal,
      achieved: achievedAmount,
      percentage,
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

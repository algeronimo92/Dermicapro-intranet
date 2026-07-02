import { BaseDashboardStrategy } from './base.strategy';
import {
  SalesDashboardData,
  DashboardFilters,
} from '../../../types/dashboard.types';
import { Prisma } from '@prisma/client';
type Decimal = Prisma.Decimal;

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
    const [sales, commissions, patients, goals, todayAttendance] = await Promise.all([
      this.getSales(userId, dateRange),
      this.getCommissions(userId, dateRange),
      this.getPatients(userId),
      this.getGoals(userId, dateRange),
      this.getTodayAttendance(userId),
    ]);

    return {
      sales,
      commissions,
      patients,
      goals,
      todayAttendance,
    };
  }

  /**
   * Obtiene estadísticas de ventas del vendedor
   */
  private async getSales(userId: string, dateRange: { gte: Date; lte: Date }) {
    // Aggregate de órdenes del vendedor
    const ordersAggregate = await this.prisma.serviceInstance.aggregate({
      _count: true,
      _sum: { finalPrice: true },
      where: {
        createdById: userId,
        createdAt: dateRange,
      },
    });

    // Ingresos mensuales
    const monthlyOrders = await this.prisma.serviceInstance.groupBy({
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
        service: true,
        servicePackage: true,
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
    const achieved = await this.prisma.serviceInstance.aggregate({
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
   * Citas de hoy creadas por este vendedor — ¿llegaron los pacientes?
   */
  private async getTodayAttendance(userId: string) {
    const today = this.getToday();
    const tomorrow = this.getTomorrow();

    const appointments = await this.prisma.appointment.findMany({
      where: {
        createdById: userId,
        scheduledDate: { gte: today, lt: tomorrow },
        status: { not: 'cancelled' },
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        appointmentServices: {
          where: { deletedAt: null },
          include: {
            serviceInstance: {
              include: { service: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    const arrived  = appointments.filter((a) => ['attended', 'in_progress'].includes(a.status)).length;
    const waiting  = appointments.filter((a) => a.status === 'reserved').length;
    const noShow   = appointments.filter((a) => a.status === 'no_show').length;

    return {
      total: appointments.length,
      arrived,
      waiting,
      noShow,
      queue: appointments.map((a) => ({
        id: a.id,
        scheduledDate: a.scheduledDate.toISOString(),
        status: a.status,
        patient: { firstName: a.patient.firstName, lastName: a.patient.lastName },
        services: a.appointmentServices
          .map((as: any) => as.serviceInstance?.service?.name)
          .filter(Boolean),
      })),
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

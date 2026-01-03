import { PrismaClient } from '@prisma/client';
import { BaseAnalyticsStrategy } from './BaseAnalyticsStrategy';
import {
  AnalyticsFilters,
  SalesAnalyticsData,
} from '../../../types/analytics.types';

export class SalesAnalyticsStrategy extends BaseAnalyticsStrategy<SalesAnalyticsData> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async execute(filters?: AnalyticsFilters): Promise<SalesAnalyticsData> {
    this.validateFilters(filters);
    const dateRange = this.getDateRange(filters);

    const [overview, salesPeople, commissions, topServices] = await Promise.all([
      this.getOverview(dateRange, filters),
      this.getSalesPeopleRanking(dateRange),
      this.getCommissionsData(dateRange),
      this.getTopServices(dateRange),
    ]);

    return {
      overview,
      salesPeople,
      commissions,
      topServices,
    };
  }

  private async getOverview(
    dateRange: { gte: Date; lte: Date },
    filters?: AnalyticsFilters
  ): Promise<SalesAnalyticsData['overview']> {
    const where: any = {
      createdAt: {
        gte: dateRange.gte,
        lte: dateRange.lte,
      },
    };

    if (filters?.salesPersonId) {
      where.createdById = filters.salesPersonId;
    }

    const ordersData = await this.prisma.order.aggregate({
      _count: true,
      _sum: {
        finalPrice: true,
      },
      where,
    });

    const totalOrders = ordersData._count || 0;
    const totalRevenue = ordersData._sum.finalPrice || 0;
    const averageOrderValue =
      totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calcular tasa de conversión (citas que resultaron en ventas)
    const appointmentsCount = await this.prisma.appointment.count({
      where: {
        scheduledDate: {
          gte: dateRange.gte,
          lte: dateRange.lte,
        },
      },
    });

    const conversionRate =
      appointmentsCount > 0 ? (totalOrders / appointmentsCount) * 100 : 0;

    return {
      totalOrders,
      totalRevenue,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  }

  private async getSalesPeopleRanking(dateRange: {
    gte: Date;
    lte: Date;
  }): Promise<SalesAnalyticsData['salesPeople']> {
    // Obtener datos de ventas por vendedor
    const salesByPerson = await this.prisma.order.groupBy({
      by: ['createdById'],
      _count: true,
      _sum: {
        finalPrice: true,
      },
      where: {
        createdAt: {
          gte: dateRange.gte,
          lte: dateRange.lte,
        },
      },
      orderBy: {
        _sum: {
          finalPrice: 'desc',
        },
      },
    });

    // Obtener información de los usuarios y sus comisiones
    const salesPeople = await Promise.all(
      salesByPerson.map(async (sale, index) => {
        const user = await this.prisma.user.findUnique({
          where: { id: sale.createdById },
          select: {
            firstName: true,
            lastName: true,
          },
        });

        // Calcular comisiones ganadas
        const commissionsData = await this.prisma.commission.aggregate({
          _sum: {
            commissionAmount: true,
          },
          where: {
            salesPersonId: sale.createdById,
            createdAt: {
              gte: dateRange.gte,
              lte: dateRange.lte,
            },
          },
        });

        return {
          id: sale.createdById,
          name: user
            ? `${user.firstName} ${user.lastName}`
            : 'Usuario Desconocido',
          ordersCount: sale._count,
          revenue: sale._sum.finalPrice || 0,
          commissionsEarned: commissionsData._sum.commissionAmount || 0,
          ranking: index + 1,
        };
      })
    );

    return salesPeople;
  }

  private async getCommissionsData(dateRange: {
    gte: Date;
    lte: Date;
  }): Promise<SalesAnalyticsData['commissions']> {
    const commissionsByStatus = await this.prisma.commission.groupBy({
      by: ['status'],
      _count: true,
      _sum: {
        commissionAmount: true,
      },
      where: {
        createdAt: {
          gte: dateRange.gte,
          lte: dateRange.lte,
        },
      },
    });

    const totalAmount =
      commissionsByStatus.reduce(
        (sum, item) => sum + (item._sum.commissionAmount || 0),
        0
      ) || 0;

    const pendingData = commissionsByStatus.find((item) => item.status === 'pending');
    const approvedData = commissionsByStatus.find((item) => item.status === 'approved');
    const paidData = commissionsByStatus.find((item) => item.status === 'paid');

    const pending = pendingData?._count || 0;
    const approved = approvedData?._count || 0;
    const paid = paidData?._count || 0;
    const total = pending + approved + paid;

    const totalPending = pendingData?._sum.commissionAmount || 0;
    const totalApproved = approvedData?._sum.commissionAmount || 0;
    const totalPaid = paidData?._sum.commissionAmount || 0;

    const byStatus = commissionsByStatus.map((item) => ({
      status: item.status,
      amount: item._sum.commissionAmount || 0,
      count: item._count,
    }));

    return {
      total,
      pending,
      approved,
      paid,
      totalAmount,
      totalPending,
      totalApproved,
      totalPaid,
      byStatus,
    };
  }

  private async getTopServices(dateRange: {
    gte: Date;
    lte: Date;
  }): Promise<SalesAnalyticsData['topServices']> {
    const servicesSales = await this.prisma.order.groupBy({
      by: ['serviceId'],
      _count: true,
      _sum: {
        finalPrice: true,
      },
      where: {
        createdAt: {
          gte: dateRange.gte,
          lte: dateRange.lte,
        },
      },
      orderBy: {
        _sum: {
          finalPrice: 'desc',
        },
      },
      take: 10,
    });

    const servicesInfo = await this.prisma.service.findMany({
      where: {
        id: {
          in: servicesSales.map((s) => s.serviceId),
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    return servicesSales.map((sale) => {
      const service = servicesInfo.find((s) => s.id === sale.serviceId);
      return {
        serviceId: sale.serviceId,
        serviceName: service?.name || 'Servicio Desconocido',
        unitsSold: sale._count,
        revenue: sale._sum.finalPrice || 0,
      };
    });
  }
}

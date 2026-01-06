import { PrismaClient } from '@prisma/client';
import { BaseAnalyticsStrategy } from './BaseAnalyticsStrategy';
import {
  AnalyticsFilters,
  ServiceAnalyticsData,
} from '../../../types/analytics.types';

export class ServiceAnalyticsStrategy extends BaseAnalyticsStrategy<ServiceAnalyticsData> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async execute(filters?: AnalyticsFilters): Promise<ServiceAnalyticsData> {
    this.validateFilters(filters);
    const dateRange = this.getDateRange(filters);

    const [overview, performance, pricing, packages] = await Promise.all([
      this.getOverview(dateRange),
      this.getPerformanceData(dateRange, filters),
      this.getPricingData(),
      this.getPackagesData(dateRange),
    ]);

    return {
      overview,
      performance,
      pricing,
      packages,
    };
  }

  private async getOverview(dateRange: {
    gte: Date;
    lte: Date;
  }): Promise<ServiceAnalyticsData['overview']> {
    const totalServices = await this.prisma.service.count();
    const activeServices = await this.prisma.service.count({
      where: {
        isActive: true,
      },
    });

    const revenueData = await this.prisma.order.aggregate({
      _sum: {
        finalPrice: true,
      },
      where: {
        createdAt: {
          gte: dateRange.gte,
          lte: dateRange.lte,
        },
      },
    });

    return {
      totalServices,
      activeServices,
      totalRevenue: Number(revenueData._sum.finalPrice) || 0,
    };
  }

  private async getPerformanceData(
    dateRange: { gte: Date; lte: Date },
    filters?: AnalyticsFilters
  ): Promise<ServiceAnalyticsData['performance']> {
    const where: any = {
      createdAt: {
        gte: dateRange.gte,
        lte: dateRange.lte,
      },
    };

    if (filters?.serviceId) {
      where.serviceId = filters.serviceId;
    }

    // Obtener datos de órdenes agrupados por servicio
    const ordersByService = await this.prisma.order.groupBy({
      by: ['serviceId'],
      _count: true,
      _sum: {
        finalPrice: true,
      },
      _avg: {
        finalPrice: true,
      },
      where,
      orderBy: {
        _count: {
          serviceId: 'desc',
        },
      },
    });

    // Obtener información de los servicios
    const services = await this.prisma.service.findMany({
      where: {
        id: {
          in: ordersByService.map((o) => o.serviceId),
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    // Calcular completion rate (citas completadas vs total)
    const completionData = await Promise.all(
      ordersByService.map(async (order) => {
        const totalAppointments = await this.prisma.appointmentService.count({
          where: {
            order: {
              serviceId: order.serviceId,
              createdAt: {
                gte: dateRange.gte,
                lte: dateRange.lte,
              },
            },
          },
        });

        const completedAppointments =
          await this.prisma.appointmentService.count({
            where: {
              order: {
                serviceId: order.serviceId,
                createdAt: {
                  gte: dateRange.gte,
                  lte: dateRange.lte,
                },
              },
              appointment: {
                status: 'attended',
              },
            },
          });

        const completionRate =
          totalAppointments > 0
            ? (completedAppointments / totalAppointments) * 100
            : 0;

        const service = services.find((s) => s.id === order.serviceId);

        return {
          serviceId: order.serviceId,
          serviceName: service?.name || 'Servicio Desconocido',
          timesOrdered: order._count,
          revenue: Math.round((Number(order._sum.finalPrice) || 0) * 100) / 100,
          averagePrice: Math.round((Number(order._avg.finalPrice) || 0) * 100) / 100,
          completionRate: Math.round(completionRate * 100) / 100,
        };
      })
    );

    return completionData;
  }

  private async getPricingData(): Promise<ServiceAnalyticsData['pricing']> {
    const priceData = await this.prisma.service.aggregate({
      _avg: {
        basePrice: true,
      },
      _min: {
        basePrice: true,
      },
      _max: {
        basePrice: true,
      },
      where: {
        isActive: true,
      },
    });

    return {
      averageServicePrice: Math.round((Number(priceData._avg.basePrice) || 0) * 100) / 100,
      priceRange: {
        min: Math.round((Number(priceData._min.basePrice) || 0) * 100) / 100,
        max: Math.round((Number(priceData._max.basePrice) || 0) * 100) / 100,
      },
    };
  }

  private async getPackagesData(dateRange: {
    gte: Date;
    lte: Date;
  }): Promise<ServiceAnalyticsData['packages']> {
    // Obtener paquetes (servicios con 'Paquete' en el nombre o categoría)
    const packages = await this.prisma.service.findMany({
      where: {
        OR: [
          { name: { contains: 'Paquete', mode: 'insensitive' } },
          { name: { contains: 'Package', mode: 'insensitive' } },
        ],
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        basePrice: true,
      },
    });

    if (packages.length === 0) {
      return [];
    }

    // Calcular popularidad de cada paquete
    const packagesWithStats = await Promise.all(
      packages.map(async (pkg) => {
        const ordersCount = await this.prisma.order.count({
          where: {
            serviceId: pkg.id,
            createdAt: {
              gte: dateRange.gte,
              lte: dateRange.lte,
            },
          },
        });

        return {
          packageId: pkg.id,
          packageName: pkg.name,
          serviceCount: 1, // TODO: Implementar si hay relación de paquetes con múltiples servicios
          totalPrice: Math.round((Number(pkg.basePrice) || 0) * 100) / 100,
          popularity: ordersCount,
        };
      })
    );

    return packagesWithStats.sort((a, b) => b.popularity - a.popularity);
  }
}

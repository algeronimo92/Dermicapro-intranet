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

    const revenueData = await this.prisma.serviceInstance.aggregate({
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

    // Obtener datos de órdenes agrupados por servicio (tratamiento base,
    // no por paquete/variante — así x1 y x6 del mismo tratamiento suman juntos)
    const ordersByService = await this.prisma.serviceInstance.groupBy({
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
        const totalAppointments = await this.prisma.session.count({
          where: {
            serviceInstance: {
              serviceId: order.serviceId,
              createdAt: {
                gte: dateRange.gte,
                lte: dateRange.lte,
              },
            },
          },
        });

        const completedAppointments =
          await this.prisma.session.count({
            where: {
              serviceInstance: {
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
    const priceData = await this.prisma.servicePackage.aggregate({
      _avg: {
        price: true,
      },
      _min: {
        price: true,
      },
      _max: {
        price: true,
      },
      where: {
        isActive: true,
        deletedAt: null,
      },
    });

    return {
      averageServicePrice: Math.round((Number(priceData._avg.price) || 0) * 100) / 100,
      priceRange: {
        min: Math.round((Number(priceData._min.price) || 0) * 100) / 100,
        max: Math.round((Number(priceData._max.price) || 0) * 100) / 100,
      },
    };
  }

  private async getPackagesData(dateRange: {
    gte: Date;
    lte: Date;
  }): Promise<ServiceAnalyticsData['packages']> {
    // Paquetes reales del catálogo (antes: heurística por nombre "Paquete"/"Package")
    const packages = await this.prisma.servicePackage.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        price: true,
        label: true,
        service: {
          select: { name: true },
        },
      },
    });

    if (packages.length === 0) {
      return [];
    }

    // Calcular popularidad de cada paquete
    const packagesWithStats = await Promise.all(
      packages.map(async (pkg) => {
        const ordersCount = await this.prisma.serviceInstance.count({
          where: {
            servicePackageId: pkg.id,
            createdAt: {
              gte: dateRange.gte,
              lte: dateRange.lte,
            },
          },
        });

        return {
          packageId: pkg.id,
          packageName: `${pkg.service.name}${pkg.label ? ` (${pkg.label})` : ''}`,
          serviceName: pkg.service.name,
          price: Math.round((Number(pkg.price) || 0) * 100) / 100,
          popularity: ordersCount,
        };
      })
    );

    return packagesWithStats.sort((a, b) => b.popularity - a.popularity);
  }
}

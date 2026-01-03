import { BaseDashboardStrategy } from './base.strategy';
import {
  NurseDashboardData,
  DashboardFilters,
} from '../../../types/dashboard.types';

/**
 * Estrategia para el dashboard de Enfermera
 * Enfocado en atención al paciente: citas del día, próximas citas, servicios
 */
export class NurseDashboardStrategy extends BaseDashboardStrategy {
  async execute(
    _userId: string,
    _filters?: DashboardFilters
  ): Promise<NurseDashboardData> {
    const today = this.getToday();
    const tomorrow = this.getTomorrow();

    // Ejecutar queries en paralelo
    const [todayAppointments, upcomingAppointments, attendedToday, topServices] =
      await Promise.all([
        this.getTodayAppointments(today, tomorrow),
        this.getUpcomingAppointments(tomorrow),
        this.getAttendedTodayCount(today, tomorrow),
        this.getTopServices(),
      ]);

    return {
      appointments: {
        today: todayAppointments,
        upcoming: upcomingAppointments,
      },
      patients: {
        attendedToday,
        scheduledToday: todayAppointments.length,
      },
      services: {
        topPerformed: topServices,
      },
    };
  }

  /**
   * Obtiene las citas programadas para hoy
   */
  private async getTodayAppointments(today: Date, tomorrow: Date) {
    return await this.prisma.appointment.findMany({
      where: {
        scheduledDate: {
          gte: today,
          lt: tomorrow,
        },
        status: {
          not: 'cancelled',
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dni: true,
            phone: true,
          },
        },
        appointmentServices: {
          where: {
            deletedAt: null, // Solo servicios activos
          },
          include: {
            order: {
              include: {
                service: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        scheduledDate: 'asc',
      },
    });
  }

  /**
   * Obtiene las próximas citas (siguiente semana)
   */
  private async getUpcomingAppointments(tomorrow: Date) {
    const nextWeek = new Date(tomorrow);
    nextWeek.setDate(nextWeek.getDate() + 7);

    return await this.prisma.appointment.findMany({
      where: {
        scheduledDate: {
          gte: tomorrow,
          lt: nextWeek,
        },
        status: {
          in: ['reserved', 'in_progress'],
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dni: true,
          },
        },
      },
      orderBy: {
        scheduledDate: 'asc',
      },
      take: 10, // Limitar a 10 próximas citas
    });
  }

  /**
   * Cuenta los pacientes atendidos hoy
   */
  private async getAttendedTodayCount(today: Date, tomorrow: Date) {
    return await this.prisma.appointment.count({
      where: {
        attendedAt: {
          gte: today,
          lt: tomorrow,
        },
        status: 'attended',
      },
    });
  }

  /**
   * Obtiene los servicios más realizados (último mes)
   */
  private async getTopServices() {
    const monthAgo = this.getDaysAgo(30);

    // Agrupar por orderId para contar servicios
    const topOrders = await this.prisma.appointmentService.groupBy({
      by: ['orderId'],
      _count: true,
      where: {
        appointment: {
          status: 'attended',
          attendedAt: {
            gte: monthAgo,
          },
        },
        deletedAt: null,
      },
      orderBy: {
        _count: {
          orderId: 'desc',
        },
      },
      take: 5,
    });

    // Obtener detalles de los servicios
    const orderIds = topOrders.map((o) => o.orderId);
    const orders = await this.prisma.order.findMany({
      where: {
        id: { in: orderIds },
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Mapear resultados
    return topOrders.map((topOrder) => {
      const order = orders.find((o) => o.id === topOrder.orderId);
      return {
        serviceId: order?.service.id || '',
        name: order?.service.name || 'Desconocido',
        count: topOrder._count,
      };
    });
  }
}

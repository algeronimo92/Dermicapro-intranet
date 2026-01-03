import { PrismaClient } from '@prisma/client';
import { BaseAnalyticsStrategy } from './BaseAnalyticsStrategy';
import {
  AnalyticsFilters,
  OperationsAnalyticsData,
} from '../../../types/analytics.types';

export class OperationsAnalyticsStrategy extends BaseAnalyticsStrategy<OperationsAnalyticsData> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async execute(filters?: AnalyticsFilters): Promise<OperationsAnalyticsData> {
    this.validateFilters(filters);
    const dateRange = this.getDateRange(filters);

    const [
      appointmentsStats,
      schedulingData,
      utilizationData,
      upcomingAppointments,
    ] = await Promise.all([
      this.getAppointmentsStats(dateRange),
      this.getSchedulingData(dateRange),
      this.getUtilizationData(dateRange),
      this.getUpcomingAppointments(),
    ]);

    return {
      appointments: appointmentsStats,
      scheduling: schedulingData,
      utilization: utilizationData,
      upcomingAppointments,
    };
  }

  private async getAppointmentsStats(dateRange: {
    start: Date;
    end: Date;
  }): Promise<OperationsAnalyticsData['appointments']> {
    const appointmentsByStatus = await this.prisma.appointment.groupBy({
      by: ['status'],
      _count: true,
      where: {
        scheduledDate: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
    });

    const total = appointmentsByStatus.reduce(
      (sum, item) => sum + item._count,
      0
    );
    const attended =
      appointmentsByStatus.find((item) => item.status === 'attended')?._count ||
      0;
    const cancelled =
      appointmentsByStatus.find((item) => item.status === 'cancelled')?._count ||
      0;
    const noShows =
      appointmentsByStatus.find((item) => item.status === 'no_show')?._count ||
      0;

    const attendanceRate = total > 0 ? (attended / total) * 100 : 0;

    return {
      total,
      completed: attended,
      cancelled,
      noShows,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
    };
  }

  private async getSchedulingData(dateRange: {
    start: Date;
    end: Date;
  }): Promise<OperationsAnalyticsData['scheduling']> {
    // Obtener todas las citas en el rango
    const appointments = await this.prisma.appointment.findMany({
      where: {
        scheduledDate: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
      select: {
        scheduledDate: true,
      },
    });

    // Agrupar por día de la semana
    const dayNames = [
      'Domingo',
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
    ];
    const byDayOfWeek = new Array(7).fill(0).map((_, i) => ({
      day: dayNames[i],
      count: 0,
    }));

    // Agrupar por hora del día
    const byTimeSlot = new Array(24).fill(0).map((_, i) => ({
      hour: i,
      count: 0,
    }));

    appointments.forEach((apt) => {
      const date = new Date(apt.scheduledDate);
      byDayOfWeek[date.getDay()].count++;
      byTimeSlot[date.getHours()].count++;
    });

    // Calcular tiempo de espera promedio (mock por ahora)
    const averageWaitTime = 15; // TODO: Implementar cálculo real si hay datos de check-in

    return {
      byDayOfWeek: byDayOfWeek.filter((item) => item.count > 0),
      byTimeSlot: byTimeSlot.filter((item) => item.count > 0),
      averageWaitTime,
    };
  }

  private async getUtilizationData(dateRange: {
    start: Date;
    end: Date;
  }): Promise<OperationsAnalyticsData['utilization']> {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        scheduledDate: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
      select: {
        scheduledDate: true,
      },
    });

    // Agrupar por hora
    const hourCounts = new Map<number, number>();
    appointments.forEach((apt) => {
      const hour = new Date(apt.scheduledDate).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    // Calcular tasa de utilización (asumiendo 8 horas laborales por día)
    const totalDays = Math.ceil(
      (dateRange.end.getTime() - dateRange.start.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const totalAvailableSlots = totalDays * 8 * 4; // 8 horas * 4 slots por hora
    const totalAppointments = appointments.length;
    const rate =
      totalAvailableSlots > 0
        ? (totalAppointments / totalAvailableSlots) * 100
        : 0;

    // Identificar horas pico y bajas
    const sortedHours = Array.from(hourCounts.entries()).sort(
      (a, b) => b[1] - a[1]
    );
    const peakHours = sortedHours
      .slice(0, 3)
      .map(([hour]) => `${hour}:00 - ${hour + 1}:00`);
    const lowHours = sortedHours
      .slice(-3)
      .reverse()
      .map(([hour]) => `${hour}:00 - ${hour + 1}:00`);

    return {
      rate: Math.round(rate * 100) / 100,
      peakHours,
      lowHours,
    };
  }

  private async getUpcomingAppointments(): Promise<
    OperationsAnalyticsData['upcomingAppointments']
  > {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        scheduledDate: {
          gte: now,
          lte: nextWeek,
        },
        status: {
          in: ['reserved', 'in_progress'],
        },
      },
      take: 10,
      orderBy: {
        scheduledDate: 'asc',
      },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        appointmentServices: {
          include: {
            order: {
              include: {
                service: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return appointments.map((apt) => ({
      id: apt.id,
      scheduledDate: apt.scheduledDate,
      patient: {
        firstName: apt.patient.firstName,
        lastName: apt.patient.lastName,
      },
      services: apt.appointmentServices.map(
        (as) => as.order.service.name
      ),
      status: apt.status,
    }));
  }
}

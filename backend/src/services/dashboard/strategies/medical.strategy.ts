import { BaseDashboardStrategy } from './base.strategy';
import { MedicalDashboardData, DashboardFilters } from '../../../types/dashboard.types';

/**
 * Dashboard del médico/personal médico
 * Vista clínica personal: procedimientos propios, agenda del día, rendimiento
 */
export class MedicalDashboardStrategy extends BaseDashboardStrategy {
  async execute(userId: string, _filters?: DashboardFilters): Promise<MedicalDashboardData> {
    const today = this.getToday();
    const tomorrow = this.getTomorrow();
    const weekAgo = this.getDaysAgo(7);
    const monthAgo = this.getDaysAgo(30);

    const [scheduledForClinic, attendedByMe, pendingToday, upcoming, personal] =
      await Promise.all([
        // Total citas del día en la clínica (contexto general)
        this.prisma.appointment.count({
          where: {
            scheduledDate: { gte: today, lt: tomorrow },
            status: { not: 'cancelled' },
          },
        }),

        // Cuántas atendí yo personalmente hoy
        this.prisma.appointment.count({
          where: {
            attendedById: userId,
            attendedAt: { gte: today, lt: tomorrow },
          },
        }),

        // Citas de hoy pendientes de atención
        this.prisma.appointment.findMany({
          where: {
            scheduledDate: { gte: today, lt: tomorrow },
            status: { in: ['reserved', 'in_progress'] },
          },
          include: {
            patient: {
              select: { id: true, firstName: true, lastName: true, phone: true },
            },
            appointmentServices: {
              where: { deletedAt: null },
              include: {
                serviceInstance: {
                  include: { service: { select: { id: true, name: true } } },
                },
              },
            },
          },
          orderBy: { scheduledDate: 'asc' },
        }),

        // Próximas citas de la clínica
        this.prisma.appointment.findMany({
          where: {
            scheduledDate: { gte: tomorrow },
            status: { in: ['reserved', 'in_progress'] },
          },
          include: {
            patient: { select: { id: true, firstName: true, lastName: true } },
            appointmentServices: {
              where: { deletedAt: null },
              include: {
                serviceInstance: {
                  include: { service: { select: { id: true, name: true } } },
                },
              },
            },
          },
          orderBy: { scheduledDate: 'asc' },
          take: 10,
        }),

        // Mis estadísticas personales
        this.getPersonalStats(userId, weekAgo, monthAgo),
      ]);

    return {
      today: { scheduledForClinic, attendedByMe, pendingToday },
      personal,
      upcoming,
    };
  }

  private async getPersonalStats(userId: string, weekAgo: Date, monthAgo: Date) {
    const [attendedThisWeek, attendedThisMonth, myTopServices] = await Promise.all([
      this.prisma.appointment.count({
        where: { attendedById: userId, attendedAt: { gte: weekAgo } },
      }),
      this.prisma.appointment.count({
        where: { attendedById: userId, attendedAt: { gte: monthAgo } },
      }),
      this.getMyTopServices(userId, monthAgo),
    ]);

    return { attendedThisWeek, attendedThisMonth, myTopServices };
  }

  private async getMyTopServices(userId: string, since: Date) {
    const sessions = await this.prisma.session.groupBy({
      by: ['serviceInstanceId'],
      _count: true,
      where: {
        appointment: { attendedById: userId, attendedAt: { gte: since } },
        deletedAt: null,
      },
      orderBy: { _count: { serviceInstanceId: 'desc' } },
      take: 5,
    });

    if (sessions.length === 0) return [];

    const ids = sessions.map((s) => s.serviceInstanceId);
    const instances = await this.prisma.serviceInstance.findMany({
      where: { id: { in: ids } },
      include: { service: { select: { id: true, name: true } } },
    });

    return sessions.map((s) => {
      const inst = instances.find((i) => i.id === s.serviceInstanceId);
      return {
        serviceTemplateId: inst?.service?.id || '',
        name: inst?.service?.name || 'Desconocido',
        count: s._count,
      };
    });
  }
}

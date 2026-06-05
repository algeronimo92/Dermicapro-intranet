import { BaseDashboardStrategy } from './base.strategy';
import { AssistantDashboardData, DashboardFilters } from '../../../types/dashboard.types';

/**
 * Dashboard de la asistente/enfermera
 * Cola clínica operacional: quién espera, quién está en atención, quién ya salió
 */
export class AssistantDashboardStrategy extends BaseDashboardStrategy {
  async execute(_userId: string, _filters?: DashboardFilters): Promise<AssistantDashboardData> {
    const today = this.getToday();
    const tomorrow = this.getTomorrow();
    const weekAgo = this.getDaysAgo(7);
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const [todayQueue, weekByStatus] = await Promise.all([
      this.getTodayQueue(today, tomorrow),
      this.prisma.appointment.groupBy({
        by: ['status'],
        _count: true,
        where: {
          scheduledDate: { gte: weekAgo, lte: now },
          status: { not: 'cancelled' },
        },
      }),
    ]);

    // KPIs del día
    const waiting    = todayQueue.filter((a) => a.status === 'reserved').length;
    const inProgress = todayQueue.filter((a) => a.status === 'in_progress').length;
    const attended   = todayQueue.filter((a) => a.status === 'attended').length;
    const noShow     = todayQueue.filter((a) => a.status === 'no_show').length;
    const finalized  = attended + noShow;
    const attendanceRate = finalized > 0 ? Math.round((attended / finalized) * 100) : 0;

    // Próximas 2 horas — solo las reservadas que aún no entraron
    const nextUp = todayQueue
      .filter((a) => {
        const t = new Date(a.scheduledDate);
        return a.status === 'reserved' && t >= now && t <= twoHoursLater;
      })
      .slice(0, 5)
      .map((a) => ({
        id: a.id,
        scheduledDate: a.scheduledDate.toISOString(),
        minutesUntil: Math.round((new Date(a.scheduledDate).getTime() - now.getTime()) / 60000),
        patient: { firstName: a.patient.firstName, lastName: a.patient.lastName },
        services: this.extractServices(a.appointmentServices),
      }));

    // Cola completa del día
    const queue = todayQueue.map((a) => ({
      id: a.id,
      scheduledDate: a.scheduledDate.toISOString(),
      status: a.status,
      durationMinutes: a.durationMinutes || 60,
      patient: {
        id: a.patient.id,
        firstName: a.patient.firstName,
        lastName: a.patient.lastName,
        phone: a.patient.phone || '',
      },
      services: this.extractServices(a.appointmentServices),
    }));

    // Resumen semanal
    const weekTotal    = weekByStatus.reduce((s, i) => s + i._count, 0);
    const weekAttended = weekByStatus.find((s) => s.status === 'attended')?._count || 0;
    const weekNoShow   = weekByStatus.find((s) => s.status === 'no_show')?._count || 0;
    const weekFinalized = weekAttended + weekNoShow;
    const noShowRate = weekFinalized > 0 ? Math.round((weekNoShow / weekFinalized) * 100) : 0;

    return {
      today: { total: todayQueue.length, waiting, inProgress, attended, noShow, attendanceRate },
      queue,
      nextUp,
      week: { total: weekTotal, attended: weekAttended, noShow: weekNoShow, noShowRate },
    };
  }

  private async getTodayQueue(today: Date, tomorrow: Date) {
    return this.prisma.appointment.findMany({
      where: {
        scheduledDate: { gte: today, lt: tomorrow },
        status: { not: 'cancelled' },
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
    });
  }

  private extractServices(appointmentServices: any[]): string[] {
    return appointmentServices
      .map((as) => as.serviceInstance?.service?.name)
      .filter(Boolean);
  }
}

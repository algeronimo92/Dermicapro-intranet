import { PrismaClient } from '@prisma/client';
import { BaseAnalyticsStrategy } from './BaseAnalyticsStrategy';
import {
  AnalyticsFilters,
  CustomerAnalyticsData,
} from '../../../types/analytics.types';

export class CustomerAnalyticsStrategy extends BaseAnalyticsStrategy<CustomerAnalyticsData> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async execute(filters?: AnalyticsFilters): Promise<CustomerAnalyticsData> {
    this.validateFilters(filters);
    const dateRange = this.getDateRange(filters);

    const [overview, demographics, lifetime, retention] = await Promise.all([
      this.getOverview(dateRange),
      this.getDemographics(),
      this.getLifetimeData(dateRange),
      this.getRetentionData(dateRange),
    ]);

    return {
      overview,
      demographics,
      lifetime,
      retention,
    };
  }

  private async getOverview(dateRange: {
    gte: Date;
    lte: Date;
  }): Promise<CustomerAnalyticsData['overview']> {
    const totalPatients = await this.prisma.patient.count();

    const newPatients = await this.prisma.patient.count({
      where: {
        createdAt: {
          gte: dateRange.gte,
          lte: dateRange.lte,
        },
      },
    });

    // Pacientes que han tenido al menos 2 citas
    const patientsWithMultipleAppointments = await this.prisma.patient.findMany(
      {
        where: {
          appointments: {
            some: {
              scheduledDate: {
                gte: dateRange.gte,
                lte: dateRange.lte,
              },
            },
          },
        },
        include: {
          _count: {
            select: {
              appointments: true,
            },
          },
        },
      }
    );

    const returningPatients = patientsWithMultipleAppointments.filter(
      (p) => p._count.appointments > 1
    ).length;

    // Calcular churn rate (pacientes que no han vuelto en 90 días)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const churnedPatients = await this.prisma.patient.count({
      where: {
        appointments: {
          every: {
            scheduledDate: {
              lt: ninetyDaysAgo,
            },
          },
        },
      },
    });

    const churnRate = totalPatients > 0 ? (churnedPatients / totalPatients) * 100 : 0;

    return {
      totalPatients,
      newPatients,
      returningPatients,
      churnRate: Math.round(churnRate * 100) / 100,
    };
  }

  private async getDemographics(): Promise<
    CustomerAnalyticsData['demographics']
  > {
    // Agrupar por género
    const byGender = await this.prisma.patient.groupBy({
      by: ['sex'],
      _count: true,
    });

    const totalPatients = byGender.reduce((sum, item) => sum + item._count, 0);

    const genderData = byGender.map((item) => ({
      gender: item.sex || 'No especificado',
      count: item._count,
      percentage: totalPatients > 0 ? Math.round(((item._count / totalPatients) * 100) * 100) / 100 : 0,
    }));

    // Agrupar por rango de edad
    const patients = await this.prisma.patient.findMany({
      select: {
        dateOfBirth: true,
      },
    });

    const ageRanges = {
      '18-25': 0,
      '26-35': 0,
      '36-45': 0,
      '46-55': 0,
      '56+': 0,
    };

    const now = new Date();
    patients.forEach((patient) => {
      if (!patient.dateOfBirth) return;

      const age = now.getFullYear() - patient.dateOfBirth.getFullYear();

      if (age >= 18 && age <= 25) ageRanges['18-25']++;
      else if (age >= 26 && age <= 35) ageRanges['26-35']++;
      else if (age >= 36 && age <= 45) ageRanges['36-45']++;
      else if (age >= 46 && age <= 55) ageRanges['46-55']++;
      else if (age >= 56) ageRanges['56+']++;
    });

    const ageData = Object.entries(ageRanges).map(([range, count]) => ({
      range,
      count,
      percentage: totalPatients > 0 ? Math.round(((count / totalPatients) * 100) * 100) / 100 : 0,
    }));

    return {
      byGender: genderData,
      byAgeRange: ageData,
    };
  }

  private async getLifetimeData(dateRange: {
    gte: Date;
    lte: Date;
  }): Promise<CustomerAnalyticsData['lifetime']> {
    // Calcular CLV (Customer Lifetime Value) promedio
    // Obtener todas las órdenes agrupadas por paciente
    const patientsWithOrders = await this.prisma.patient.findMany({
      include: {
        appointments: {
          include: {
            appointmentServices: {
              include: {
                order: true,
              },
            },
          },
        },
      },
    });

    const clvData = patientsWithOrders.map((patient) => {
      // Usar un Set para evitar contar la misma orden múltiples veces
      const uniqueOrders = new Set<string>();
      let totalSpent = 0;

      patient.appointments.forEach((apt) => {
        apt.appointmentServices.forEach((as) => {
          if (as.order && as.orderId && !uniqueOrders.has(as.orderId)) {
            uniqueOrders.add(as.orderId);
            totalSpent += Number(as.order.finalPrice) || 0;
          }
        });
      });

      return {
        patientId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        totalSpent: parseFloat(totalSpent.toFixed(2)),
        appointmentsCount: patient.appointments.length,
      };
    });

    const averageCLV =
      clvData.length > 0
        ? clvData.reduce((sum, p) => sum + p.totalSpent, 0) / clvData.length
        : 0;

    // Top 10 customers
    const topCustomers = clvData
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    return {
      averageCLV: parseFloat(averageCLV.toFixed(2)),
      topCustomers,
    };
  }

  private async getRetentionData(dateRange: {
    gte: Date;
    lte: Date;
  }): Promise<CustomerAnalyticsData['retention']> {
    // Pacientes que tuvieron citas en el período
    const patientsInPeriod = await this.prisma.patient.findMany({
      where: {
        appointments: {
          some: {
            scheduledDate: {
              gte: dateRange.gte,
              lte: dateRange.lte,
            },
          },
        },
      },
      include: {
        _count: {
          select: {
            appointments: true,
          },
        },
      },
    });

    // Pacientes que regresaron (más de 1 cita)
    const returningPatients = patientsInPeriod.filter(
      (p) => p._count.appointments > 1
    ).length;

    const retentionRate =
      patientsInPeriod.length > 0
        ? (returningPatients / patientsInPeriod.length) * 100
        : 0;

    const repeatCustomerRate =
      patientsInPeriod.length > 0
        ? (returningPatients / patientsInPeriod.length) * 100
        : 0;

    // Calcular días promedio entre visitas
    const appointmentDates = await this.prisma.appointment.findMany({
      where: {
        scheduledDate: {
          gte: dateRange.gte,
          lte: dateRange.lte,
        },
      },
      orderBy: {
        scheduledDate: 'asc',
      },
      select: {
        patientId: true,
        scheduledDate: true,
      },
    });

    // Agrupar por paciente
    const patientAppointments = new Map<string, Date[]>();
    appointmentDates.forEach((apt) => {
      const dates = patientAppointments.get(apt.patientId) || [];
      dates.push(apt.scheduledDate);
      patientAppointments.set(apt.patientId, dates);
    });

    // Calcular días entre visitas
    let totalDays = 0;
    let count = 0;
    patientAppointments.forEach((dates) => {
      if (dates.length < 2) return;
      for (let i = 1; i < dates.length; i++) {
        const daysDiff =
          (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24);
        totalDays += daysDiff;
        count++;
      }
    });

    const averageDaysBetweenVisits = count > 0 ? totalDays / count : 0;

    return {
      rate: Math.round(retentionRate * 100) / 100,
      repeatCustomerRate: Math.round(repeatCustomerRate * 100) / 100,
      averageDaysBetweenVisits: Math.round(averageDaysBetweenVisits),
    };
  }
}

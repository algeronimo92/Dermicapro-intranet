import { PrismaClient } from '@prisma/client';
import { DashboardData, DashboardFilters } from '../../../types/dashboard.types';

/**
 * Interface que define el contrato para todas las estrategias de dashboard
 * Strategy Pattern: Cada rol implementa su propia estrategia
 */
export interface DashboardStrategy {
  execute(userId: string, filters?: DashboardFilters): Promise<DashboardData>;
}

/**
 * Clase base abstracta que proporciona helpers comunes para todas las estrategias
 */
export abstract class BaseDashboardStrategy implements DashboardStrategy {
  constructor(protected prisma: PrismaClient) {}

  /**
   * Método abstracto que cada estrategia debe implementar
   */
  abstract execute(
    userId: string,
    filters?: DashboardFilters
  ): Promise<DashboardData>;

  /**
   * Helper: Obtiene rango de fechas basado en el período
   */
  protected getDateRange(period?: string): { gte: Date; lte: Date } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (period) {
      case 'today':
        return {
          gte: today,
          lte: new Date(today.getTime() + 86400000), // +1 día
        };
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { gte: weekAgo, lte: now };
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return { gte: monthAgo, lte: now };
      case 'year':
        const yearAgo = new Date(today);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        return { gte: yearAgo, lte: now };
      default:
        // Por defecto: último mes
        const defaultMonthAgo = new Date(today);
        defaultMonthAgo.setMonth(defaultMonthAgo.getMonth() - 1);
        return { gte: defaultMonthAgo, lte: now };
    }
  }

  /**
   * Helper: Agrupa datos por mes
   * Convierte array de registros con fecha en formato { month: 'YYYY-MM', amount: number }
   */
  protected groupByMonth(
    data: Array<{ createdAt: Date; _sum: any }>
  ): Array<{ month: string; amount: number }> {
    const grouped = new Map<string, number>();

    data.forEach((item) => {
      const month = new Date(item.createdAt).toISOString().slice(0, 7); // YYYY-MM
      const amount = Number(item._sum.finalPrice || item._sum.totalAmount || 0);
      grouped.set(month, (grouped.get(month) || 0) + amount);
    });

    return Array.from(grouped.entries())
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Helper: Obtiene el inicio del día actual
   */
  protected getToday(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  /**
   * Helper: Obtiene el final del día actual
   */
  protected getTomorrow(): Date {
    const tomorrow = this.getToday();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  /**
   * Helper: Obtiene hace N días
   */
  protected getDaysAgo(days: number): Date {
    const date = this.getToday();
    date.setDate(date.getDate() - days);
    return date;
  }
}

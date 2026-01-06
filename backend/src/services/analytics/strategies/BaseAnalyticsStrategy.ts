import { PrismaClient } from '@prisma/client';
import { AnalyticsFilters, TrendData } from '../../../types/analytics.types';
import { IAnalyticsStrategy } from './IAnalyticsStrategy';

export abstract class BaseAnalyticsStrategy<T> implements IAnalyticsStrategy<T> {
  constructor(protected prisma: PrismaClient) {}

  // Template Method (puede ser sobreescrito)
  async execute(filters?: AnalyticsFilters): Promise<T> {
    this.validateFilters(filters);
    const dateRange = this.getDateRange(filters);
    const data = await this.fetchData(dateRange, filters);
    return this.transformData(data);
  }

  // Hook method (puede ser sobreescrito)
  protected async fetchData(
    _dateRange: { gte: Date; lte: Date },
    _filters?: AnalyticsFilters
  ): Promise<any> {
    // Default implementation - las clases hijas pueden sobrescribir
    return {};
  }

  // Hook method (puede ser sobreescrito)
  protected transformData(data: any): T {
    return data as T;
  }

  // Validación
  validateFilters(filters?: AnalyticsFilters): void {
    if (filters?.period === 'custom') {
      if (!filters.startDate || !filters.endDate) {
        throw new Error('Custom period requires startDate and endDate');
      }
      if (filters.startDate > filters.endDate) {
        throw new Error('startDate must be before endDate');
      }
    }
  }

  // Helper: obtener rango de fechas
  protected getDateRange(filters?: AnalyticsFilters): { gte: Date; lte: Date } {
    const now = new Date();
    let gte: Date;
    let lte: Date = now;

    switch (filters?.period) {
      case 'today':
        gte = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        gte = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        gte = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        gte = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      case 'custom':
        gte = filters!.startDate!;
        lte = filters!.endDate!;
        break;
      default:
        gte = new Date(now.setMonth(now.getMonth() - 1));
    }

    return { gte, lte };
  }

  // Helper: convertir Decimal a number
  protected decimalToNumber(value: any): number {
    if (!value) return 0;
    return parseFloat(value.toString());
  }

  // Helper: calcular porcentaje
  protected formatPercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100 * 100) / 100;
  }

  // Helper: agrupar por mes
  protected groupByMonth<T extends { createdAt?: Date; paymentDate?: Date }>(
    data: T[]
  ): TrendData[] {
    const grouped = new Map<string, number>();

    data.forEach(item => {
      const date = item.createdAt || item.paymentDate || new Date();
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      const current = grouped.get(monthKey) || 0;
      grouped.set(monthKey, current + 1);
    });

    return Array.from(grouped.entries())
      .map(([month, value]) => ({ month, value }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }
}

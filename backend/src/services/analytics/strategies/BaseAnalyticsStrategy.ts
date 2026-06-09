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
        throw new Error('El período personalizado requiere startDate y endDate');
      }
      if (filters.startDate > filters.endDate) {
        throw new Error('startDate debe ser anterior a endDate');
      }
    }
  }

  // Helper: obtener rango de fechas
  protected getDateRange(filters?: AnalyticsFilters): { gte: Date; lte: Date } {
    // lte siempre es "ahora" — usar new Date() para no compartir referencia con gte
    const lte = new Date();

    if (filters?.period === 'custom') {
      return { gte: filters.startDate!, lte: filters.endDate! };
    }

    // Calcular gte copiando lte para no mutar el objeto lte
    const gte = new Date(lte);

    switch (filters?.period) {
      case 'today':
        gte.setHours(0, 0, 0, 0);
        break;
      case 'week':
        gte.setDate(gte.getDate() - 7);
        break;
      case 'year':
        gte.setFullYear(gte.getFullYear() - 1);
        break;
      case 'month':
      default:
        gte.setMonth(gte.getMonth() - 1);
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

import { PrismaClient } from '@prisma/client';
import { AnalyticsFilters } from '../../types/analytics.types';
import { ExecutiveSummaryStrategy } from './strategies/ExecutiveSummaryStrategy';

class AnalyticsService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async getExecutiveSummary(filters?: AnalyticsFilters) {
    const strategy = new ExecutiveSummaryStrategy(this.prisma);
    return strategy.execute(filters);
  }

  // Methods for other analytics will be added later
}

export const analyticsService = new AnalyticsService();

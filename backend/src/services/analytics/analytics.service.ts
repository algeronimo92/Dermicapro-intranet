import { PrismaClient } from '@prisma/client';
import { AnalyticsFilters } from '../../types/analytics.types';
import { ExecutiveSummaryStrategy } from './strategies/ExecutiveSummaryStrategy';
import { FinancialAnalyticsStrategy } from './strategies/FinancialAnalyticsStrategy';
import { OperationsAnalyticsStrategy } from './strategies/OperationsAnalyticsStrategy';
import { SalesAnalyticsStrategy } from './strategies/SalesAnalyticsStrategy';
import { CustomerAnalyticsStrategy } from './strategies/CustomerAnalyticsStrategy';
import { ServiceAnalyticsStrategy } from './strategies/ServiceAnalyticsStrategy';

class AnalyticsService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async getExecutiveSummary(filters?: AnalyticsFilters) {
    const strategy = new ExecutiveSummaryStrategy(this.prisma);
    return strategy.execute(filters);
  }

  async getFinancialAnalytics(filters?: AnalyticsFilters) {
    const strategy = new FinancialAnalyticsStrategy(this.prisma);
    return strategy.execute(filters);
  }

  async getOperationsAnalytics(filters?: AnalyticsFilters) {
    const strategy = new OperationsAnalyticsStrategy(this.prisma);
    return strategy.execute(filters);
  }

  async getSalesAnalytics(filters?: AnalyticsFilters) {
    const strategy = new SalesAnalyticsStrategy(this.prisma);
    return strategy.execute(filters);
  }

  async getCustomerAnalytics(filters?: AnalyticsFilters) {
    const strategy = new CustomerAnalyticsStrategy(this.prisma);
    return strategy.execute(filters);
  }

  async getServiceAnalytics(filters?: AnalyticsFilters) {
    const strategy = new ServiceAnalyticsStrategy(this.prisma);
    return strategy.execute(filters);
  }
}

export const analyticsService = new AnalyticsService();

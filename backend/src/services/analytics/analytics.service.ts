import { PrismaClient } from '@prisma/client';
import { AnalyticsFilters } from '../../types/analytics.types';
import { ExecutiveSummaryStrategy } from './strategies/ExecutiveSummaryStrategy';
import { FinancialAnalyticsStrategy } from './strategies/FinancialAnalyticsStrategy';
import { OperationsAnalyticsStrategy } from './strategies/OperationsAnalyticsStrategy';
import { SalesAnalyticsStrategy } from './strategies/SalesAnalyticsStrategy';
import { CustomerAnalyticsStrategy } from './strategies/CustomerAnalyticsStrategy';
import { ServiceAnalyticsStrategy } from './strategies/ServiceAnalyticsStrategy';

export class AnalyticsService {
  constructor(private prisma: PrismaClient) {}

  async getExecutiveSummary(filters?: AnalyticsFilters) {
    return new ExecutiveSummaryStrategy(this.prisma).execute(filters);
  }

  async getFinancialAnalytics(filters?: AnalyticsFilters) {
    return new FinancialAnalyticsStrategy(this.prisma).execute(filters);
  }

  async getOperationsAnalytics(filters?: AnalyticsFilters) {
    return new OperationsAnalyticsStrategy(this.prisma).execute(filters);
  }

  async getSalesAnalytics(filters?: AnalyticsFilters) {
    return new SalesAnalyticsStrategy(this.prisma).execute(filters);
  }

  async getCustomerAnalytics(filters?: AnalyticsFilters) {
    return new CustomerAnalyticsStrategy(this.prisma).execute(filters);
  }

  async getServiceAnalytics(filters?: AnalyticsFilters) {
    return new ServiceAnalyticsStrategy(this.prisma).execute(filters);
  }
}

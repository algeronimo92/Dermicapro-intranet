import api from './api';
import {
  AnalyticsFilters,
  ExecutiveSummaryData,
  FinancialAnalyticsData,
} from '../types/analytics.types';

class AnalyticsService {
  async getExecutiveSummary(filters?: AnalyticsFilters): Promise<ExecutiveSummaryData> {
    const params = this.buildQueryParams(filters);
    const response = await api.get('/analytics/executive', { params });
    return response.data;
  }

  async getFinancialAnalytics(filters?: AnalyticsFilters): Promise<FinancialAnalyticsData> {
    const params = this.buildQueryParams(filters);
    const response = await api.get('/analytics/financial', { params });
    return response.data;
  }

  async getOperationsAnalytics(filters?: AnalyticsFilters): Promise<any> {
    const params = this.buildQueryParams(filters);
    const response = await api.get('/analytics/operations', { params });
    return response.data;
  }

  async getSalesAnalytics(filters?: AnalyticsFilters): Promise<any> {
    const params = this.buildQueryParams(filters);
    const response = await api.get('/analytics/sales', { params });
    return response.data;
  }

  async getCustomerAnalytics(filters?: AnalyticsFilters): Promise<any> {
    const params = this.buildQueryParams(filters);
    const response = await api.get('/analytics/customers', { params });
    return response.data;
  }

  async getServiceAnalytics(filters?: AnalyticsFilters): Promise<any> {
    const params = this.buildQueryParams(filters);
    const response = await api.get('/analytics/services', { params });
    return response.data;
  }

  private buildQueryParams(filters?: AnalyticsFilters): any {
    if (!filters) return {};

    const params: any = {};

    if (filters.period) {
      params.period = filters.period;
    }

    if (filters.period === 'custom' && filters.startDate && filters.endDate) {
      params.startDate = filters.startDate.toISOString();
      params.endDate = filters.endDate.toISOString();
    }

    if (filters.serviceId) {
      params.serviceId = filters.serviceId;
    }

    if (filters.salesPersonId) {
      params.salesPersonId = filters.salesPersonId;
    }

    return params;
  }
}

export const analyticsService = new AnalyticsService();

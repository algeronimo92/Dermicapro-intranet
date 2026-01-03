import axios from 'axios';
import {
  AnalyticsFilters,
  ExecutiveSummaryData,
  FinancialAnalyticsData,
} from '../types/analytics.types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance with auth token
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

class AnalyticsService {
  async getExecutiveSummary(filters?: AnalyticsFilters): Promise<ExecutiveSummaryData> {
    const params = this.buildQueryParams(filters);
    const response = await axios.get(`${API_URL}/analytics/executive`, {
      params,
      headers: getAuthHeaders(),
    });
    return response.data;
  }

  async getFinancialAnalytics(filters?: AnalyticsFilters): Promise<FinancialAnalyticsData> {
    const params = this.buildQueryParams(filters);
    const response = await axios.get(`${API_URL}/analytics/financial`, {
      params,
      headers: getAuthHeaders(),
    });
    return response.data;
  }

  async getOperationsAnalytics(filters?: AnalyticsFilters): Promise<any> {
    const params = this.buildQueryParams(filters);
    const response = await axios.get(`${API_URL}/analytics/operations`, {
      params,
      headers: getAuthHeaders(),
    });
    return response.data;
  }

  async getSalesAnalytics(filters?: AnalyticsFilters): Promise<any> {
    const params = this.buildQueryParams(filters);
    const response = await axios.get(`${API_URL}/analytics/sales`, {
      params,
      headers: getAuthHeaders(),
    });
    return response.data;
  }

  async getCustomerAnalytics(filters?: AnalyticsFilters): Promise<any> {
    const params = this.buildQueryParams(filters);
    const response = await axios.get(`${API_URL}/analytics/customers`, {
      params,
      headers: getAuthHeaders(),
    });
    return response.data;
  }

  async getServiceAnalytics(filters?: AnalyticsFilters): Promise<any> {
    const params = this.buildQueryParams(filters);
    const response = await axios.get(`${API_URL}/analytics/services`, {
      params,
      headers: getAuthHeaders(),
    });
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

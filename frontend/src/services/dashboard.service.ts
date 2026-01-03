import api from './api';
import { DashboardData, DashboardFilters } from '../types/dashboard.types';

export const dashboardService = {
  async getDashboard(filters?: DashboardFilters): Promise<DashboardData> {
    const response = await api.get<{ data: DashboardData }>('/dashboard', { params: filters });
    return response.data.data;
  },
};

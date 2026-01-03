import { useState, useEffect } from 'react';
import { DashboardData, DashboardFilters } from '../types/dashboard.types';
import { dashboardService } from '../services/dashboard.service';

export const useDashboard = (period: 'today' | 'week' | 'month' | 'year' = 'month') => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, [period]);

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const filters: DashboardFilters = { period };
      const dashboardData = await dashboardService.getDashboard(filters);
      setData(dashboardData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar dashboard');
      console.error('Error loading dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = () => {
    loadDashboard();
  };

  return {
    data,
    isLoading,
    error,
    refresh,
  };
};

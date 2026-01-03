import { useState, useEffect } from 'react';
import { AnalyticsFilters } from '../types/analytics.types';

/**
 * Custom hook for fetching analytics data
 * @param fetcher - Function that fetches the analytics data
 * @param filters - Analytics filters (period, dates, etc.)
 * @returns Object with data, loading state, and error
 */
export function useAnalytics<T>(
  fetcher: (filters?: AnalyticsFilters) => Promise<T>,
  filters?: AnalyticsFilters
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const result = await fetcher(filters);

        if (isMounted) {
          setData(result);
        }
      } catch (err: any) {
        if (isMounted) {
          const errorMessage = err.response?.data?.error || err.message || 'Error loading analytics data';
          setError(errorMessage);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [fetcher, filters?.period, filters?.startDate, filters?.endDate, filters?.serviceId, filters?.salesPersonId]);

  return { data, isLoading, error };
}

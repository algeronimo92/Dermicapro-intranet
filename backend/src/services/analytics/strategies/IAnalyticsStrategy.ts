import { AnalyticsFilters } from '../../../types/analytics.types';

export interface IAnalyticsStrategy<T> {
  execute(filters?: AnalyticsFilters): Promise<T>;
  validateFilters(filters?: AnalyticsFilters): void;
}

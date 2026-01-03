import { Request, Response } from 'express';
import { analyticsService } from '../services/analytics/analytics.service';
import { AnalyticsFilters } from '../types/analytics.types';

export const getExecutiveSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters: AnalyticsFilters = {
      period: (req.query.period as any) || 'month',
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
    };

    const data = await analyticsService.getExecutiveSummary(filters);
    res.json(data);
  } catch (error: any) {
    console.error('Executive summary error:', error);
    res.status(500).json({ error: error.message || 'Error fetching executive summary' });
  }
};

export const getFinancialAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters: AnalyticsFilters = {
      period: (req.query.period as any) || 'month',
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
    };

    const data = await analyticsService.getFinancialAnalytics(filters);
    res.json(data);
  } catch (error: any) {
    console.error('Financial analytics error:', error);
    res.status(500).json({ error: error.message || 'Error fetching financial analytics' });
  }
};

export const getOperationsAnalytics = async (req: Request, res: Response): Promise<void> => {
  res.json({ message: 'Operations analytics - coming soon' });
};

export const getSalesAnalytics = async (req: Request, res: Response): Promise<void> => {
  res.json({ message: 'Sales analytics - coming soon' });
};

export const getCustomerAnalytics = async (req: Request, res: Response): Promise<void> => {
  res.json({ message: 'Customer analytics - coming soon' });
};

export const getServiceAnalytics = async (req: Request, res: Response): Promise<void> => {
  res.json({ message: 'Service analytics - coming soon' });
};

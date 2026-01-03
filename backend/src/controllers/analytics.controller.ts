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
  try {
    const filters: AnalyticsFilters = {
      period: (req.query.period as any) || 'month',
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
    };

    const data = await analyticsService.getOperationsAnalytics(filters);
    res.json(data);
  } catch (error: any) {
    console.error('Operations analytics error:', error);
    res.status(500).json({ error: error.message || 'Error fetching operations analytics' });
  }
};

export const getSalesAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters: AnalyticsFilters = {
      period: (req.query.period as any) || 'month',
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      salesPersonId: req.query.salesPersonId as string | undefined
    };

    const data = await analyticsService.getSalesAnalytics(filters);
    res.json(data);
  } catch (error: any) {
    console.error('Sales analytics error:', error);
    res.status(500).json({ error: error.message || 'Error fetching sales analytics' });
  }
};

export const getCustomerAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters: AnalyticsFilters = {
      period: (req.query.period as any) || 'month',
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
    };

    const data = await analyticsService.getCustomerAnalytics(filters);
    res.json(data);
  } catch (error: any) {
    console.error('Customer analytics error:', error);
    res.status(500).json({ error: error.message || 'Error fetching customer analytics' });
  }
};

export const getServiceAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters: AnalyticsFilters = {
      period: (req.query.period as any) || 'month',
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      serviceId: req.query.serviceId as string | undefined
    };

    const data = await analyticsService.getServiceAnalytics(filters);
    res.json(data);
  } catch (error: any) {
    console.error('Service analytics error:', error);
    res.status(500).json({ error: error.message || 'Error fetching service analytics' });
  }
};

// ============================================
// FILTERS
// ============================================
export interface AnalyticsFilters {
  period?: 'today' | 'week' | 'month' | 'year' | 'custom';
  startDate?: Date;
  endDate?: Date;
  serviceId?: string;
  salesPersonId?: string;
}

// ============================================
// COMMON TYPES
// ============================================
export interface TrendData {
  month: string;
  value: number;
}

export interface RankingItem {
  id: string;
  name: string;
  value: number;
  percentage?: number;
}

// ============================================
// EXECUTIVE SUMMARY
// ============================================
export interface ExecutiveSummaryData {
  kpis: {
    totalRevenue: number;
    totalAppointments: number;
    attendanceRate: number;
    pendingCommissions: number;
  };
  revenueTrend: TrendData[];
  topServices: {
    id: string;
    name: string;
    count: number;
    revenue: number;
  }[];
  appointmentsByStatus: {
    status: string;
    count: number;
    percentage: number;
  }[];
}

// ============================================
// FINANCIAL ANALYTICS
// ============================================
export interface FinancialAnalyticsData {
  revenue: {
    total: number;
    byPaymentMethod: {
      method: string;
      amount: number;
      count: number;
      percentage: number;
    }[];
    trend: TrendData[];
    averageTicket: number;
  };
  cashFlow: {
    daily: { date: string; amount: number }[];
    projected: number;
  };
  accountsReceivable: {
    total: number;
    aging: {
      range: string;
      amount: number;
      count: number;
    }[];
    topDebtors: {
      patientId: string;
      patientName: string;
      amount: number;
    }[];
  };
}

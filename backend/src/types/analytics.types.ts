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

// ============================================
// OPERATIONS ANALYTICS
// ============================================
export interface OperationsAnalyticsData {
  appointments: {
    total: number;
    completed: number;
    cancelled: number;
    noShows: number;
    attendanceRate: number;
  };
  scheduling: {
    byDayOfWeek: {
      day: string;
      count: number;
    }[];
    byTimeSlot: {
      hour: number;
      count: number;
    }[];
    averageWaitTime: number; // minutos
  };
  utilization: {
    rate: number; // Porcentaje de slots ocupados
    peakHours: string[];
    lowHours: string[];
  };
  upcomingAppointments: {
    id: string;
    scheduledDate: Date;
    patient: {
      firstName: string;
      lastName: string;
    };
    services: string[];
    status: string;
  }[];
}

// ============================================
// SALES ANALYTICS
// ============================================
export interface SalesAnalyticsData {
  overview: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    conversionRate: number;
  };
  salesPeople: {
    id: string;
    name: string;
    ordersCount: number;
    revenue: number;
    commissionsEarned: number;
    ranking: number;
  }[];
  commissions: {
    total: number;
    pending: number;
    approved: number;
    paid: number;
    byStatus: {
      status: string;
      amount: number;
      count: number;
    }[];
  };
  topServices: {
    serviceId: string;
    serviceName: string;
    unitsSold: number;
    revenue: number;
  }[];
}

// ============================================
// CUSTOMER ANALYTICS
// ============================================
export interface CustomerAnalyticsData {
  overview: {
    totalPatients: number;
    newPatients: number;
    returningPatients: number;
    churnRate: number;
  };
  demographics: {
    byGender: {
      gender: string;
      count: number;
      percentage: number;
    }[];
    byAgeRange: {
      range: string;
      count: number;
      percentage: number;
    }[];
  };
  lifetime: {
    averageCLV: number; // Customer Lifetime Value
    topCustomers: {
      patientId: string;
      patientName: string;
      totalSpent: number;
      appointmentsCount: number;
    }[];
  };
  retention: {
    rate: number;
    repeatCustomerRate: number;
    averageDaysBetweenVisits: number;
  };
}

// ============================================
// SERVICE ANALYTICS
// ============================================
export interface ServiceAnalyticsData {
  overview: {
    totalServices: number;
    activeServices: number;
    totalRevenue: number;
  };
  performance: {
    serviceId: string;
    serviceName: string;
    timesOrdered: number;
    revenue: number;
    averagePrice: number;
    completionRate: number;
  }[];
  pricing: {
    averageServicePrice: number;
    priceRange: {
      min: number;
      max: number;
    };
  };
  packages: {
    packageId: string;
    packageName: string;
    serviceCount: number;
    totalPrice: number;
    popularity: number;
  }[];
}

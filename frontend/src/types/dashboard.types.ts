// DTOs y tipos para los dashboards específicos por rol

export interface DashboardFilters {
  dateFrom?: string;
  dateTo?: string;
  period?: 'today' | 'week' | 'month' | 'year';
}

// ============================================
// Admin Dashboard — visión global del negocio
// ============================================
export interface AdminDashboardData {
  financials: {
    totalRevenue: number;
    pendingRevenue: number;
    paidRevenue: number;
    monthlyRevenue: Array<{ month: string; amount: number }>;
    paymentsByMethod: Array<{ method: string; amount: number }>;
  };
  appointments: {
    total: number;
    today: number;
    thisWeek: number;
    byStatus: Array<{ status: string; count: number }>;
  };
  sales: {
    totalOrders: number;
    totalOrdersValue: number;
    topServices: Array<{
      serviceId: string;
      name: string;
      count: number;
      revenue: number;
    }>;
  };
  commissions: {
    pending: number;
    approved: number;
    paid: number;
    totalAmount: number;
  };
  patients: {
    total: number;
    byPeriod: Array<{ period: string; count: number }>;
    granularity: 'day' | 'month';
  };
}

// ============================================
// Medical Staff Dashboard — médico, clínica personal
// ============================================
export interface MedicalDashboardData {
  today: {
    scheduledForClinic: number;
    attendedByMe: number;
    pendingToday: any[];
  };
  personal: {
    attendedThisWeek: number;
    attendedThisMonth: number;
    myTopServices: Array<{
      serviceId: string;
      name: string;
      count: number;
    }>;
  };
  upcoming: any[];
}

// Alias de compatibilidad
export type NurseDashboardData = MedicalDashboardData;

// ============================================
// Assistant Dashboard — asistente, cola clínica
// ============================================
export interface AssistantDashboardData {
  today: {
    total: number;
    waiting: number;
    inProgress: number;
    attended: number;
    noShow: number;
    attendanceRate: number;
  };
  queue: Array<{
    id: string;
    scheduledDate: string;
    status: string;
    durationMinutes: number;
    patient: {
      id: string;
      firstName: string;
      lastName: string;
      phone: string;
    };
    services: string[];
  }>;
  nextUp: Array<{
    id: string;
    scheduledDate: string;
    minutesUntil: number;
    patient: { firstName: string; lastName: string };
    services: string[];
  }>;
  week: {
    total: number;
    attended: number;
    noShow: number;
    noShowRate: number;
  };
}

// ============================================
// Sales Dashboard — ventas + asistencia de sus pacientes
// ============================================
export interface SalesDashboardData {
  sales: {
    totalOrders: number;
    totalRevenue: number;
    monthlyRevenue: Array<{ month: string; amount: number }>;
  };
  commissions: {
    pending: number;
    approved: number;
    paid: number;
    totalEarned: number;
    history: any[];
  };
  patients: {
    total: number;
    recentAppointments: any[];
  };
  goals: {
    monthly: number;
    achieved: number;
    percentage: number;
  };
  todayAttendance: {
    total: number;
    arrived: number;
    waiting: number;
    noShow: number;
    queue: Array<{
      id: string;
      scheduledDate: string;
      status: string;
      patient: { firstName: string; lastName: string };
      services: string[];
    }>;
  };
}

export type DashboardData =
  | AdminDashboardData
  | MedicalDashboardData
  | AssistantDashboardData
  | SalesDashboardData;

// DTOs y tipos para los dashboards específicos por rol

// ============================================
// Filtros comunes para dashboards
// ============================================
export interface DashboardFilters {
  dateFrom?: string;
  dateTo?: string;
  period?: 'today' | 'week' | 'month' | 'year';
}

// ============================================
// Admin Dashboard Data
// ============================================
export interface AdminDashboardData {
  financials: {
    totalRevenue: number;
    pendingRevenue: number;
    paidRevenue: number;
    monthlyRevenue: Array<{ month: string; amount: number }>;
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
}

// ============================================
// Nurse Dashboard Data
// ============================================
export interface NurseDashboardData {
  appointments: {
    today: any[]; // AppointmentWithRelations - tipo completo en runtime
    upcoming: any[]; // AppointmentWithRelations
  };
  patients: {
    attendedToday: number;
    scheduledToday: number;
  };
  services: {
    topPerformed: Array<{
      serviceId: string;
      name: string;
      count: number;
    }>;
  };
}

// ============================================
// Sales Dashboard Data
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
    history: any[]; // Commission with relations
  };
  patients: {
    total: number;
    recentAppointments: any[]; // Appointment with relations
  };
  goals: {
    monthly: number;
    achieved: number;
    percentage: number;
  };
}

// ============================================
// Union type para respuesta genérica
// ============================================
export type DashboardData = AdminDashboardData | NurseDashboardData | SalesDashboardData;

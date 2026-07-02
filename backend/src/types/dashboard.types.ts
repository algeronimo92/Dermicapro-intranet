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
// Medical Staff Dashboard — médico, vista clínica personal
// ============================================
export interface MedicalDashboardData {
  today: {
    scheduledForClinic: number;   // total citas del día en la clínica
    attendedByMe: number;         // que yo personalmente atendí hoy
    pendingToday: any[];          // citas pendientes de atención hoy
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
  upcoming: any[];                // próximas citas de la clínica
}

// Alias para compatibilidad (el frontend aún importa NurseDashboardData en algunos lugares)
export type NurseDashboardData = MedicalDashboardData;

// ============================================
// Assistant Dashboard — asistente/enfermera, cola clínica operacional
// ============================================
export interface AssistantDashboardData {
  today: {
    total: number;
    waiting: number;        // reserved: aún no empiezan
    inProgress: number;     // in_progress: en atención ahora
    attended: number;       // attended: ya terminaron
    noShow: number;         // no_show: no llegaron
    attendanceRate: number; // attended / (attended + noShow) * 100
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
  nextUp: Array<{           // próximas 2 horas, aún en espera
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
// Sales Dashboard — vendedora, ventas + seguimiento de asistencia
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
  todayAttendance: {          // ¿llegaron mis pacientes de hoy?
    total: number;
    arrived: number;          // attended + in_progress
    waiting: number;          // reserved (aún esperamos)
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

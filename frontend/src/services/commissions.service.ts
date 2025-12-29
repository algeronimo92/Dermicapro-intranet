import api from './api';

export interface Commission {
  id: string;
  salesPersonId: string;
  appointmentId: string;
  orderId?: string | null;
  serviceId?: string | null;
  commissionRate: number;
  baseAmount: number;
  commissionAmount: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled' | 'rejected';
  approvedAt?: string | null;
  approvedById?: string | null;
  paidAt?: string | null;
  paidById?: string | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  notes?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  salesPerson?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  appointment?: {
    id: string;
    scheduledDate: string;
    status: string;
    attendedAt?: string | null;
    patient: {
      id: string;
      firstName: string;
      lastName: string;
      dni: string;
    };
  };
  service?: {
    id: string;
    name: string;
    basePrice: number;
  };
  order?: {
    id: string;
    finalPrice: number;
    totalSessions: number;
  };
  approvedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  paidBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface CommissionsResponse {
  data: Commission[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary?: {
    totals: Array<{
      status: string;
      count: number;
      amount: number;
    }>;
  };
}

export interface CommissionSummary {
  salesPerson: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  byStatus: Record<string, { count: number; amount: number }>;
  totalAmount: number;
  totalCount: number;
}

export interface CommissionsFilters {
  page?: number;
  limit?: number;
  status?: string;
  salesPersonId?: string;
  startDate?: string;
  endDate?: string;
  serviceId?: string;
}

const commissionsService = {
  /**
   * Obtener todas las comisiones con filtros
   */
  getAllCommissions: async (filters: CommissionsFilters = {}): Promise<CommissionsResponse> => {
    const params = new URLSearchParams();

    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.status) params.append('status', filters.status);
    if (filters.salesPersonId) params.append('salesPersonId', filters.salesPersonId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.serviceId) params.append('serviceId', filters.serviceId);

    const response = await api.get(`/commissions?${params.toString()}`);
    return response.data;
  },

  /**
   * Obtener una comisión por ID
   */
  getCommissionById: async (id: string): Promise<Commission> => {
    const response = await api.get(`/commissions/${id}`);
    return response.data;
  },

  /**
   * Obtener resumen de comisiones por vendedor
   */
  getCommissionsSummary: async (startDate?: string, endDate?: string): Promise<CommissionSummary[]> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await api.get(`/commissions/summary?${params.toString()}`);
    return response.data;
  },

  /**
   * Aprobar una comisión
   */
  approveCommission: async (id: string, notes?: string): Promise<Commission> => {
    const response = await api.post(`/commissions/${id}/approve`, { notes });
    return response.data;
  },

  /**
   * Rechazar una comisión
   */
  rejectCommission: async (id: string, rejectionReason: string): Promise<Commission> => {
    const response = await api.post(`/commissions/${id}/reject`, { rejectionReason });
    return response.data;
  },

  /**
   * Marcar comisión como pagada
   */
  markAsPaid: async (
    id: string,
    paymentMethod?: string,
    paymentReference?: string,
    notes?: string
  ): Promise<Commission> => {
    const response = await api.post(`/commissions/${id}/pay`, {
      paymentMethod,
      paymentReference,
      notes,
    });
    return response.data;
  },

  /**
   * Cancelar una comisión
   */
  cancelCommission: async (id: string, notes?: string): Promise<Commission> => {
    const response = await api.post(`/commissions/${id}/cancel`, { notes });
    return response.data;
  },

  /**
   * Aprobar múltiples comisiones en lote
   */
  batchApprove: async (commissionIds: string[], notes?: string): Promise<{ message: string; count: number }> => {
    const response = await api.post('/commissions/batch/approve', { commissionIds, notes });
    return response.data;
  },

  /**
   * Marcar múltiples comisiones como pagadas en lote
   */
  batchMarkAsPaid: async (
    commissionIds: string[],
    paymentMethod?: string,
    paymentReference?: string,
    notes?: string
  ): Promise<{ message: string; count: number }> => {
    const response = await api.post('/commissions/batch/pay', {
      commissionIds,
      paymentMethod,
      paymentReference,
      notes,
    });
    return response.data;
  },
};

export default commissionsService;

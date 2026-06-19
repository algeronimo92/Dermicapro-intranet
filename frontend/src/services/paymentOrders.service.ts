import api from './api';
import { PaymentOrder, Order, PaymentMethod } from '../types';

export interface RegisterPaymentDto {
  patientId: string;
  paymentOrderId: string;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface CreatePaymentOrderDto {
  serviceInstanceIds: string[];
  patientId: string;
  dueDate?: string;
  priceOverrides?: { id: string; finalPrice: number }[];
}

export interface PendingPaymentOrderSummary {
  id: string;
  totalAmount: number;
  totalPaid: number;
  balance: number;
  status: 'pending' | 'partial';
  createdAt: string;
  orders: {
    id: string;
    service: { id: string; name: string };
    finalPrice: number;
    totalSessions: number;
    completedSessions: number;
  }[];
}

export interface PatientFinancialSummary {
  totalBilled: number;
  totalPaid: number;
  totalBalance: number;
  totalPending: number;
  accountBalance: number;
  pendingCount: number;
  partialCount: number;
  paidCount: number;
  totalPaymentOrders: number;
  pendingPaymentOrders: PendingPaymentOrderSummary[];
  ordersWithoutPaymentOrder: {
    id: string;
    service: { id: string; name: string };
    finalPrice: number;
    totalSessions: number;
    completedSessions: number;
    createdAt: string;
  }[];
}

export const paymentOrdersService = {
  /**
   * Obtiene todas las órdenes de pago de un paciente
   */
  async getPatientPaymentOrders(patientId: string): Promise<PaymentOrder[]> {
    const response = await api.get<PaymentOrder[]>(`/payment-orders/patient/${patientId}`);
    return response.data;
  },

  /**
   * Obtiene una orden de pago por ID
   */
  async getPaymentOrderById(id: string): Promise<PaymentOrder> {
    const response = await api.get<PaymentOrder>(`/payment-orders/${id}`);
    return response.data;
  },

  /**
   * Obtiene las órdenes sin orden de pago de un paciente
   */
  async getOrdersWithoutPaymentOrder(patientId: string): Promise<Order[]> {
    const response = await api.get<Order[]>(`/payment-orders/patient/${patientId}/without-payment-order`);
    return response.data;
  },

  /**
   * Crea una nueva orden de pago para una o múltiples órdenes
   */
  async createPaymentOrder(data: CreatePaymentOrderDto): Promise<PaymentOrder> {
    const response = await api.post<PaymentOrder>('/payment-orders', data);
    return response.data;
  },

  /**
   * Registra un pago y actualiza el estado de la orden de pago.
   * Retorna { paymentId, paymentOrder } para poder subir el comprobante después.
   */
  async registerPayment(data: RegisterPaymentDto): Promise<{ paymentId: string; paymentOrder: PaymentOrder }> {
    const paymentRes = await api.post<{ id: string }>('/payments', {
      patientId: data.patientId,
      paymentOrderId: data.paymentOrderId,
      amountPaid: data.amountPaid,
      paymentMethod: data.paymentMethod,
      paymentType: 'payment_order_payment',
      notes: data.notes || undefined,
    });
    const updated = await api.post<PaymentOrder>(`/payment-orders/${data.paymentOrderId}/auto-update-status`);
    return { paymentId: paymentRes.data.id, paymentOrder: updated.data };
  },

  async uploadReceipt(paymentId: string, files: File[]): Promise<void> {
    const form = new FormData();
    files.forEach(file => form.append('receipts', file));
    await api.post(`/payments/${paymentId}/upload-receipt`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Resumen financiero completo del paciente: deuda, pagado, saldo a favor y servicios sin OP
   */
  async getPatientSummary(patientId: string): Promise<PatientFinancialSummary> {
    const response = await api.get<PatientFinancialSummary>(`/payment-orders/patient/${patientId}/summary`);
    return response.data;
  },

  /**
   * Cancela una orden de pago (solo si no tiene pagos)
   */
  async cancelPaymentOrder(id: string): Promise<PaymentOrder> {
    const response = await api.post<PaymentOrder>(`/payment-orders/${id}/cancel`);
    return response.data;
  },

  /**
   * Actualiza el estado de una orden de pago basándose en los pagos
   */
  async autoUpdatePaymentOrderStatus(id: string): Promise<PaymentOrder> {
    const response = await api.post<PaymentOrder>(`/payment-orders/${id}/auto-update-status`);
    return response.data;
  },
};

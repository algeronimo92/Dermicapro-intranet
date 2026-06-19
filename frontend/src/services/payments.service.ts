import api from './api';
import { Payment, PaginatedResponse } from '../types';

export interface CreatePaymentDto {
  patientId: string;
  paymentOrderId?: string;
  appointmentId?: string;
  amountPaid: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'yape' | 'plin';
  paymentType: 'reservation' | 'payment_order_payment' | 'service_payment';
  paymentDate?: string;
  receiptUrl?: string;
  notes?: string;
}

export interface PaymentsFilters {
  patientId?: string;
  paymentOrderId?: string;
  appointmentId?: string;
  paymentType?: string;
  page?: number;
  limit?: number;
  includeVoided?: boolean;
}

export const paymentsService = {
  async createPayment(data: CreatePaymentDto): Promise<Payment> {
    const response = await api.post<Payment>('/payments', data);
    return response.data;
  },

  async getPayments(filters?: PaymentsFilters): Promise<PaginatedResponse<Payment>> {
    const response = await api.get<PaginatedResponse<Payment>>('/payments', { params: filters });
    return response.data;
  },

  /**
   * Obtiene un pago por ID
   */
  async getPaymentById(id: string): Promise<Payment> {
    const response = await api.get<Payment>(`/payments/${id}`);
    return response.data;
  },

  /**
   * Actualiza un pago (solo notas y receiptUrl)
   */
  async updatePayment(id: string, data: { notes?: string; receiptUrl?: string }): Promise<Payment> {
    const response = await api.put<Payment>(`/payments/${id}`, data);
    return response.data;
  },

  async voidPayment(id: string, reason?: string): Promise<void> {
    await api.post(`/payments/${id}/void`, { reason });
  },

  /**
   * Sube un comprobante de pago
   */
  async uploadReceipt(paymentId: string, files: File[]): Promise<Payment> {
    const formData = new FormData();
    files.forEach(file => formData.append('receipts', file));

    const response = await api.post<Payment>(`/payments/${paymentId}/upload-receipt`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

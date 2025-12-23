import api from './api';
import { Payment } from '../types';

export interface CreatePaymentDto {
  patientId: string;
  invoiceId?: string;
  appointmentId?: string;
  amountPaid: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'yape' | 'plin';
  paymentType: 'reservation' | 'invoice_payment' | 'service_payment';
  paymentDate?: string;
  receiptUrl?: string;
  notes?: string;
}

export const paymentsService = {
  /**
   * Crea un nuevo pago
   */
  async createPayment(data: CreatePaymentDto): Promise<Payment> {
    const response = await api.post<Payment>('/payments', data);
    return response.data;
  },

  /**
   * Obtiene todos los pagos con filtros opcionales
   */
  async getPayments(filters?: {
    patientId?: string;
    invoiceId?: string;
    appointmentId?: string;
    paymentType?: string;
  }): Promise<Payment[]> {
    const response = await api.get<{ data: Payment[] }>('/payments', { params: filters });
    return response.data.data;
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

  /**
   * Elimina un pago
   */
  async deletePayment(id: string): Promise<void> {
    await api.delete(`/payments/${id}`);
  },

  /**
   * Sube un comprobante de pago
   */
  async uploadReceipt(paymentId: string, file: File): Promise<Payment> {
    const formData = new FormData();
    formData.append('receipt', file);

    const response = await api.post<Payment>(`/payments/${paymentId}/upload-receipt`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

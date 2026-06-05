import api from './api';
import { Invoice, Order, PaymentMethod } from '../types';

export interface RegisterPaymentDto {
  patientId: string;
  invoiceId: string;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface CreateInvoiceDto {
  serviceInstanceIds: string[];
  patientId: string;
  dueDate?: string;
  priceOverrides?: { id: string; finalPrice: number }[];
}

export const invoicesService = {
  /**
   * Obtiene todas las facturas de un paciente
   */
  async getPatientInvoices(patientId: string): Promise<Invoice[]> {
    const response = await api.get<Invoice[]>(`/invoices/patient/${patientId}`);
    return response.data;
  },

  /**
   * Obtiene una factura por ID
   */
  async getInvoiceById(id: string): Promise<Invoice> {
    const response = await api.get<Invoice>(`/invoices/${id}`);
    return response.data;
  },

  /**
   * Obtiene las órdenes sin facturar de un paciente
   */
  async getUninvoicedOrders(patientId: string): Promise<Order[]> {
    const response = await api.get<Order[]>(`/invoices/patient/${patientId}/uninvoiced`);
    return response.data;
  },

  /**
   * Crea una nueva factura para una o múltiples órdenes
   */
  async createInvoice(data: CreateInvoiceDto): Promise<Invoice> {
    const response = await api.post<Invoice>('/invoices', data);
    return response.data;
  },

  /**
   * Registra un pago y actualiza el estado de la factura.
   * Retorna { paymentId, invoice } para poder subir el comprobante después.
   */
  async registerPayment(data: RegisterPaymentDto): Promise<{ paymentId: string; invoice: Invoice }> {
    const paymentRes = await api.post<{ id: string }>('/payments', {
      patientId: data.patientId,
      invoiceId: data.invoiceId,
      amountPaid: data.amountPaid,
      paymentMethod: data.paymentMethod,
      paymentType: 'invoice_payment',
      notes: data.notes || undefined,
    });
    const updated = await api.post<Invoice>(`/invoices/${data.invoiceId}/auto-update-status`);
    return { paymentId: paymentRes.data.id, invoice: updated.data };
  },

  async uploadReceipt(paymentId: string, file: File): Promise<void> {
    const form = new FormData();
    form.append('receipt', file);
    await api.post(`/payments/${paymentId}/upload-receipt`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Cancela una factura (solo si no tiene pagos)
   */
  async cancelInvoice(id: string): Promise<Invoice> {
    const response = await api.post<Invoice>(`/invoices/${id}/cancel`);
    return response.data;
  },

  /**
   * Actualiza el estado de una factura basándose en los pagos
   */
  async autoUpdateInvoiceStatus(id: string): Promise<Invoice> {
    const response = await api.post<Invoice>(`/invoices/${id}/auto-update-status`);
    return response.data;
  },
};

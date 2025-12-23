import api from './api';
import { Invoice, Order } from '../types';

export interface CreateInvoiceDto {
  orderIds: string[];
  patientId: string;
  dueDate?: string;
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

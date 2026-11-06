import api from './api';

export interface InvoiceSummary {
  id: string;
  documentType: string;
  issuerRuc: string;
  issuerName: string;
  issueDate: string;
  currency: string;
  total: string;
}

export interface InvoiceDetail extends InvoiceSummary {
  customerDocument: string | null;
  customerName: string | null;
  customerAddress: string | null;
  issueTime: string | null;
  taxableSubtotal: string;
  discount: string | null;
  tax: string;
  paymentCondition: string;
  createdBy: { firstName: string; lastName: string };
  attachments: { id: string; fileName: string }[];
}

export const invoicesService = {
  async defaults(signal: AbortSignal) {
    const response = await api.get<{ customerDocument: string; customerName: string; customerAddress: string }>(
      '/invoices/defaults', { signal },
    );
    return response.data;
  },

  async list(page: number, signal: AbortSignal) {
    const response = await api.get<{ data: InvoiceSummary[]; totalPages: number }>('/invoices', {
      params: { page },
      signal,
    });
    return response.data;
  },

  async create(form: FormData) {
    const response = await api.post<{ id: string }>('/invoices', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async detail(id: string, signal: AbortSignal) {
    const response = await api.get<InvoiceDetail>(`/invoices/${id}`, { signal });
    return response.data;
  },

  async download(id: string, attachmentId: string) {
    const response = await api.get<Blob>(`/invoices/${id}/attachments/${attachmentId}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

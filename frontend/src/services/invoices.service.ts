import api from './api';

export interface InvoiceSummary {
  id: string;
  documentType: string;
  issuerRuc: string;
  issuerName: string;
  issueDate: string;
  currency: string;
  total: string;
  _count: { attachments: number };
}

export interface InvoiceFilters {
  search?: string;
  currency?: 'PEN' | 'USD';
  documentType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface InvoiceReport {
  currency: string;
  count: number;
  withoutAttachments: number;
  documentsAmount: string;
  documentsTax: string;
  creditNotes: { count: number; amount: string };
  debitNotes: { count: number; amount: string };
  monthly: { month: string; documentsAmount: string; creditNotes: string; debitNotes: string }[];
  providers: { ruc: string; name: string; total: string }[];
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

  async list(page: number, signal: AbortSignal, filters: InvoiceFilters = {}) {
    const response = await api.get<{ data: InvoiceSummary[]; total: number; totalPages: number }>('/invoices', {
      params: { ...filters, page },
      signal,
    });
    return response.data;
  },

  async report(filters: InvoiceFilters, signal: AbortSignal) {
    const response = await api.get<InvoiceReport>('/invoices/report', { params: filters, signal });
    return response.data;
  },

  async export(filters: InvoiceFilters) {
    const response = await api.get<Blob>('/invoices/export', { params: filters, responseType: 'blob' });
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

import type { InvoiceDetail } from '../services/invoices.service';

// Campos del comprobante: los usa el formulario (InvoiceEntryForm) y el detalle de Facturas.

export type InvoiceField = {
  name: Exclude<keyof InvoiceDetail, 'id' | 'revision' | 'attachments' | 'createdBy' | '_count' | 'category'>;
  label: string;
  required?: boolean;
  type?: 'date' | 'time' | 'amount';
  pattern?: string;
  maxLength?: number;
  inputMode?: 'numeric';
  options?: string[];
  defaultValue?: string;
};

export const entryGroups: { title: string; fields: InvoiceField[] }[] = [
  {
    title: 'Comprobante y emisor',
    fields: [
      { name: 'documentType', label: 'Tipo de documento', required: true, options: ['Factura', 'Boleta', 'Nota de crédito', 'Nota de débito'] },
      { name: 'issuerRuc', label: 'RUC emisor', required: true, pattern: '[0-9]{11}', maxLength: 11, inputMode: 'numeric' },
      { name: 'issuerName', label: 'Razón social emisor', required: true, maxLength: 200 },
      { name: 'issueDate', label: 'Fecha de emisión', required: true, type: 'date' },
      { name: 'issueTime', label: 'Hora de emisión', type: 'time' },
    ],
  },
  {
    title: 'Importes',
    fields: [
      { name: 'taxableSubtotal', label: 'Subtotal gravado', required: true, type: 'amount' },
      { name: 'discount', label: 'Descuento total', type: 'amount' },
      { name: 'tax', label: 'IGV', required: true, type: 'amount' },
      { name: 'total', label: 'Total', required: true, type: 'amount' },
    ],
  },
];

export const customerFields = [
  { name: 'customerDocument', label: 'Documento del cliente' },
  { name: 'customerName', label: 'Razón social del cliente' },
  { name: 'customerAddress', label: 'Dirección del cliente' },
] as const satisfies readonly InvoiceField[];

export const defaultFields: InvoiceField[] = [
  { name: 'currency', label: 'Moneda', required: true, options: ['PEN', 'USD'], defaultValue: 'PEN' },
  { name: 'paymentCondition', label: 'Condición de pago', required: true, options: ['Contado', 'Crédito'], defaultValue: 'Contado' },
];

import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { getInvoiceReport, invoiceWhere, parseInvoiceQuery } from '../invoice-report.service';

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    registeredInvoice: { groupBy: jest.fn(), count: jest.fn() },
  },
}));

const transaction = prisma.$transaction as jest.Mock;

function group(documentType: string, total: string, tax: string, date: string, count = 1) {
  return {
    documentType,
    issuerRuc: '20000000001',
    issuerName: 'Proveedor de prueba',
    issueDate: new Date(date),
    _sum: { total: new Prisma.Decimal(total), tax: new Prisma.Decimal(tax) },
    _count: { _all: count },
  };
}

beforeEach(() => jest.clearAllMocks());

describe('Filtros compartidos de facturas', () => {
  it('construye filtros de moneda, emisor, tipo y fechas inclusivas', () => {
    const query = parseInvoiceQuery({
      currency: 'USD', search: '  EQUIMED  ', documentType: 'Factura',
      dateFrom: '2026-08-01', dateTo: '2026-08-31', page: '2',
    });
    expect(query.page).toBe(2);
    expect(invoiceWhere(query)).toEqual({
      currency: 'USD',
      documentType: 'Factura',
      issueDate: { gte: new Date('2026-08-01'), lte: new Date('2026-08-31') },
      OR: [
        { issuerName: { contains: 'EQUIMED', mode: 'insensitive' } },
        { issuerRuc: { contains: 'EQUIMED' } },
      ],
    });
  });

  it.each([
    { dateFrom: '2026-09-01', dateTo: '2026-08-31' },
    { dateFrom: '2026-02-30' },
    { dateTo: '0000-01-01' },
    { currency: 'EUR' },
    { documentType: 'Otro' },
    { search: ['EQUIMED', 'otro'] },
    { page: '0' },
  ])('rechaza un filtro inválido %j', query => {
    expect(() => parseInvoiceQuery(query)).toThrow();
  });
});

describe('Resumen completo de comprobantes', () => {
  it('suma con precisión decimal y distingue las notas', async () => {
    transaction.mockResolvedValue([
      [
        group('Nota de débito', '5.00', '0.76', '2026-09-02'),
        group('Nota de crédito', '15.00', '2.29', '2026-09-01', 2),
        group('Boleta', '0.20', '0.04', '2026-09-01'),
        group('Factura', '0.10', '0.02', '2026-08-31'),
      ],
      1,
    ]);
    const report = await getInvoiceReport(parseInvoiceQuery({ currency: 'PEN', dateTo: '2026-09-30' }));
    expect(report.documentsAmount).toBe('0.30');
    expect(report.documentsTax).toBe('0.06');
    expect(report.count).toBe(5);
    expect(report.withoutAttachments).toBe(1);
    expect(report.creditNotes).toEqual({ count: 2, amount: '15.00' });
    expect(report.debitNotes).toEqual({ count: 1, amount: '5.00' });
    expect(report.providers).toEqual([{ ruc: '20000000001', name: 'Proveedor de prueba', total: '0.30' }]);
    expect(report.monthly).toHaveLength(2);
    expect(report.monthly.at(-2)).toEqual({
      month: '2026-08', documentsAmount: '0.10', creditNotes: '0.00', debitNotes: '0.00',
    });
    expect(report.monthly.at(-1)).toEqual({
      month: '2026-09', documentsAmount: '0.20', creditNotes: '15.00', debitNotes: '5.00',
    });
  });

  it('completa meses vacíos y agrupa proveedores por RUC', async () => {
    transaction.mockResolvedValue([
      [
        { ...group('Factura', '500', '76.27', '2026-11-01'), issuerName: 'Nombre actual' },
        { ...group('Factura', '100', '15.25', '2026-09-01'), issuerName: 'Nombre anterior' },
      ],
      0,
    ]);
    const report = await getInvoiceReport(parseInvoiceQuery({ currency: 'USD' }));
    expect(report.currency).toBe('USD');
    expect(report.providers).toEqual([{ ruc: '20000000001', name: 'Nombre actual', total: '600.00' }]);
    expect(report.monthly.at(-2)?.documentsAmount).toBe('0.00');
    expect(prisma.registeredInvoice.groupBy).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ currency: 'USD' }),
    }));
  });

  it('devuelve un resumen vacío con moneda explícita', async () => {
    transaction.mockResolvedValue([[], 0]);
    const report = await getInvoiceReport(parseInvoiceQuery({}));
    expect(report.currency).toBe('PEN');
    expect(report.count).toBe(0);
    expect(report.documentsAmount).toBe('0.00');
    expect(report.monthly).toEqual([]);
    expect(report.providers).toEqual([]);
  });

  it('limita el gráfico a doce meses y mantiene el total del período completo', async () => {
    transaction.mockResolvedValue([
      [
        group('Factura', '100', '15.25', '2026-11-01'),
        group('Factura', '200', '30.51', '2024-01-01'),
      ],
      0,
    ]);
    const report = await getInvoiceReport(parseInvoiceQuery({ dateFrom: '2024-01-01' }));
    expect(report.documentsAmount).toBe('300.00');
    expect(report.monthly).toHaveLength(12);
    expect(report.monthly[0].month).toBe('2025-12');
    expect(report.monthly.at(-1)?.documentsAmount).toBe('100.00');
  });
});

import { isAxiosError } from 'axios';
import { Download, FileText, Plus, Search } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ActivityChart, type ActivitySeries } from '../components/dashboard/widgets/ActivityChart';
import { invoicesService, type InvoiceFilters, type InvoiceReport } from '../services/invoices.service';

const defaultFilters: InvoiceFilters = { currency: 'PEN' };
const documentTypes = ['Factura', 'Boleta', 'Nota de crédito', 'Nota de débito'];
const dateFormat = new Intl.DateTimeFormat('es-PE', { timeZone: 'UTC', dateStyle: 'medium' });
const monthFormat = new Intl.DateTimeFormat('es-PE', { timeZone: 'UTC', month: 'short', year: '2-digit' });
const monthLabel = (month: string) => monthFormat.format(new Date(month + '-01'));
const money = (amount: string | number, currency: string) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency }).format(Number(amount));

function errorMessage(error: unknown, fallback: string) {
  return isAxiosError<{ error?: string }>(error) ? error.response?.data?.error || fallback : fallback;
}

export function InvoiceList({ canRegister }: { canRegister: boolean }) {
  const [query, setQuery] = useState({ page: 1, filters: defaultFilters });
  const [result, setResult] = useState<{
    list: Awaited<ReturnType<typeof invoicesService.list>>;
    report: InvoiceReport;
  }>();
  const [error, setError] = useState('');
  const [exportError, setExportError] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const request = new AbortController();
    Promise.all([
      invoicesService.list(query.page, request.signal, query.filters),
      invoicesService.report(query.filters, request.signal),
    ]).then(([list, report]) => setResult({ list, report })).catch(err => {
      if (!request.signal.aborted) setError(errorMessage(err, 'No se pudieron cargar las facturas'));
    });
    return () => request.abort();
  }, [query]);

  function updateQuery(page: number, filters = query.filters) {
    setResult(undefined);
    setError('');
    setExportError('');
    setQuery({ page, filters });
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    updateQuery(1, {
      currency: form.get('currency') as 'PEN' | 'USD',
      search: String(form.get('search') ?? '').trim() || undefined,
      documentType: String(form.get('documentType') ?? '') || undefined,
      dateFrom: String(form.get('dateFrom') ?? '') || undefined,
      dateTo: String(form.get('dateTo') ?? '') || undefined,
    });
  }

  async function exportExcel() {
    setExporting(true);
    setExportError('');
    try {
      const file = await invoicesService.export(query.filters);
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'facturas-' + query.filters.currency + '.xlsx';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setExportError('No se pudo exportar el archivo de Excel. Intenta nuevamente.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <header className="invoice-header">
        <div>
          <h1><FileText aria-hidden="true" /> Facturas</h1>
          <p>Resumen y consulta de comprobantes por fecha de emisión.</p>
        </div>
        <div className="invoice-actions">
          <button className="btn btn-secondary" disabled={!result || exporting} onClick={exportExcel}>
            <Download size={18} aria-hidden="true" />{exporting ? 'Exportando…' : 'Exportar Excel'}
          </button>
          {canRegister && <Link to="new" className="btn btn-primary"><Plus size={18} aria-hidden="true" /> Registrar comprobante</Link>}
        </div>
      </header>
      <form className="invoice-panel invoice-filter-form" onSubmit={applyFilters} onReset={() => updateQuery(1, defaultFilters)}>
        <div className="invoice-fields">
          <label><span>Emisor o RUC</span><input name="search" type="search" maxLength={200} placeholder="Buscar proveedor" /></label>
          <label><span>Desde</span><input name="dateFrom" type="date" /></label>
          <label><span>Hasta</span><input name="dateTo" type="date" /></label>
          <label>
            <span>Moneda</span>
            <select name="currency" defaultValue="PEN"><option value="PEN">PEN · Soles</option><option value="USD">USD · Dólares</option></select>
          </label>
          <label>
            <span>Tipo de comprobante</span>
            <select name="documentType" defaultValue="">
              <option value="">Todos los tipos</option>
              {documentTypes.map(type => <option key={type}>{type}</option>)}
            </select>
          </label>
        </div>
        <div className="invoice-actions">
          <p className="invoice-filter-hint">El resumen, el listado y Excel usan los filtros aplicados.</p>
          <button className="btn btn-secondary" type="reset">Limpiar</button>
          <button className="btn btn-primary" type="submit"><Search size={16} aria-hidden="true" /> Aplicar filtros</button>
        </div>
      </form>
      {error && <p className="invoice-error" role="alert">{error}</p>}
      {exportError && <p className="invoice-error" role="alert">{exportError}</p>}
      {!result && !error && <p role="status">Cargando comprobantes y resumen…</p>}
      {result && (
        <>
          <InvoiceDashboard report={result.report} />
          <div className="invoice-header">
            <h2>Comprobantes del período</h2>
            <span className="invoice-filter-hint">{result.list.total} registros · {query.filters.currency}</span>
          </div>
          {!result.list.data.length && <p className="invoice-panel">No hay comprobantes que coincidan con los filtros.</p>}
          {result.list.data.length > 0 && (
            <div className="invoice-table">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Comprobante</th><th scope="col">Emisor</th><th scope="col">Fecha de emisión</th>
                    <th scope="col">Adjuntos</th><th scope="col" className="invoice-amount">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {result.list.data.map(invoice => (
                    <tr key={invoice.id}>
                      <td><Link to={invoice.id}>{invoice.documentType}</Link></td>
                      <td>{invoice.issuerName}<small>{invoice.issuerRuc}</small></td>
                      <td>{dateFormat.format(new Date(invoice.issueDate))}</td>
                      <td>{invoice._count.attachments ? invoice._count.attachments + (invoice._count.attachments === 1 ? ' archivo' : ' archivos') : 'Sin adjunto'}</td>
                      <td className="invoice-amount">{money(invoice.total, invoice.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {result.list.totalPages > 1 && (
            <nav className="invoice-actions" aria-label="Páginas de comprobantes">
              <button className="btn btn-secondary" disabled={query.page === 1} onClick={() => updateQuery(query.page - 1)}>Anterior</button>
              <span>Página {query.page} de {result.list.totalPages}</span>
              <button className="btn btn-secondary" disabled={query.page >= result.list.totalPages} onClick={() => updateQuery(query.page + 1)}>Siguiente</button>
            </nav>
          )}
        </>
      )}
    </>
  );
}

function InvoiceDashboard({ report }: { report: InvoiceReport }) {
  const series: ActivitySeries[] = [
    { key: 'documentsAmount', name: 'Facturas y boletas', color: 'var(--chart-1)' },
  ];
  if (report.creditNotes.count) series.push({ key: 'creditNotes', name: 'Notas de crédito', color: 'var(--chart-3)' });
  if (report.debitNotes.count) series.push({ key: 'debitNotes', name: 'Notas de débito', color: 'var(--chart-5)' });
  const months = report.monthly.map(month => ({
    month: month.month,
    documentsAmount: Number(month.documentsAmount),
    creditNotes: Number(month.creditNotes),
    debitNotes: Number(month.debitNotes),
  }));
  const largestProvider = Math.max(0, ...report.providers.map(provider => Number(provider.total)));
  const chartPeriod = months.length ? monthLabel(months[0].month) + ' – ' + monthLabel(months[months.length - 1].month) : '';
  let attachmentStatus = 'Todos con adjunto';
  if (!report.count) attachmentStatus = 'Sin registros para este filtro';
  if (report.withoutAttachments) attachmentStatus = report.withoutAttachments + ' sin adjunto';

  return (
    <section className="invoice-dashboard" aria-label="Resumen de facturas">
      <div className="invoice-metrics">
        <div className="invoice-panel invoice-metric">
          <span>Importe de facturas y boletas</span><strong>{money(report.documentsAmount, report.currency)}</strong>
          <small>Comprobantes del período filtrado</small>
        </div>
        <div className="invoice-panel invoice-metric">
          <span>IGV de facturas y boletas</span><strong>{money(report.documentsTax, report.currency)}</strong>
          <small>Según los importes registrados</small>
        </div>
        <div className="invoice-panel invoice-metric">
          <span>Comprobantes</span><strong>{report.count}</strong>
          <small>{attachmentStatus}</small>
        </div>
      </div>
      {(report.creditNotes.count > 0 || report.debitNotes.count > 0) && (
        <div className="invoice-note-totals">
          <span>Notas de crédito · {report.creditNotes.count} · {money(report.creditNotes.amount, report.currency)}</span>
          <span>Notas de débito · {report.debitNotes.count} · {money(report.debitNotes.amount, report.currency)}</span>
        </div>
      )}
      <div className="invoice-report-charts">
        <ActivityChart
          data={months} xKey="month" series={series} title="Importes mensuales"
          subtitle={chartPeriod ? chartPeriod + ' · ' + report.currency : 'Comprobantes por fecha de emisión'}
          xTickFormatter={monthLabel} xLabelFormatter={monthLabel}
          formatLeft={value => money(value, report.currency)}
          tickFormatLeft={value => new Intl.NumberFormat('es-PE', { notation: 'compact' }).format(value)}
        />
        <section className="invoice-panel invoice-provider-chart" aria-labelledby="invoice-provider-title">
          <h3 id="invoice-provider-title">Principales proveedores</h3>
          <p>Facturas y boletas · {report.currency}</p>
          {!report.providers.length && <p>Sin registros para este filtro.</p>}
          <ol>
            {report.providers.map(provider => (
              <li key={provider.ruc}>
                <div><span>{provider.name}<small>{provider.ruc}</small></span><strong>{money(provider.total, report.currency)}</strong></div>
                <div className="invoice-provider-track" aria-hidden="true">
                  <div style={{ width: (largestProvider ? Number(provider.total) / largestProvider * 100 : 0) + '%' }} />
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </section>
  );
}

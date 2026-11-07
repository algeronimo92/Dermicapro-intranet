import { isAxiosError } from 'axios';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';
import { invoicesService, type InvoiceDetail } from '../services/invoices.service';
import { InvoiceList } from './InvoiceList';
import '../styles/invoices.css';

type InvoiceField = {
  name: Exclude<keyof InvoiceDetail, 'id' | 'attachments' | 'createdBy' | '_count'>;
  label: string;
  required?: boolean;
  type?: 'date' | 'time' | 'amount';
  pattern?: string;
  maxLength?: number;
  inputMode?: 'numeric';
  options?: string[];
  defaultValue?: string;
};

const entryGroups: { title: string; fields: InvoiceField[] }[] = [
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

const customerFields = [
  { name: 'customerDocument', label: 'Documento del cliente' },
  { name: 'customerName', label: 'Razón social del cliente' },
  { name: 'customerAddress', label: 'Dirección del cliente' },
] as const satisfies readonly InvoiceField[];

const defaultFields: InvoiceField[] = [
  { name: 'currency', label: 'Moneda', required: true, options: ['PEN', 'USD'], defaultValue: 'PEN' },
  { name: 'paymentCondition', label: 'Condición de pago', required: true, options: ['Contado', 'Crédito'], defaultValue: 'Contado' },
];

const detailGroups: { title: string; fields: readonly InvoiceField[] }[] = [
  entryGroups[0],
  { title: 'Datos del cliente', fields: customerFields },
  { title: 'Importes y condiciones', fields: [...entryGroups[1].fields, ...defaultFields] },
];

const dateFormatter = new Intl.DateTimeFormat('es-PE', { timeZone: 'UTC', dateStyle: 'medium' });
const formatDate = (date: string) => dateFormatter.format(new Date(date));
const formatAmount = (amount: string, currency: string) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency }).format(Number(amount));

function errorMessage(error: unknown, fallback: string) {
  return isAxiosError<{ error?: string }>(error) ? error.response?.data?.error || fallback : fallback;
}

export function InvoicesPage() {
  const { user } = useAuth();
  const roleName = typeof user?.role === 'string' ? user.role : user?.role?.name;
  const canRegister = roleName === Role.admin;
  return (
    <div className="invoice-page">
      <Routes>
        <Route index element={<InvoiceList canRegister={canRegister} />} />
        <Route path="new" element={canRegister ? <InvoiceForm /> : <Navigate to="/invoices" replace />} />
        <Route path=":id" element={<InvoiceDetails />} />
      </Routes>
    </div>
  );
}

function InvoiceForm() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [customer, setCustomer] = useState<Awaited<ReturnType<typeof invoicesService.defaults>>>();

  useEffect(() => {
    const request = new AbortController();
    invoicesService.defaults(request.signal)
      .then(setCustomer)
      .catch(err => {
        if (!request.signal.aborted) setError(errorMessage(err, 'No se pudieron cargar los datos del cliente'));
      });
    return () => request.abort();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !customer) return;

    const form = new FormData(event.currentTarget);
    const attachments = form.getAll('attachments').filter((file): file is File => file instanceof File && Boolean(file.name));
    if (attachments.length > 5 || attachments.some(file => file.size > 5 * 1024 * 1024)) {
      setError('Adjunta hasta 5 archivos de 5 MB como máximo cada uno.');
      return;
    }
    if (!attachments.length) form.delete('attachments');
    setError('');
    setSaving(true);
    try {
      const invoice = await invoicesService.create(form);
      navigate(`/invoices/${invoice.id}`, { replace: true, state: { registered: true } });
    } catch (err) {
      setError(errorMessage(err, 'No se pudo guardar el comprobante'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Link className="invoice-back" to="/invoices"><ArrowLeft size={16} aria-hidden="true" /> Volver a Facturas</Link>
      <header className="invoice-header">
        <div><h1>Registrar comprobante</h1><p>Transcribe los datos tal como figuran en el documento.</p></div>
      </header>
      <form className="invoice-form" onSubmit={submit}>
        <div className="invoice-form-layout">
          <section className="invoice-form-column" aria-labelledby="invoice-entry-title">
            {entryGroups.map(group => (
              <fieldset className="invoice-panel" key={group.title} disabled={saving}>
                <legend>{group.title}</legend>
                <InvoiceFormFields fields={group.fields} />
              </fieldset>
            ))}
          </section>
          <div className="invoice-form-column">
            <section className="invoice-form-column invoice-form-defaults" aria-labelledby="invoice-defaults-title">
              <fieldset className="invoice-panel" disabled={saving}>
                <legend>Moneda y pago</legend>
                <InvoiceFormFields fields={defaultFields} />
              </fieldset>
              <section className="invoice-panel invoice-customer" aria-labelledby="invoice-customer-title">
                <h3 id="invoice-customer-title">Cliente del comprobante</h3>
                {customer ? (
                  <dl>
                    {customerFields.map(field => (
                      <div key={field.name}><dt>{field.label}</dt><dd>{customer[field.name]}</dd></div>
                    ))}
                  </dl>
                ) : !error && <p role="status">Cargando datos del cliente…</p>}
              </section>
            </section>
            <fieldset className="invoice-panel" disabled={saving}>
              <legend>Adjuntos <span className="invoice-optional">Opcional</span></legend>
              <div className="invoice-fields">
                <label className="invoice-field-wide">
                  <span>Fotos o PDF del comprobante</span>
                  <input name="attachments" type="file" accept=".jpg,.jpeg,.png,.pdf" multiple aria-describedby="invoice-attachments-hint" />
                  <small id="invoice-attachments-hint">Hasta 5 archivos JPG, PNG o PDF de 5 MB cada uno.</small>
                </label>
              </div>
            </fieldset>
          </div>
        </div>
        {error && <p className="invoice-error" role="alert">{error}</p>}
        <div className="invoice-actions invoice-form-actions">
          <Link to="/invoices" className="btn btn-secondary">Cancelar</Link>
          <button className="btn btn-primary" type="submit" disabled={saving || !customer}>{saving ? 'Guardando…' : 'Guardar comprobante'}</button>
        </div>
      </form>
    </>
  );
}

function InvoiceFormFields({ fields }: { fields: InvoiceField[] }) {
  return (
    <div className="invoice-fields">
      {fields.map(field => (
        <label key={field.name} className={field.name === 'issuerName' ? 'invoice-field-wide' : undefined}>
          <span>{field.label}{field.required && <span className="invoice-required" aria-hidden="true"> *</span>}</span>
          {field.options ? (
            <select name={field.name} required={field.required} defaultValue={field.defaultValue ?? ''}>
              {!field.defaultValue && <option value="" disabled>Selecciona una opción</option>}
              {field.options.map(option => (
                <option key={option} value={option}>{option === 'Contado' ? 'Al contado' : option}</option>
              ))}
            </select>
          ) : (
            <input
              name={field.name}
              required={field.required}
              type={field.type === 'amount' ? 'number' : field.type ?? 'text'}
              min={field.type === 'amount' ? '0' : undefined}
              max={field.type === 'amount' ? '9999999999.99' : undefined}
              step={field.type === 'amount' ? '0.01' : undefined}
              pattern={field.pattern}
              maxLength={field.maxLength}
              inputMode={field.inputMode}
            />
          )}
        </label>
      ))}
    </div>
  );
}

function InvoiceDetails() {
  const { id = '' } = useParams();
  const { state } = useLocation();
  const [invoice, setInvoice] = useState<InvoiceDetail>();
  const [error, setError] = useState('');
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    const request = new AbortController();
    invoicesService.detail(id, request.signal)
      .then(data => setInvoice(data))
      .catch(err => {
        if (!request.signal.aborted) setError(errorMessage(err, 'No se pudo cargar el comprobante'));
      });
    return () => request.abort();
  }, [id]);

  async function download(attachment: InvoiceDetail['attachments'][number]) {
    setDownloadError('');
    try {
      const file = await invoicesService.download(id, attachment.id);
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.fileName;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setDownloadError('No se pudo descargar el adjunto');
    }
  }

  return (
    <>
      <Link to="/invoices">← Volver a Facturas</Link>
      {state?.registered && <p role="status">Comprobante registrado correctamente.</p>}
      {error && <p className="invoice-error" role="alert">{error}</p>}
      {!invoice && !error && <p role="status">Cargando comprobante…</p>}
      {invoice && (
        <>
          <header className="invoice-header">
            <div>
              <h1>{invoice.documentType} · {invoice.issuerName}</h1>
              <p>Registrado por {invoice.createdBy.firstName} {invoice.createdBy.lastName}</p>
            </div>
          </header>
          {detailGroups.map(group => (
            <section className="invoice-panel" key={group.title}>
              <h2>{group.title}</h2>
              <dl className="invoice-fields">
                {group.fields.map(field => {
                  const value = invoice[field.name];
                  let display = value || '—';
                  if (value && field.type === 'date') display = formatDate(value);
                  if (value && field.type === 'amount') display = formatAmount(value, invoice.currency);
                  if (field.name === 'paymentCondition' && value === 'Contado') display = 'Al contado';
                  return <div key={field.name}><dt>{field.label}</dt><dd>{display}</dd></div>;
                })}
              </dl>
            </section>
          ))}
          <section className="invoice-panel">
            <h2>Adjuntos</h2>
            {!invoice.attachments.length && <p>Este comprobante no tiene adjuntos.</p>}
            {invoice.attachments.map(attachment => (
              <button key={attachment.id} className="btn btn-secondary" onClick={() => download(attachment)}>
                Descargar {attachment.fileName}
              </button>
            ))}
            {downloadError && <p className="invoice-error" role="alert">{downloadError}</p>}
          </section>
        </>
      )}
    </>
  );
}

import { isAxiosError } from 'axios';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/Modal';
import { INVOICE_CATEGORY_LABELS, invoicesService, type InvoiceDetail } from '../services/invoices.service';
import { InvoiceList } from './InvoiceList';
import '../styles/invoices.css';
import { InvoiceEntryForm } from '../components/InvoiceEntryForm';
import { customerFields, defaultFields, entryGroups, type InvoiceField } from '../components/invoiceFields';

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
  // Lo que puede hacer lo decide Empleados -> Privilegios (registered_invoices y sus adjuntos).
  const { modules } = useAuth();
  const { create: canCreate, edit: canEdit, delete: canDelete } = modules.invoices;
  return (
    <div className="invoice-page">
      <Routes>
        <Route index element={<InvoiceList canRegister={canCreate} />} />
        <Route path="new" element={canCreate ? <InvoiceForm /> : <Navigate to="/invoices" replace />} />
        <Route path=":id/edit" element={canEdit ? <InvoiceEditor /> : <Navigate to="/invoices" replace />} />
        <Route path=":id" element={<InvoiceDetails canEdit={canEdit} canDelete={canDelete} />} />
      </Routes>
    </div>
  );
}

function InvoiceEditor() {
  const { id = '' } = useParams();
  const [invoice, setInvoice] = useState<InvoiceDetail>();
  const [error, setError] = useState('');
  useEffect(() => {
    const request = new AbortController();
    invoicesService.detail(id, request.signal).then(setInvoice).catch(err => {
      if (!request.signal.aborted) setError(errorMessage(err, 'No se pudo cargar el comprobante'));
    });
    return () => request.abort();
  }, [id]);
  if (error) return <p className="invoice-error" role="alert">{error}</p>;
  return invoice?.id === id ? <InvoiceForm key={invoice.id} initialInvoice={invoice} /> : <p role="status">Cargando comprobante…</p>;
}

function InvoiceForm({ initialInvoice }: { initialInvoice?: InvoiceDetail }) {
  const navigate = useNavigate();
  return (
    <>
      <Link className="invoice-back" to="/invoices"><ArrowLeft size={16} aria-hidden="true" /> Volver a Facturas</Link>
      <header className="invoice-header">
        <div><h1>{initialInvoice ? 'Editar comprobante' : 'Registrar comprobante'}</h1><p>Transcribe los datos tal como figuran en el documento.</p></div>
      </header>
      <InvoiceEntryForm
        initialInvoice={initialInvoice}
        onSaved={invoice => navigate(`/invoices/${invoice.id}`, { replace: true, state: initialInvoice ? { updated: true } : { registered: true } })}
        cancel={<Link to="/invoices" className="btn btn-secondary">Cancelar</Link>}
      />
    </>
  );
}

function InvoiceDetails({ canEdit, canDelete }: { canEdit: boolean; canDelete: boolean }) {
  const navigate = useNavigate();
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
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

  async function remove() {
    if (!invoice || deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await invoicesService.remove(invoice.id, invoice.revision);
      navigate('/invoices', { replace: true });
    } catch (err) {
      setDeleteError(errorMessage(err, 'No se pudo eliminar el comprobante'));
    } finally { setDeleting(false); }
  }

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
      {state?.updated && <p role="status">Comprobante actualizado correctamente.</p>}
      {error && <p className="invoice-error" role="alert">{error}</p>}
      {!invoice && !error && <p role="status">Cargando comprobante…</p>}
      {invoice && (
        <>
          <header className="invoice-header">
            <div>
              <h1>{invoice.documentType} · {invoice.issuerName}</h1>
              <p>
                <span className={`invoice-category invoice-category--${invoice.category}`}>{INVOICE_CATEGORY_LABELS[invoice.category]}</span>{' '}
                Registrado por {invoice.createdBy.firstName} {invoice.createdBy.lastName}
              </p>
            </div>
            {(canEdit || canDelete) && <div className="invoice-actions">
              {canEdit && <Link className="btn btn-secondary" to={`/invoices/${invoice.id}/edit`}>Editar comprobante</Link>}
              {canDelete && <button className="btn btn-danger" onClick={() => setShowDelete(true)}>Eliminar comprobante</button>}
            </div>}
          </header>
          {showDelete && canDelete && <Modal isOpen={showDelete} onClose={() => { if (!deleting) setShowDelete(false); }} title="Eliminar comprobante">
            <p>Se eliminará el registro de {invoice.issuerName} por {formatAmount(invoice.total, invoice.currency)} y sus adjuntos. Esta acción no se puede deshacer.</p>
            {deleteError && <p className="invoice-error" role="alert">{deleteError}</p>}
            <div className="invoice-actions">
              <button className="btn btn-secondary" disabled={deleting} onClick={() => setShowDelete(false)}>Cancelar</button>
              <button className="btn btn-danger" disabled={deleting} onClick={remove}>{deleting ? 'Eliminando…' : 'Confirmar eliminación'}</button>
            </div>
          </Modal>}
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

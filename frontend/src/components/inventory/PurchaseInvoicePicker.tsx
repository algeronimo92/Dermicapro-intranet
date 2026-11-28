import { useState } from 'react';
import { FilePlus2, FileSearch, FileText, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../Modal';
import { InvoiceEntryForm } from '../InvoiceEntryForm';
import { invoicesService } from '../../services/invoices.service';
import {
  apiErrorMessage,
  formatDateOnly,
  formatInvoiceAmount,
  inventoryService,
  type InvoiceSummary,
} from '../../services/inventory.service';

interface PurchaseInvoicePickerProps {
  value: InvoiceSummary | null;
  onChange: (invoice: InvoiceSummary | null) => void;
  disabled?: boolean;
}

/**
 * Factura de una compra: se registra en el momento (mismo formulario de
 * Facturas, fijado como Productos) o se elige una de Productos ya registrada
 * que todavía no tenga compra. Queda visible también en Facturas.
 */
export function PurchaseInvoicePicker({ value, onChange, disabled }: PurchaseInvoicePickerProps) {
  const { modules } = useAuth();
  const canRegister = modules.invoices.create;
  const canPick = modules.invoices.view;
  const [registerOpen, setRegisterOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [available, setAvailable] = useState<InvoiceSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!canRegister && !canPick) {
    return <p className="purchase-invoice__hint">No tienes acceso a Facturas: la compra se registrará sin factura.</p>;
  }

  const openPicker = async () => {
    setPickOpen(true);
    setAvailable(null);
    setError(null);
    try {
      setAvailable(await inventoryService.getAvailableInvoices());
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudieron cargar las facturas'));
    }
  };

  const handleRegistered = async ({ id }: { id: string }) => {
    setRegisterOpen(false);
    try {
      const detail = await invoicesService.detail(id, new AbortController().signal);
      onChange(detail);
    } catch {
      onChange({ id, documentType: 'Factura', issuerRuc: '', issuerName: 'Factura registrada', issueDate: new Date().toISOString(), currency: 'PEN', total: '0' });
    }
  };

  return (
    <div className="purchase-invoice">
      {value ? (
        <div className="purchase-invoice__selected">
          <FileText size={20} aria-hidden />
          <div>
            <strong>{value.documentType} · {value.issuerName}</strong>
            <span>
              {[value.issuerRuc && `RUC ${value.issuerRuc}`, formatDateOnly(value.issueDate), formatInvoiceAmount(value)]
                .filter(Boolean).join(' · ')}
            </span>
          </div>
          <button type="button" className="purchase-invoice__remove" onClick={() => onChange(null)} disabled={disabled} aria-label="Quitar la factura">
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="purchase-invoice__actions">
          {canRegister && (
            <button type="button" className="action-btn secondary" onClick={() => setRegisterOpen(true)} disabled={disabled}>
              <FilePlus2 size={16} aria-hidden /> Registrar factura
            </button>
          )}
          {canPick && (
            <button type="button" className="action-btn secondary" onClick={openPicker} disabled={disabled}>
              <FileSearch size={16} aria-hidden /> Elegir una ya registrada
            </button>
          )}
          <span className="purchase-invoice__hint">Opcional. Queda también en Facturas, como «Productos».</span>
        </div>
      )}

      <Modal isOpen={registerOpen} onClose={() => setRegisterOpen(false)} title="Factura de la compra" size="large">
        {registerOpen && (
          <InvoiceEntryForm
            fixedCategory="products"
            onSaved={handleRegistered}
            cancel={<button type="button" className="btn btn-secondary" onClick={() => setRegisterOpen(false)}>Cancelar</button>}
          />
        )}
      </Modal>

      <Modal isOpen={pickOpen} onClose={() => setPickOpen(false)} title="Elegir factura de productos" size="medium">
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {!available && !error && <p role="status">Cargando facturas…</p>}
        {available && available.length === 0 && (
          <p className="purchase-invoice__hint">No hay facturas de Productos sin compra. Registra una nueva.</p>
        )}
        {available && available.length > 0 && (
          <ul className="purchase-invoice__list">
            {available.map(invoice => (
              <li key={invoice.id}>
                <button type="button" onClick={() => { onChange(invoice); setPickOpen(false); }}>
                  <strong>{invoice.documentType} · {invoice.issuerName}</strong>
                  <span>RUC {invoice.issuerRuc} · {formatDateOnly(invoice.issueDate)} · {formatInvoiceAmount(invoice)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}

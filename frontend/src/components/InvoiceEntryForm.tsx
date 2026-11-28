import { isAxiosError } from 'axios';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  INVOICE_CATEGORY_LABELS,
  invoicesService,
  type InvoiceCategory,
  type InvoiceDefaults,
  type InvoiceDetail,
} from '../services/invoices.service';
import { FormSelect } from './FormSelect';
import { InvoiceAttachmentPicker } from './InvoiceAttachmentPicker';
import { customerFields, defaultFields, entryGroups, type InvoiceField } from './invoiceFields';

function errorMessage(error: unknown, fallback: string) {
  return isAxiosError<{ error?: string }>(error) ? error.response?.data?.error || fallback : fallback;
}

interface InvoiceEntryFormProps {
  initialInvoice?: InvoiceDetail;
  /** Fija el tipo (ej. la factura de una compra siempre es de Productos). */
  fixedCategory?: InvoiceCategory;
  onSaved: (invoice: { id: string }) => void;
  /** Botón Cancelar: un enlace (página) o una acción (modal). */
  cancel: ReactNode;
}

/**
 * Formulario de un comprobante de compra. Lo usa Facturas y también Inventario,
 * para registrar la factura de una compra sin salir de la pantalla.
 */
export function InvoiceEntryForm({ initialInvoice, fixedCategory, onSaved, cancel }: InvoiceEntryFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [defaults, setDefaults] = useState<InvoiceDefaults>();
  const [retainedIds, setRetainedIds] = useState(initialInvoice?.attachments.map(file => file.id) ?? []);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  useEffect(() => {
    const request = new AbortController();
    invoicesService.defaults(request.signal)
      .then(setDefaults)
      .catch(err => {
        if (!request.signal.aborted) setError(errorMessage(err, 'No se pudieron cargar los datos del cliente'));
      });
    return () => request.abort();
  }, []);

  // Al editar se muestra el cliente guardado en el comprobante.
  const customer = initialInvoice ?? defaults;
  const categories = defaults?.categories ?? [];
  const forcedCategory = fixedCategory ?? (categories.length === 1 ? categories[0] : undefined);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation(); // dentro de un modal, no enviar el formulario de atrás
    if (saving || !defaults) return;

    const form = new FormData(event.currentTarget);
    // Los adjuntos (subidos o fotos tomadas) viven en el estado del selector;
    // se envían en el mismo campo "attachments" de siempre.
    const attachments = newFiles;
    if (attachments.length + retainedIds.length > 5 || attachments.some(file => file.size > 5 * 1024 * 1024)) {
      setError('Adjunta hasta 5 archivos de 5 MB como máximo cada uno.');
      return;
    }
    form.delete('attachments');
    attachments.forEach(file => form.append('attachments', file, file.name));
    if (forcedCategory) form.set('category', forcedCategory);
    if (initialInvoice) {
      form.set('revision', String(initialInvoice.revision));
      form.set('retainedAttachmentIds', JSON.stringify(retainedIds));
    }
    setError('');
    setSaving(true);
    try {
      const invoice = initialInvoice ? await invoicesService.update(initialInvoice.id, form) : await invoicesService.create(form);
      onSaved(invoice);
    } catch (err) {
      setError(errorMessage(err, 'No se pudo guardar el comprobante'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="invoice-form" onSubmit={submit}>
      <div className="invoice-form-layout">
        <section className="invoice-form-column" aria-label="Datos del comprobante">
          {!forcedCategory && categories.length > 1 && (
            <fieldset className="invoice-panel" disabled={saving}>
              <legend>Tipo de factura</legend>
              <div className="invoice-fields">
                <label className="invoice-field-wide">
                  <span>¿Es de tratamientos o de productos?<span className="invoice-required" aria-hidden="true"> *</span></span>
                  <FormSelect
                    name="category"
                    required
                    defaultValue={initialInvoice?.category ?? 'treatments'}
                    options={categories.map(c => ({ value: c, label: INVOICE_CATEGORY_LABELS[c] }))}
                  />
                </label>
              </div>
            </fieldset>
          )}
          {entryGroups.map(group => (
            <fieldset className="invoice-panel" key={group.title} disabled={saving}>
              <legend>{group.title}</legend>
              <InvoiceFormFields fields={group.fields} values={initialInvoice} />
            </fieldset>
          ))}
        </section>
        <div className="invoice-form-column">
          <section className="invoice-form-column invoice-form-defaults" aria-label="Moneda, pago y cliente">
            <fieldset className="invoice-panel" disabled={saving}>
              <legend>Moneda y pago</legend>
              <InvoiceFormFields fields={defaultFields} values={initialInvoice} />
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
            {initialInvoice && initialInvoice.attachments.length > 0 && <div className="invoice-existing-files">
              <p>Conserva los archivos marcados. Los que desmarques se eliminarán al guardar.</p>
              {initialInvoice.attachments.map(file => <label key={file.id}>
                <input type="checkbox" checked={retainedIds.includes(file.id)} onChange={event => setRetainedIds(ids => event.target.checked ? [...ids, file.id] : ids.filter(id => id !== file.id))} />
                <span>{file.fileName}</span>
              </label>)}
            </div>}
            <div className="invoice-fields">
              <div className="invoice-field-wide">
                <span>Fotos o PDF del comprobante</span>
                <InvoiceAttachmentPicker
                  files={newFiles}
                  onChange={setNewFiles}
                  maxFiles={5 - retainedIds.length}
                  disabled={saving}
                />
                <small id="invoice-attachments-hint">
                  Hasta 5 archivos JPG, PNG o PDF de 5 MB cada uno. En el celular, «Tomar foto» abre la cámara.
                </small>
              </div>
            </div>
          </fieldset>
        </div>
      </div>
      {error && <p className="invoice-error" role="alert">{error}</p>}
      <div className="invoice-actions invoice-form-actions">
        {cancel}
        <button className="btn btn-primary" type="submit" disabled={saving || !defaults}>{saving ? 'Guardando…' : 'Guardar comprobante'}</button>
      </div>
    </form>
  );
}

function InvoiceFormFields({ fields, values }: { fields: InvoiceField[]; values?: InvoiceDetail }) {
  return (
    <div className="invoice-fields">
      {fields.map(field => (
        <label key={field.name} className={field.name === 'issuerName' ? 'invoice-field-wide' : undefined}>
          <span>{field.label}{field.required && <span className="invoice-required" aria-hidden="true"> *</span>}</span>
          {field.options ? (
            <FormSelect
              name={field.name}
              required={field.required}
              defaultValue={String(values?.[field.name] ?? field.defaultValue ?? '')}
              placeholder={field.defaultValue ? undefined : 'Selecciona una opción'}
              options={field.options.map(option => ({ value: option, label: option === 'Contado' ? 'Al contado' : option }))}
            />
          ) : (
            <input
              name={field.name}
              defaultValue={field.type === 'date' ? values?.issueDate.slice(0, 10) : values?.[field.name] ?? ''}
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

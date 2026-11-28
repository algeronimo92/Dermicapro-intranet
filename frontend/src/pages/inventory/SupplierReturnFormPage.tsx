import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Package, Trash2 } from 'lucide-react';
import { PageDetailLayout } from '../../components/templates';
import { Select } from '../../components/Select';
import {
  apiErrorMessage,
  inventoryService,
  RETURN_REASON_LABELS,
  todayKey,
  type Product,
  type SupplierReturnReason,
} from '../../services/inventory.service';
import { notifyInventoryChanged } from '../../services/notifications.service';

interface Line {
  product: Product;
  quantity: string;
}

const MAX_SUGGESTIONS = 8;
const REASON_OPTIONS = [
  { value: '', label: 'Elige el motivo' },
  ...Object.entries(RETURN_REASON_LABELS).map(([value, label]) => ({ value, label })),
];

/** Registrar una devolución al proveedor: resta stock y guarda por qué. */
export function SupplierReturnFormPage() {
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [returnDate, setReturnDate] = useState(todayKey());
  const [reason, setReason] = useState<SupplierReturnReason | ''>('');
  const [supplierName, setSupplierName] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    inventoryService.getAllActiveProducts()
      .then(list => { if (!cancelled) setProducts(list); })
      .catch(err => { if (!cancelled) setLoadError(apiErrorMessage(err, 'No se pudieron cargar los productos')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const inReturn = useMemo(() => new Set(lines.map(l => l.product.id)), [lines]);

  // Sólo se puede devolver lo que hay en stock.
  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(p => p.stock > 0 && !inReturn.has(p.id))
      .filter(p => [p.name, p.brand, p.presentation, p.barcode].some(v => v?.toLowerCase().includes(q)))
      .slice(0, MAX_SUGGESTIONS);
  }, [products, search, inReturn]);

  const addProduct = (product: Product) => {
    flushSync(() => {
      setError(null);
      setLines(prev => [...prev, { product, quantity: '1' }]);
      setSearch('');
    });
    document.querySelector<HTMLInputElement>(`[data-qty="${product.id}"]`)?.select();
  };

  const handleSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const code = e.currentTarget.value.trim();
    const byBarcode = code ? suggestions.find(p => p.barcode === code) : undefined;
    const target = byBarcode ?? (suggestions.length === 1 ? suggestions[0] : undefined);
    if (target) addProduct(target);
  };

  const setQuantity = (productId: string, value: string) =>
    setLines(prev => prev.map(l => l.product.id === productId ? { ...l, quantity: value.replace(/\D/g, '') } : l));

  const removeLine = (productId: string) => setLines(prev => prev.filter(l => l.product.id !== productId));

  const lineError = (l: Line) => {
    const qty = Number(l.quantity);
    if (!(qty >= 1)) return 'Indica la cantidad';
    if (qty > l.product.stock) return `Solo hay ${l.product.stock} en stock`;
    return null;
  };
  const totalUnits = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);

  const save = async () => {
    if (!reason) return setError('Elige el motivo de la devolución');
    if (reason === 'other' && !note.trim()) return setError('Con el motivo «Otro», explica en la nota por qué se devuelve');
    if (lines.length === 0) return setError('Agrega al menos un producto a devolver');
    const invalid = lines.find(lineError);
    if (invalid) return setError(`«${invalid.product.name}»: ${lineError(invalid)}`);
    setSaving(true);
    setError(null);
    try {
      await inventoryService.createSupplierReturn({
        returnDate,
        reason,
        supplierName: supplierName.trim() || undefined,
        note: note.trim() || undefined,
        items: lines.map(l => ({ productId: l.product.id, quantity: Number(l.quantity) })),
      });
      notifyInventoryChanged();
      navigate('/inventory/returns', { replace: true, state: { registered: true } });
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo registrar la devolución'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageDetailLayout
      title="Registrar devolución"
      subtitle="Productos que se devuelven al proveedor: se descuentan del stock y queda el motivo"
      onBack={() => navigate('/inventory/returns')}
      backLabel="Devoluciones"
      isLoading={loading}
      error={loadError}
    >
      <div className="purchase-form">
        <section className="purchase-card">
          <h2>Datos de la devolución</h2>
          <div className="return-form__grid">
            <label>
              <span className="field-label">Fecha *</span>
              <input
                type="date" value={returnDate} max={todayKey()} onChange={(e) => setReturnDate(e.target.value)}
                className="filter-select-modern" disabled={saving}
              />
            </label>
            <div>
              <span className="field-label">Motivo *</span>
              <Select
                value={reason}
                onChange={(e) => { setError(null); setReason(e.target.value as SupplierReturnReason | ''); }}
                options={REASON_OPTIONS}
                aria-label="Motivo de la devolución"
              />
            </div>
            <label>
              <span className="field-label">Proveedor (opcional)</span>
              <input
                type="text" value={supplierName} maxLength={150} onChange={(e) => setSupplierName(e.target.value)}
                placeholder="Ej: Distribuidora Dermo" className="filter-select-modern" disabled={saving}
              />
            </label>
            <label className="return-form__note">
              <span className="field-label">Nota {reason === 'other' ? '*' : '(opcional)'}</span>
              <input
                type="text" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)}
                placeholder={reason === 'other' ? '¿Por qué se devuelve?' : 'Ej: lote 2405 vencido'}
                className="filter-select-modern" disabled={saving}
              />
            </label>
          </div>
        </section>

        <section className="purchase-card">
          <h2>Productos</h2>
          <div className="purchase-search">
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={handleSearchKey}
              placeholder="Buscar producto o escanear código de barras…" className="filter-select-modern"
              aria-label="Buscar producto o escanear código de barras" disabled={saving}
            />
            {suggestions.length > 0 && (
              <ul className="purchase-search__results" role="listbox">
                {suggestions.map(p => (
                  <li key={p.id}>
                    <button type="button" onClick={() => addProduct(p)}>
                      <span className="purchase-search__name">{p.name}</span>
                      <span className="purchase-search__meta">
                        {[p.brand, p.presentation].filter(Boolean).join(' · ')} · Stock {p.stock}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {search.trim() && suggestions.length === 0 && (
              <p className="purchase-invoice__hint">Ningún producto con stock coincide.</p>
            )}
          </div>

          {lines.length === 0 ? (
            <div className="inventory-empty purchase-lines__empty">
              <Package size={28} strokeWidth={1.4} aria-hidden /> Busca y agrega los productos que se devuelven.
            </div>
          ) : (
            <div className="table-container">
              <table className="table purchase-lines">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th style={{ textAlign: 'right' }}>Stock actual</th>
                    <th style={{ textAlign: 'right' }}>Cantidad devuelta</th>
                    <th style={{ textAlign: 'right' }}>Quedará</th>
                    <th aria-label="Quitar" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map(l => {
                    const after = l.product.stock - (Number(l.quantity) || 0);
                    return (
                      <tr key={l.product.id}>
                        <td>
                          <span className="bulk-table__name">{l.product.name}</span>
                          <span className="bulk-table__meta">{[l.product.brand, l.product.presentation].filter(Boolean).join(' · ')}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>{l.product.stock}</td>
                        <td style={{ textAlign: 'right' }}>
                          <input
                            data-qty={l.product.id} inputMode="numeric" value={l.quantity}
                            onChange={(e) => setQuantity(l.product.id, e.target.value)}
                            onFocus={(e) => e.target.select()}
                            className="bulk-cell bulk-cell--qty" aria-label={`Cantidad devuelta de ${l.product.name}`} disabled={saving}
                          />
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }} className={after < 0 ? 'bulk-table__after is-error' : ''}>
                          {after}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button type="button" className="icon-btn-plain" onClick={() => removeLine(l.product.id)} aria-label={`Quitar ${l.product.name}`} disabled={saving}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {error && <div className="alert alert-error" role="alert">{error}</div>}

        <div className="bulk-footer">
          <span className="bulk-footer__summary">
            {lines.length === 0 ? 'Sin productos todavía.' : `${lines.length} producto(s) · ${totalUnits} unidad(es) a devolver`}
          </span>
          <div className="bulk-footer__actions">
            <button type="button" className="action-btn secondary" onClick={() => navigate('/inventory/returns')} disabled={saving}>
              Cancelar
            </button>
            <button type="button" className="action-btn primary" onClick={save} disabled={saving || lines.length === 0}>
              {saving ? 'Registrando...' : 'Registrar devolución'}
            </button>
          </div>
        </div>
      </div>
    </PageDetailLayout>
  );
}

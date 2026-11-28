import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Package, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { PageDetailLayout } from '../../components/templates';
import { ProductFormModal } from '../../components/ProductFormModal';
import { PurchaseInvoicePicker } from '../../components/inventory/PurchaseInvoicePicker';
import {
  apiErrorMessage,
  inventoryService,
  todayKey,
  type InvoiceSummary,
  type Product,
} from '../../services/inventory.service';
import { notifyInventoryChanged } from '../../services/notifications.service';

interface Line {
  product: Product;
  quantity: string;
}

const MAX_SUGGESTIONS = 8;

export function PurchaseFormPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { modules } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [purchaseDate, setPurchaseDate] = useState(todayKey());
  const [note, setNote] = useState('');
  const [invoice, setInvoice] = useState<InvoiceSummary | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [search, setSearch] = useState('');
  const [newProductOpen, setNewProductOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ?products=id1:3,id2 precarga productos (lo usará la lista de compras).
  useEffect(() => {
    let cancelled = false;
    inventoryService.getAllActiveProducts()
      .then(list => {
        if (cancelled) return;
        setProducts(list);
        const preset = (params.get('products') ?? '').split(',').filter(Boolean).map(entry => entry.split(':'));
        const byId = new Map(list.map(p => [p.id, p]));
        setLines(preset.flatMap(([id, qty]) => {
          const product = byId.get(id);
          return product ? [{ product, quantity: qty && /^\d+$/.test(qty) ? qty : '1' }] : [];
        }));
      })
      .catch(err => { if (!cancelled) setLoadError(apiErrorMessage(err, 'No se pudieron cargar los productos')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params]);

  const inPurchase = useMemo(() => new Set(lines.map(l => l.product.id)), [lines]);

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(p => !inPurchase.has(p.id))
      .filter(p => [p.name, p.brand, p.presentation, p.barcode].some(v => v?.toLowerCase().includes(q)))
      .slice(0, MAX_SUGGESTIONS);
  }, [products, search, inPurchase]);

  const addProduct = (product: Product) => {
    // Se renderiza la fila al instante para enfocar su cantidad: con el lector
    // de código de barras se escribe la cantidad apenas se agrega el producto.
    flushSync(() => {
      setError(null);
      setLines(prev => prev.some(l => l.product.id === product.id)
        ? prev.map(l => l.product.id === product.id ? { ...l, quantity: String((Number(l.quantity) || 0) + 1) } : l)
        : [...prev, { product, quantity: '1' }]);
      setSearch('');
    });
    document.querySelector<HTMLInputElement>(`[data-qty="${product.id}"]`)?.select();
  };

  // Enter en el buscador: un código de barras exacto o la única coincidencia.
  const handleSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const code = e.currentTarget.value.trim();
    const byBarcode = code ? products.find(p => p.barcode === code) : undefined;
    const target = byBarcode ?? (suggestions.length === 1 ? suggestions[0] : undefined);
    if (target) addProduct(target);
  };

  const setQuantity = (productId: string, value: string) =>
    setLines(prev => prev.map(l => l.product.id === productId ? { ...l, quantity: value.replace(/\D/g, '') } : l));

  const removeLine = (productId: string) => setLines(prev => prev.filter(l => l.product.id !== productId));

  const totalUnits = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);
  const invalidLine = lines.find(l => !(Number(l.quantity) >= 1));

  const save = async () => {
    if (lines.length === 0) return setError('Agrega al menos un producto a la compra');
    if (invalidLine) return setError(`Indica la cantidad de «${invalidLine.product.name}»`);
    setSaving(true);
    setError(null);
    try {
      const { id } = await inventoryService.createPurchase({
        purchaseDate,
        invoiceId: invoice?.id ?? null,
        note: note.trim() || undefined,
        items: lines.map(l => ({ productId: l.product.id, quantity: Number(l.quantity) })),
      });
      notifyInventoryChanged();
      navigate(`/inventory/purchases/${id}`, { replace: true, state: { registered: true } });
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo registrar la compra'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageDetailLayout
      title="Registrar compra"
      subtitle="Suma stock a los productos comprados y guarda su factura"
      onBack={() => navigate('/inventory/purchases')}
      backLabel="Compras"
      isLoading={loading}
      error={loadError}
    >
      <div className="purchase-form">
        <section className="purchase-card">
          <h2>Datos de la compra</h2>
          <div className="purchase-form__row">
            <label>
              <span className="field-label">Fecha de compra *</span>
              <input
                type="date" value={purchaseDate} max={todayKey()} onChange={(e) => setPurchaseDate(e.target.value)}
                className="filter-select-modern" disabled={saving}
              />
            </label>
            <label>
              <span className="field-label">Nota (opcional)</span>
              <input
                type="text" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)}
                placeholder="Ej: pedido quincenal" className="filter-select-modern" disabled={saving}
              />
            </label>
          </div>
        </section>

        <section className="purchase-card">
          <h2>Factura</h2>
          <PurchaseInvoicePicker value={invoice} onChange={setInvoice} disabled={saving} />
        </section>

        <section className="purchase-card">
          <div className="purchase-card__header">
            <h2>Productos</h2>
            {modules.inventory.create && (
              <button type="button" className="action-btn secondary" onClick={() => setNewProductOpen(true)} disabled={saving}>
                <Plus size={16} aria-hidden /> Producto nuevo
              </button>
            )}
          </div>

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
              <p className="purchase-invoice__hint">Ningún producto coincide{modules.inventory.create ? ': créalo con «Producto nuevo».' : '.'}</p>
            )}
          </div>

          {lines.length === 0 ? (
            <div className="inventory-empty purchase-lines__empty">
              <Package size={28} strokeWidth={1.4} aria-hidden /> Busca y agrega los productos que llegaron.
            </div>
          ) : (
            <div className="table-container">
              <table className="table purchase-lines">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th style={{ textAlign: 'right' }}>Stock actual</th>
                    <th style={{ textAlign: 'right' }}>Cantidad comprada</th>
                    <th style={{ textAlign: 'right' }}>Quedará</th>
                    <th aria-label="Quitar" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map(l => (
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
                          className="bulk-cell bulk-cell--qty" aria-label={`Cantidad de ${l.product.name}`} disabled={saving}
                        />
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{l.product.stock + (Number(l.quantity) || 0)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button type="button" className="icon-btn-plain" onClick={() => removeLine(l.product.id)} aria-label={`Quitar ${l.product.name}`} disabled={saving}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {error && <div className="alert alert-error" role="alert">{error}</div>}

        <div className="bulk-footer">
          <span className="bulk-footer__summary">
            {lines.length === 0 ? 'Sin productos todavía.' : `${lines.length} producto(s) · ${totalUnits} unidad(es)`}
            {!invoice && lines.length > 0 && ' · sin factura'}
          </span>
          <div className="bulk-footer__actions">
            <button type="button" className="action-btn secondary" onClick={() => navigate('/inventory/purchases')} disabled={saving}>
              Cancelar
            </button>
            <button type="button" className="action-btn primary" onClick={save} disabled={saving || lines.length === 0}>
              {saving ? 'Registrando...' : 'Registrar compra'}
            </button>
          </div>
        </div>
      </div>

      <ProductFormModal
        isOpen={newProductOpen}
        onClose={() => setNewProductOpen(false)}
        withoutInitialStock
        onSaved={(product) => { setProducts(prev => [...prev, product]); addProduct(product); }}
      />
    </PageDetailLayout>
  );
}

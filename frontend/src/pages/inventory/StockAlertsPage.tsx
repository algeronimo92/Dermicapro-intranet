import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PageDetailLayout } from '../../components/templates';
import { Select } from '../../components/Select';
import {
  apiErrorMessage,
  CATEGORY_LABELS,
  inventoryService,
  isLowStock,
  type Product,
  type StockAlertRow,
} from '../../services/inventory.service';

type Col = 'min' | 'target';
interface Draft { min: string; target: string }

const onlyDigits = (value: string) => value.replace(/\D/g, '');

/** Lo escrito, validado; null si no cambió respecto de lo guardado. */
function rowChange(product: Product, draft: Draft | undefined): { row: StockAlertRow | null; error: string | null } {
  if (!draft) return { row: null, error: null };
  if (draft.min.trim() === '') return { row: null, error: 'Indica el mínimo' };
  const minStock = Number(draft.min);
  const targetStock = draft.target.trim() === '' ? null : Number(draft.target);
  if (targetStock !== null && targetStock < minStock) return { row: null, error: 'Objetivo menor que el mínimo' };
  if (minStock === product.minStock && targetStock === product.targetStock) return { row: null, error: null };
  return { row: { productId: product.id, minStock, targetStock }, error: null };
}

export function StockAlertsPage() {
  const navigate = useNavigate();
  const { modules } = useAuth();
  const canEdit = modules.inventory.edit;

  const [products, setProducts] = useState<Product[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    inventoryService.getAllActiveProducts()
      .then(list => { if (!cancelled) setProducts(list); })
      .catch(err => { if (!cancelled) setLoadError(apiErrorMessage(err, 'No se pudo cargar el inventario')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const changes = useMemo(() => products.map(p => ({ product: p, ...rowChange(p, drafts[p.id]) })), [products, drafts]);
  const changedRows = changes.flatMap(c => (c.row ? [c.row] : []));
  const errorCount = changes.filter(c => c.error).length;
  const lowCount = products.filter(isLowStock).length;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(p => {
      if (category && p.category !== category) return false;
      if (onlyLow && !isLowStock(p)) return false;
      return !q || [p.name, p.brand, p.presentation, p.barcode].some(v => v?.toLowerCase().includes(q));
    });
  }, [products, search, category, onlyLow]);

  const draftOf = (p: Product): Draft => drafts[p.id] ?? {
    min: String(p.minStock),
    target: p.targetStock === null ? '' : String(p.targetStock),
  };

  const update = (p: Product, col: Col, value: string) => {
    setSuccess(null);
    setDrafts(prev => ({ ...prev, [p.id]: { ...draftOf(p), [col]: onlyDigits(value) } }));
  };

  // Enter y flechas cambian de fila en la misma columna, como en una hoja de cálculo.
  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>, index: number, col: Col) => {
    let delta = 0;
    if (e.key === 'Enter' || e.key === 'ArrowDown') delta = e.key === 'Enter' && e.shiftKey ? -1 : 1;
    else if (e.key === 'ArrowUp') delta = -1;
    if (!delta) return;
    e.preventDefault();
    const next = visible[index + delta];
    if (next) document.querySelector<HTMLInputElement>(`[data-cell="${next.id}:${col}"]`)?.select();
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await inventoryService.updateStockAlerts(changedRows);
      const byId = new Map(changedRows.map(r => [r.productId, r]));
      setProducts(prev => prev.map(p => {
        const r = byId.get(p.id);
        return r ? { ...p, minStock: r.minStock, targetStock: r.targetStock } : p;
      }));
      setDrafts({});
      setSuccess(`Alertas actualizadas en ${updated} producto(s).`);
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudieron guardar las alertas'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageDetailLayout
      title="Alertas de stock"
      subtitle="Un producto entra a la lista de compras cuando su stock llega al mínimo; se sugiere reponer hasta el objetivo"
      onBack={() => navigate('/inventory')}
      backLabel="Productos"
      isLoading={loading}
      error={loadError}
    >
      <div className="bulk-toolbar">
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto…" className="filter-select-modern bulk-toolbar__search" aria-label="Buscar producto"
        />
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={[{ value: '', label: 'Todas las categorías' },
            ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))]}
        />
        <label className="checkbox-modern" style={{ cursor: 'pointer', flexShrink: 0 }}>
          <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} />
          <span className="checkbox-custom" />
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
            Solo en alerta ({lowCount})
          </span>
        </label>
      </div>

      {success && <div className="alert alert-success" role="status">{success}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="bulk-sheet">
        <table className="bulk-table">
          <thead>
            <tr>
              <th className="bulk-table__product">Producto</th>
              <th className="bulk-table__num">Stock</th>
              <th className="bulk-table__num">Mínimo (alerta)</th>
              <th className="bulk-table__num">Objetivo</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={5} className="table-empty">
                {products.length === 0 ? 'No hay productos activos.' : 'Ningún producto coincide con los filtros.'}
              </td></tr>
            ) : visible.map((p, i) => {
              const d = draftOf(p);
              const change = changes.find(c => c.product.id === p.id)!;
              const low = isLowStock({ stock: p.stock, minStock: Number(d.min) || 0 });
              const rowClass = change.error ? 'is-invalid' : change.row ? 'is-changed' : '';
              return (
                <tr key={p.id} className={rowClass}>
                  <td className="bulk-table__product">
                    <span className="bulk-table__name">{p.name}</span>
                    <span className="bulk-table__meta">{[p.brand, p.presentation].filter(Boolean).join(' · ')}</span>
                  </td>
                  <td className="bulk-table__num">{p.stock}</td>
                  {(['min', 'target'] as Col[]).map(col => (
                    <td key={col} className="bulk-table__num">
                      {canEdit ? (
                        <input
                          data-cell={`${p.id}:${col}`} inputMode="numeric" value={d[col]}
                          placeholder={col === 'target' ? '—' : undefined}
                          onChange={(e) => update(p, col, e.target.value)} onKeyDown={(e) => handleKey(e, i, col)}
                          onFocus={(e) => e.target.select()} className="bulk-cell bulk-cell--qty"
                          aria-label={`${col === 'min' ? 'Mínimo' : 'Objetivo'} de ${p.name}`} disabled={saving}
                        />
                      ) : (col === 'min' ? p.minStock : p.targetStock ?? '—')}
                    </td>
                  ))}
                  <td>
                    {change.error
                      ? <span className="alert-state alert-state--error">{change.error}</span>
                      : low
                        ? <span className="alert-state alert-state--low">{p.stock === 0 ? 'Agotado' : 'En alerta'}</span>
                        : <span className="alert-state">OK</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <div className="bulk-footer">
          <span className="bulk-footer__summary">
            {changedRows.length === 0 && errorCount === 0
              ? 'Edita el mínimo o el objetivo. Enter baja a la siguiente fila. El objetivo es opcional.'
              : `${changedRows.length} producto(s) con cambios`}
            {errorCount > 0 && <strong className="bulk-footer__error"> · {errorCount} con errores</strong>}
          </span>
          <div className="bulk-footer__actions">
            {(changedRows.length > 0 || errorCount > 0) && (
              <button type="button" className="action-btn secondary" onClick={() => setDrafts({})} disabled={saving}>Descartar</button>
            )}
            <button type="button" className="action-btn primary" onClick={save} disabled={saving || changedRows.length === 0 || errorCount > 0}>
              {saving ? 'Guardando...' : 'Guardar alertas'}
            </button>
          </div>
        </div>
      )}
    </PageDetailLayout>
  );
}

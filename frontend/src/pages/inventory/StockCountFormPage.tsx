import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Info } from 'lucide-react';
import { PageDetailLayout } from '../../components/templates';
import { Select } from '../../components/Select';
import { Modal } from '../../components/Modal';
import {
  apiErrorMessage,
  CATEGORY_LABELS,
  inventoryService,
  type Product,
  type StockCountConflict,
} from '../../services/inventory.service';
import { notifyInventoryChanged } from '../../services/notifications.service';

const signed = (n: number) => (n > 0 ? `+${n}` : `−${-n}`);

/**
 * Conteo de inventario: junto a cada producto se escribe lo que hay en el
 * estante. Sólo se guardan las filas contadas; si difieren del sistema, el
 * stock se ajusta. Si el stock cambia mientras se cuenta (entró una compra),
 * esas filas se marcan para revisarlas antes de guardar.
 */
export function StockCountFormPage() {
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [counted, setCounted] = useState<Record<string, string>>({});
  const [conflicts, setConflicts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [onlyCounted, setOnlyCounted] = useState(false);
  const [note, setNote] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    inventoryService.getAllActiveProducts()
      .then(list => { if (!cancelled) setProducts(list); })
      .catch(err => { if (!cancelled) setLoadError(apiErrorMessage(err, 'No se pudo cargar el inventario')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const rows = useMemo(() => products
    .filter(p => counted[p.id] !== undefined && counted[p.id] !== '')
    .map(p => ({ product: p, countedStock: Number(counted[p.id]), difference: Number(counted[p.id]) - p.stock })),
  [products, counted]);
  const withDifference = rows.filter(r => r.difference !== 0);
  const surplus = withDifference.reduce((sum, r) => sum + Math.max(0, r.difference), 0);
  const shortage = withDifference.reduce((sum, r) => sum + Math.max(0, -r.difference), 0);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(p => {
      if (category && p.category !== category) return false;
      if (onlyCounted && (counted[p.id] ?? '') === '') return false;
      return !q || [p.name, p.brand, p.presentation, p.barcode].some(v => v?.toLowerCase().includes(q));
    });
  }, [products, search, category, onlyCounted, counted]);

  const update = (id: string, value: string) => {
    setError(null);
    setCounted(prev => ({ ...prev, [id]: value.replace(/\D/g, '') }));
    setConflicts(prev => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Enter y flechas bajan o suben de fila, como en una hoja de cálculo.
  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    let delta = 0;
    if (e.key === 'Enter' || e.key === 'ArrowDown') delta = e.key === 'Enter' && e.shiftKey ? -1 : 1;
    else if (e.key === 'ArrowUp') delta = -1;
    if (!delta) return;
    e.preventDefault();
    const next = visible[index + delta];
    if (next) document.querySelector<HTMLInputElement>(`[data-count="${next.id}"]`)?.select();
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const { id } = await inventoryService.createStockCount({
        note: note.trim() || undefined,
        items: rows.map(r => ({ productId: r.product.id, expectedStock: r.product.stock, countedStock: r.countedStock })),
      });
      notifyInventoryChanged();
      navigate(`/inventory/counts/${id}`, { replace: true, state: { registered: true } });
    } catch (err) {
      setConfirmOpen(false);
      const changed = axios.isAxiosError(err) ? (err.response?.data?.conflicts as StockCountConflict[] | undefined) : undefined;
      if (changed?.length) {
        // Se actualiza el stock del sistema de esas filas para revisarlas.
        const byId = new Map(changed.map(c => [c.productId, c.stock]));
        setProducts(prev => prev.map(p => (byId.has(p.id) ? { ...p, stock: byId.get(p.id)! } : p)));
        setConflicts(new Set(changed.map(c => c.productId)));
        setOnlyCounted(true);
      }
      setError(apiErrorMessage(err, 'No se pudo registrar el conteo'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageDetailLayout
      title="Conteo de inventario"
      subtitle="Escribe lo que hay en el estante. Solo se guardan los productos que cuentes; si difieren, el stock se ajusta"
      onBack={() => navigate('/inventory/counts')}
      backLabel="Conteos"
      isLoading={loading}
      error={loadError}
    >
      <div className="bulk-toolbar">
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto o código…" className="filter-select-modern bulk-toolbar__search" aria-label="Buscar producto"
        />
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={[{ value: '', label: 'Todas las categorías' },
            ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))]}
        />
        <label className="checkbox-modern" style={{ cursor: 'pointer', flexShrink: 0 }}>
          <input type="checkbox" checked={onlyCounted} onChange={(e) => setOnlyCounted(e.target.checked)} />
          <span className="checkbox-custom" />
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
            Solo contados ({rows.length})
          </span>
        </label>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="bulk-sheet">
        <table className="bulk-table count-table">
          <thead>
            <tr>
              <th className="bulk-table__product">Producto</th>
              <th className="bulk-table__num">En sistema</th>
              <th className="bulk-table__num">Contado</th>
              <th className="bulk-table__num count-table__diff">Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={4} className="table-empty">
                {products.length === 0 ? 'No hay productos activos.' : 'Ningún producto coincide con los filtros.'}
              </td></tr>
            ) : visible.map((p, i) => {
              const value = counted[p.id] ?? '';
              const diff = value === '' ? null : Number(value) - p.stock;
              const rowClass = conflicts.has(p.id) ? 'is-conflict' : value !== '' ? 'is-changed' : '';
              return (
                <tr key={p.id} className={rowClass}>
                  <td className="bulk-table__product">
                    <span className="bulk-table__name">{p.name}</span>
                    <span className="bulk-table__meta">
                      {conflicts.has(p.id)
                        ? 'El stock cambió mientras contabas: revisa lo contado'
                        : [p.brand, p.presentation].filter(Boolean).join(' · ')}
                    </span>
                    {diff !== null && (
                      <span className={`bulk-table__meta count-table__diff-inline count-diff${diff ? (diff > 0 ? ' is-surplus' : ' is-shortage') : ''}`}>
                        {diff === 0 ? 'Cuadra' : `Diferencia ${signed(diff)}`}
                      </span>
                    )}
                  </td>
                  <td className="bulk-table__num">{p.stock}</td>
                  <td className="bulk-table__num">
                    <input
                      data-count={p.id} inputMode="numeric" value={value} placeholder="—"
                      onChange={(e) => update(p.id, e.target.value)} onKeyDown={(e) => handleKey(e, i)}
                      onFocus={(e) => e.target.select()} className="bulk-cell bulk-cell--qty"
                      aria-label={`Contado de ${p.name}`} disabled={saving}
                    />
                  </td>
                  <td className={`bulk-table__num count-table__diff count-diff${diff ? (diff > 0 ? ' is-surplus' : ' is-shortage') : ''}`}>
                    {diff === null ? '' : diff === 0 ? 'Cuadra' : signed(diff)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bulk-footer">
        <span className="bulk-footer__summary">
          {rows.length === 0 ? (
            <span className="bulk-footer__hint">
              <Info size={16} aria-hidden />
              <span>
                Escribe cuántas unidades contaste de cada producto.
                <span className="bulk-footer__keys"> Con teclado, <kbd>Enter</kbd> pasa a la siguiente fila.</span>
              </span>
            </span>
          ) : (
            <span>
              <strong className="bulk-footer__count">{rows.length}</strong> contado(s) · {withDifference.length} con diferencia
            </span>
          )}
          {surplus > 0 && <span className="count-diff is-surplus"> · +{surplus} sobrante(s)</span>}
          {shortage > 0 && <span className="count-diff is-shortage"> · −{shortage} faltante(s)</span>}
        </span>
        <div className="bulk-footer__actions">
          <button type="button" className="action-btn secondary" onClick={() => navigate('/inventory/counts')} disabled={saving}>
            Cancelar
          </button>
          <button
            type="button" className="action-btn primary" onClick={() => setConfirmOpen(true)}
            disabled={saving || rows.length === 0 || conflicts.size > 0}
          >
            Revisar y guardar
          </button>
        </div>
      </div>

      <Modal isOpen={confirmOpen} onClose={() => { if (!saving) setConfirmOpen(false); }} title="Guardar conteo" size="medium">
        <p>
          Se registran <strong>{rows.length}</strong> producto(s) contado(s).{' '}
          {withDifference.length === 0
            ? 'Todos cuadran con el sistema: el stock no cambia.'
            : `${withDifference.length} se ajustarán a lo contado:`}
        </p>
        {withDifference.length > 0 && (
          <ul className="count-confirm">
            {withDifference.map(r => (
              <li key={r.product.id}>
                <span>{r.product.name}</span>
                <span>
                  {r.product.stock} → <strong>{r.countedStock}</strong>{' '}
                  <span className={`count-diff ${r.difference > 0 ? 'is-surplus' : 'is-shortage'}`}>({signed(r.difference)})</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <label className="count-confirm__note">
          <span className="field-label">Nota (opcional)</span>
          <input
            type="text" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)}
            placeholder="Ej: conteo de fin de mes" className="filter-select-modern" disabled={saving}
          />
        </label>
        <div className="modal-actions">
          <button type="button" className="action-btn secondary" onClick={() => setConfirmOpen(false)} disabled={saving}>
            Volver
          </button>
          <button type="button" className="action-btn primary" onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar conteo'}
          </button>
        </div>
      </Modal>
    </PageDetailLayout>
  );
}

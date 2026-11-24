import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { PageDetailLayout } from '../components/templates';
import { Modal } from '../components/Modal';
import { Select } from '../components/Select';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  BatchMovementRow,
  CATEGORY_LABELS,
  MovementReason,
  Product,
  REASON_LABELS,
  REASONS_BY_TYPE,
  apiErrorMessage,
  inventoryService,
} from '../services/inventory.service';
import '../styles/inventory.css';

// Una fila de la hoja tal como la escribe el usuario (texto, para no pelear con
// los inputs numéricos mientras se escribe).
interface RowDraft {
  in: string;
  inReason: MovementReason;
  out: string;
  outReason: MovementReason;
  note: string;
}

const EMPTY_ROW: RowDraft = { in: '', inReason: 'purchase', out: '', outReason: 'sale', note: '' };

// Columnas editables, en el orden en que se recorren con Tab/flechas.
type Col = 'in' | 'inReason' | 'out' | 'outReason' | 'note';

interface RowCalc {
  inQty: number;
  outQty: number;
  after: number;
  invalid: boolean;
  changed: boolean;
}

function parseQty(value: string): number | null {
  if (value.trim() === '') return 0;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

function calcRow(product: Product, draft: RowDraft | undefined): RowCalc {
  const inQty = parseQty(draft?.in ?? '');
  const outQty = parseQty(draft?.out ?? '');
  const after = product.stock + (inQty ?? 0) - (outQty ?? 0);
  return {
    inQty: inQty ?? 0,
    outQty: outQty ?? 0,
    after,
    invalid: inQty === null || outQty === null || after < 0,
    changed: (inQty ?? 0) > 0 || (outQty ?? 0) > 0 || inQty === null || outQty === null,
  };
}

// Borrador en el navegador: si se cierra la pestaña a mitad del registro no se
// pierde lo escrito. Puede no estar disponible (modo privado), por eso el try.
const draftKey = (userId?: string) => `inventory-movements-draft:${userId ?? 'anon'}`;

function readDraft(userId?: string): Record<string, RowDraft> {
  try {
    const raw = localStorage.getItem(draftKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeDraft(userId: string | undefined, rows: Record<string, RowDraft>) {
  try {
    if (Object.keys(rows).length === 0) localStorage.removeItem(draftKey(userId));
    else localStorage.setItem(draftKey(userId), JSON.stringify(rows));
  } catch {
    // sin almacenamiento local: el registro funciona igual, sólo sin borrador
  }
}

// Las celdas de cantidad sólo aceptan dígitos (el lector o un descuido no
// pueden dejar texto en una cantidad).
const onlyDigits = (value: string) => value.replace(/\D/g, '');

const isEmptyRow = (d: RowDraft) => !d.in.trim() && !d.out.trim() && !d.note.trim();

export function InventoryMovementsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id;

  const [products, setProducts] = useState<Product[]>([]);
  const [rows, setRows] = useState<Record<string, RowDraft>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [onlyChanged, setOnlyChanged] = useState(false);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [conflictId, setConflictId] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Carga los productos y recupera el borrador, descartando los productos que
  // ya no están activos.
  useEffect(() => {
    let cancelled = false;
    inventoryService.getAllActiveProducts()
      .then(list => {
        if (cancelled) return;
        const ids = new Set(list.map(p => p.id));
        setProducts(list);
        setRows(Object.fromEntries(Object.entries(readDraft(userId)).filter(([id]) => ids.has(id))));
        setLoadError(null);
      })
      .catch(err => { if (!cancelled) setLoadError(apiErrorMessage(err, 'No se pudo cargar el inventario')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  // Guarda el borrador en cada cambio (no mientras se está cargando, para no
  // borrarlo antes de recuperarlo).
  useEffect(() => {
    if (!loading) writeDraft(userId, rows);
  }, [rows, userId, loading]);

  const calcs = useMemo(() => {
    const map = new Map<string, RowCalc>();
    for (const p of products) map.set(p.id, calcRow(p, rows[p.id]));
    return map;
  }, [products, rows]);

  const changedProducts = useMemo(
    () => products.filter(p => calcs.get(p.id)!.changed),
    [products, calcs],
  );
  const hasInvalid = changedProducts.some(p => calcs.get(p.id)!.invalid);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(p => {
      if (category && p.category !== category) return false;
      if (onlyChanged && !calcs.get(p.id)!.changed) return false;
      if (!q) return true;
      return [p.name, p.brand, p.presentation, p.barcode].some(v => v?.toLowerCase().includes(q));
    });
  }, [products, search, category, onlyChanged, calcs]);

  const updateRow = (productId: string, patch: Partial<RowDraft>) => {
    setSuccess(null);
    setRows(prev => {
      const next = { ...(prev[productId] ?? EMPTY_ROW), ...patch };
      const copy = { ...prev };
      if (isEmptyRow(next)) delete copy[productId];
      else copy[productId] = next;
      return copy;
    });
  };

  const focusCell = (productId: string, col: Col) => {
    const el = document.querySelector<HTMLElement>(`[data-cell="${productId}:${col}"]`);
    el?.focus();
    if (el instanceof HTMLInputElement) el.select();
  };

  // Enter y flechas arriba/abajo cambian de fila en la misma columna, como en
  // una hoja de cálculo. En los selects sólo Enter (las flechas cambian el motivo).
  const handleCellKey = (e: React.KeyboardEvent, rowIndex: number, col: Col) => {
    const isSelect = e.currentTarget.tagName === 'SELECT';
    let delta = 0;
    if (e.key === 'Enter') delta = e.shiftKey ? -1 : 1;
    else if (!isSelect && e.key === 'ArrowDown') delta = 1;
    else if (!isSelect && e.key === 'ArrowUp') delta = -1;
    if (!delta) return;
    e.preventDefault();
    const target = visible[rowIndex + delta];
    if (target) focusCell(target.id, col);
  };

  // Enter en el buscador: si el texto es un código de barras (o queda un solo
  // producto), salta a la salida de ese producto. Pensado para el lector.
  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    // Se lee del input y no del estado: el lector escribe y pulsa Enter tan rápido
    // que el estado puede no haberse actualizado todavía.
    const code = e.currentTarget.value.trim();
    const byBarcode = code ? products.find(p => p.barcode === code) : undefined;
    const q = code.toLowerCase();
    const matches = q
      ? visible.filter(p => [p.name, p.brand, p.presentation, p.barcode].some(v => v?.toLowerCase().includes(q)))
      : [];
    const target = byBarcode ?? (matches.length === 1 ? matches[0] : undefined);
    if (!target) return;
    // La fila ya está en pantalla (coincide con lo buscado): se enfoca al instante
    // para que lo que se escriba enseguida caiga en la celda y no en el buscador.
    // Al limpiar la búsqueda React conserva el mismo input, así que el foco sigue ahí.
    focusCell(target.id, 'out');
    if (byBarcode) setSearch('');
  };

  const discardAll = () => {
    setConfirmDiscard(false);
    setRows({});
    setConflictId(null);
    setError(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: BatchMovementRow[] = changedProducts.map(p => {
        const d = rows[p.id] ?? EMPTY_ROW;
        const c = calcs.get(p.id)!;
        return {
          productId: p.id,
          expectedStock: p.stock,
          ...(c.inQty > 0 && { in: { quantity: c.inQty, reason: d.inReason } }),
          ...(c.outQty > 0 && { out: { quantity: c.outQty, reason: d.outReason } }),
          ...(d.note.trim() && { note: d.note.trim() }),
        };
      });
      const result = await inventoryService.createMovementsBatch(payload);
      const stocks = new Map(result.stocks.map(s => [s.productId, s.stock]));
      setProducts(prev => prev.map(p => (stocks.has(p.id) ? { ...p, stock: stocks.get(p.id)! } : p)));
      setRows({});
      setConflictId(null);
      setOnlyChanged(false);
      setReviewOpen(false);
      setSuccess(`Se registraron ${result.movements} movimiento(s) en ${result.stocks.length} producto(s).`);
    } catch (err) {
      setReviewOpen(false);
      setError(apiErrorMessage(err, 'No se pudieron registrar los movimientos'));
      // Otro usuario movió ese producto: se actualiza su stock en pantalla y se
      // marca la fila para que la revisen antes de volver a guardar.
      const data = axios.isAxiosError(err) ? err.response?.data : undefined;
      if (data?.productId && typeof data.currentStock === 'number') {
        setConflictId(data.productId);
        setProducts(prev => prev.map(p => (p.id === data.productId ? { ...p, stock: data.currentStock } : p)));
      }
    } finally {
      setSaving(false);
    }
  };

  const totals = changedProducts.reduce(
    (acc, p) => {
      const c = calcs.get(p.id)!;
      return { in: acc.in + c.inQty, out: acc.out + c.outQty };
    },
    { in: 0, out: 0 },
  );

  return (
    <PageDetailLayout
      title="Registrar movimientos"
      subtitle="Entradas y salidas del día de varios productos a la vez"
      onBack={() => navigate('/inventory')}
      backLabel="Inventario"
      isLoading={loading}
      error={loadError}
    >
      <div className="bulk-toolbar">
        <input
          type="text"
          className="filter-select-modern bulk-toolbar__search"
          placeholder="Buscar o escanear código de barras…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearchKey}
          aria-label="Buscar producto o escanear código de barras"
        />
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={[{ value: '', label: 'Todas las categorías' },
            ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))]}
        />
        <label className="checkbox-modern" style={{ cursor: 'pointer', flexShrink: 0 }}>
          <input type="checkbox" checked={onlyChanged} onChange={(e) => setOnlyChanged(e.target.checked)} />
          <span className="checkbox-custom" />
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
            Solo con cambios
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
              <th className="bulk-table__num bulk-table__in">Entrada</th>
              <th>Motivo entrada</th>
              <th className="bulk-table__num bulk-table__out">Salida</th>
              <th>Motivo salida</th>
              <th>Nota</th>
              <th className="bulk-table__num">Queda</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={8} className="table-empty">
                {products.length === 0 ? 'No hay productos activos.' : 'Ningún producto coincide con los filtros.'}
              </td></tr>
            ) : visible.map((p, i) => {
              const d = rows[p.id] ?? EMPTY_ROW;
              const c = calcs.get(p.id)!;
              const cellProps = (col: Col) => ({
                'data-cell': `${p.id}:${col}`,
                onKeyDown: (e: React.KeyboardEvent) => handleCellKey(e, i, col),
              });
              const rowClass = [
                c.changed && 'is-changed',
                c.invalid && 'is-invalid',
                conflictId === p.id && 'is-conflict',
              ].filter(Boolean).join(' ');
              return (
                <tr key={p.id} className={rowClass}>
                  <td className="bulk-table__product">
                    <span className="bulk-table__name">{p.name}</span>
                    <span className="bulk-table__meta">{[p.brand, p.presentation].filter(Boolean).join(' · ')}</span>
                  </td>
                  <td className="bulk-table__num">{p.stock}</td>
                  <td className="bulk-table__num">
                    <input
                      {...cellProps('in')}
                      className="bulk-cell bulk-cell--qty"
                      inputMode="numeric"
                      value={d.in}
                      onChange={(e) => updateRow(p.id, { in: onlyDigits(e.target.value) })}
                      onFocus={(e) => e.target.select()}
                      aria-label={`Entrada de ${p.name}`}
                    />
                  </td>
                  <td>
                    <select
                      {...cellProps('inReason')}
                      className="bulk-cell"
                      value={d.inReason}
                      disabled={c.inQty === 0}
                      onChange={(e) => updateRow(p.id, { inReason: e.target.value as MovementReason })}
                      aria-label={`Motivo de entrada de ${p.name}`}
                    >
                      {REASONS_BY_TYPE.in.map(r => <option key={r} value={r}>{REASON_LABELS[r]}</option>)}
                    </select>
                  </td>
                  <td className="bulk-table__num">
                    <input
                      {...cellProps('out')}
                      className="bulk-cell bulk-cell--qty"
                      inputMode="numeric"
                      value={d.out}
                      onChange={(e) => updateRow(p.id, { out: onlyDigits(e.target.value) })}
                      onFocus={(e) => e.target.select()}
                      aria-label={`Salida de ${p.name}`}
                    />
                  </td>
                  <td>
                    <select
                      {...cellProps('outReason')}
                      className="bulk-cell"
                      value={d.outReason}
                      disabled={c.outQty === 0}
                      onChange={(e) => updateRow(p.id, { outReason: e.target.value as MovementReason })}
                      aria-label={`Motivo de salida de ${p.name}`}
                    >
                      {REASONS_BY_TYPE.out.map(r => <option key={r} value={r}>{REASON_LABELS[r]}</option>)}
                    </select>
                  </td>
                  <td>
                    <input
                      {...cellProps('note')}
                      className="bulk-cell bulk-cell--note"
                      value={d.note}
                      maxLength={300}
                      onChange={(e) => updateRow(p.id, { note: e.target.value })}
                      aria-label={`Nota de ${p.name}`}
                    />
                  </td>
                  <td className={`bulk-table__num bulk-table__after${c.invalid ? ' is-error' : ''}`}>
                    {c.invalid && c.after >= 0 ? '—' : c.after}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bulk-footer">
        <span className="bulk-footer__summary">
          {changedProducts.length === 0
            ? 'Escribe las cantidades en las columnas Entrada o Salida. Enter baja a la siguiente fila.'
            : `${changedProducts.length} producto(s) con cambios · +${totals.in} entrada(s) · −${totals.out} salida(s)`}
          {hasInvalid && <strong className="bulk-footer__error"> · Hay filas con errores</strong>}
        </span>
        <div className="bulk-footer__actions">
          {changedProducts.length > 0 && (
            <button type="button" className="action-btn secondary" onClick={() => setConfirmDiscard(true)} disabled={saving}>
              Descartar
            </button>
          )}
          <button
            type="button"
            className="action-btn primary"
            disabled={changedProducts.length === 0 || hasInvalid || saving}
            onClick={() => setReviewOpen(true)}
          >
            Revisar y guardar
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmDiscard}
        title="Descartar cambios"
        message={<>¿Descartar lo escrito en <strong>{changedProducts.length} producto(s)</strong>?</>}
        details="Se borran las cantidades y notas de esta hoja. No se ha registrado ningún movimiento todavía."
        confirmLabel="Descartar"
        onConfirm={discardAll}
        onCancel={() => setConfirmDiscard(false)}
      />

      <Modal isOpen={reviewOpen} onClose={() => !saving && setReviewOpen(false)} title="Revisar movimientos" size="large">
        <p className="movement-modal__product">
          Se registrarán estos movimientos. Si alguno falla, no se guarda ninguno.
        </p>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Producto</th>
                <th style={{ textAlign: 'right' }}>Stock</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th style={{ textAlign: 'right' }}>Queda</th>
              </tr>
            </thead>
            <tbody>
              {changedProducts.map(p => {
                const d = rows[p.id] ?? EMPTY_ROW;
                const c = calcs.get(p.id)!;
                return (
                  <tr key={p.id}>
                    <td>
                      {p.name}
                      {d.note.trim() && <div className="bulk-table__meta">{d.note.trim()}</div>}
                    </td>
                    <td style={{ textAlign: 'right' }}>{p.stock}</td>
                    <td className="movement-qty--in">{c.inQty > 0 ? `+${c.inQty} · ${REASON_LABELS[d.inReason]}` : ''}</td>
                    <td className="movement-qty--out">{c.outQty > 0 ? `−${c.outQty} · ${REASON_LABELS[d.outReason]}` : ''}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{c.after}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="modal-actions">
          <button type="button" className="action-btn secondary" onClick={() => setReviewOpen(false)} disabled={saving}>
            Volver a la hoja
          </button>
          <button type="button" className="action-btn primary" onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : `Registrar ${changedProducts.length} producto(s)`}
          </button>
        </div>
      </Modal>
    </PageDetailLayout>
  );
}

import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Select } from './Select';
import {
  apiErrorMessage,
  inventoryService,
  MovementReason,
  MovementType,
  Product,
  REASON_LABELS,
  REASONS_BY_TYPE,
} from '../services/inventory.service';

interface InventoryMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (stock: number) => void;
  product: Product | null;
  initialType?: MovementType;
}

export const InventoryMovementModal: React.FC<InventoryMovementModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  product,
  initialType = 'in',
}) => {
  const [type, setType] = useState<MovementType>(initialType);
  const [reason, setReason] = useState<MovementReason>(REASONS_BY_TYPE[initialType][0]);
  const [quantity, setQuantity] = useState('1');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setType(initialType);
    setReason(REASONS_BY_TYPE[initialType][0]);
    setQuantity('1');
    setNote('');
    setError(null);
  }, [isOpen, initialType]);

  const changeType = (next: MovementType) => {
    setType(next);
    setReason(REASONS_BY_TYPE[next][0]);
  };

  const qty = Number(quantity);
  const validQty = Number.isInteger(qty) && qty > 0;
  const stockAfter = product && validQty ? product.stock + (type === 'in' ? qty : -qty) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    if (!validQty) return setError('La cantidad debe ser un entero mayor a 0');
    if (stockAfter !== null && stockAfter < 0) {
      return setError(`Stock insuficiente: hay ${product.stock} unidad(es) disponibles`);
    }
    setSaving(true);
    setError(null);
    try {
      const { stock } = await inventoryService.createMovement(product.id, {
        type, reason, quantity: qty, note: note.trim() || undefined,
      });
      onSaved(stock);
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo registrar el movimiento'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar movimiento" size="small">
      <form onSubmit={handleSubmit}>
        {product && (
          <p className="movement-modal__product">
            <strong>{product.name}</strong>
            {product.presentation && <> · {product.presentation}</>}
            <br />
            <span>Stock actual: {product.stock} und.</span>
          </p>
        )}
        {error && <div className="alert alert-error" style={{ marginBottom: 'var(--spacing-md)' }}>{error}</div>}

        <div className="movement-modal__types" role="radiogroup" aria-label="Tipo de movimiento">
          {(['in', 'out'] as MovementType[]).map(t => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={type === t}
              className={`movement-type movement-type--${t}${type === t ? ' is-active' : ''}`}
              onClick={() => changeType(t)}
            >
              {t === 'in' ? '＋ Entrada' : '－ Salida'}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
          <Select
            label="Motivo"
            options={REASONS_BY_TYPE[type].map(r => ({ value: r, label: REASON_LABELS[r] }))}
            value={reason}
            onChange={(e) => setReason(e.target.value as MovementReason)}
          />
          <div>
            <label className="field-label">Cantidad</label>
            <input
              type="number" min="1" step="1" value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="filter-select-modern" style={{ width: '100%' }}
            />
            {stockAfter !== null && (
              <div className={`movement-modal__after${stockAfter < 0 ? ' is-error' : ''}`}>
                Quedarán {stockAfter} und.
              </div>
            )}
          </div>
          <div>
            <label className="field-label">Nota (opcional)</label>
            <textarea
              value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={300}
              className="notes-textarea" placeholder="Ej: Factura F001-123, venta a paciente…"
            />
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="action-btn secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="action-btn primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Registrar'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

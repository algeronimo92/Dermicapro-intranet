import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { paymentOrdersService } from '../services/paymentOrders.service';
import { PaymentOrder } from '../types';

interface VoidPaymentOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentOrder: PaymentOrder;
  onSuccess: (updated: PaymentOrder) => void;
}

export const VoidPaymentOrderModal: React.FC<VoidPaymentOrderModalProps> = ({
  isOpen, onClose, paymentOrder, onSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError(null);
      setShowConfirm(false);
    }
  }, [isOpen]);

  const activePaymentsCount = paymentOrder.payments?.filter(p => !p.voidedAt).length || 0;

  const handleSubmit = async () => {
    setShowConfirm(false);
    try {
      setSaving(true);
      setError(null);
      const updated = await paymentOrdersService.voidPaymentOrder(paymentOrder.id, reason.trim());
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al anular la orden de pago');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Anular Orden de Pago" size="small">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        {error && <div className="alert alert-error">{error}</div>}

        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
          Esto anulará {activePaymentsCount === 1 ? 'el pago registrado' : `los ${activePaymentsCount} pagos registrados`} en
          esta orden, revertirá el saldo a favor si corresponde, y marcará la orden como <strong>cancelada</strong>.
          Los servicios incluidos quedarán disponibles para facturarse nuevamente.
        </p>

        <div>
          <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--spacing-sm)' }}>
            Motivo de anulación
          </label>
          <textarea
            className="adet-note-textarea"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Ej: registrado por error, orden duplicada..."
            rows={3}
          />
        </div>
      </div>

      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose} disabled={saving}>Cerrar</Button>
        <Button
          variant="primary"
          onClick={() => setShowConfirm(true)}
          disabled={saving || !reason.trim()}
          style={{ background: 'var(--color-error, #dc2626)', borderColor: 'var(--color-error, #dc2626)' }}
        >
          {saving ? 'Anulando...' : 'Anular Orden'}
        </Button>
      </div>

      {showConfirm && (
        <Modal isOpen onClose={() => setShowConfirm(false)} title="Confirmar anulación" size="small">
          <div style={{
            background: 'var(--color-error-alpha-10, rgba(220,38,38,0.08))',
            border: '2px solid var(--color-error, #dc2626)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--spacing-lg)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-md)',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 'var(--radius-full)',
              background: 'var(--color-error, #dc2626)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 9v4M12 17h.01" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-error, #dc2626)', margin: '0 0 8px' }}>
                Esta acción no se puede deshacer
              </p>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.5 }}>
                Se anulará la orden #{paymentOrder.id.slice(0, 8).toUpperCase()} con motivo:
                <br /><em>"{reason.trim()}"</em>
              </p>
            </div>
          </div>
          <div className="modal-actions" style={{ marginTop: 'var(--spacing-lg)' }}>
            <Button variant="secondary" onClick={() => setShowConfirm(false)}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              style={{ background: 'var(--color-error, #dc2626)', borderColor: 'var(--color-error, #dc2626)' }}
            >
              Sí, anular orden
            </Button>
          </div>
        </Modal>
      )}
    </Modal>
  );
};

import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Invoice, PaymentMethod } from '../types';
import { invoicesService } from '../services/invoices.service';

interface RegisterPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  patientId: string;
  onSuccess: (updated: Invoice) => void;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: PaymentMethod.yape,     label: 'Yape',         icon: '📲' },
  { value: PaymentMethod.plin,     label: 'Plin',         icon: '📱' },
  { value: PaymentMethod.cash,     label: 'Efectivo',     icon: '💵' },
  { value: PaymentMethod.transfer, label: 'Transferencia',icon: '🏦' },
  { value: PaymentMethod.card,     label: 'Tarjeta',      icon: '💳' },
];

export const RegisterPaymentModal: React.FC<RegisterPaymentModalProps> = ({
  isOpen,
  onClose,
  invoice,
  patientId,
  onSuccess,
}) => {
  const totalAmount  = Number(invoice.totalAmount || 0);
  const paidSoFar   = invoice.payments?.reduce((s, p) => s + Number(p.amountPaid), 0) || 0;
  const pendingAmount = totalAmount - paidSoFar;

  const [amount, setAmount]     = useState('');
  const [method, setMethod]     = useState<PaymentMethod>(PaymentMethod.yape);
  const [notes, setNotes]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [amountError, setAmountError] = useState('');

  // Reset al abrir
  useEffect(() => {
    if (isOpen) {
      setAmount(pendingAmount.toFixed(2));
      setMethod(PaymentMethod.yape);
      setNotes('');
      setError(null);
      setAmountError('');
    }
  }, [isOpen]);

  const validateAmount = (val: string) => {
    const num = parseFloat(val);
    if (!val || isNaN(num) || num <= 0) {
      setAmountError('Ingresa un monto válido mayor a 0');
      return false;
    }
    if (num > pendingAmount + 0.01) {
      setAmountError(`El monto no puede superar el pendiente (S/. ${pendingAmount.toFixed(2)})`);
      return false;
    }
    setAmountError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validateAmount(amount)) return;
    try {
      setSaving(true);
      setError(null);
      const updated = await invoicesService.registerPayment({
        patientId,
        invoiceId: invoice.id,
        amountPaid: parseFloat(amount),
        paymentMethod: method,
        notes: notes.trim() || undefined,
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al registrar el pago');
    } finally {
      setSaving(false);
    }
  };

  const pctPaid = totalAmount > 0 ? Math.min((paidSoFar / totalAmount) * 100, 100) : 0;
  const newPct  = totalAmount > 0
    ? Math.min(((paidSoFar + (parseFloat(amount) || 0)) / totalAmount) * 100, 100)
    : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Pago">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>

        {error && <div className="alert alert-error">{error}</div>}

        {/* ── Resumen de la factura ── */}
        <div style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-secondary)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--spacing-md)',
        }}>
          <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)', marginBottom: 'var(--spacing-sm)' }}>
            Factura #{invoice.id.slice(0, 8).toUpperCase()}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
            <div style={{ background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-sm)' }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 600, marginBottom: 2 }}>TOTAL</div>
              <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--color-text-primary)' }}>S/. {totalAmount.toFixed(2)}</div>
            </div>
            <div style={{ background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-sm)' }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 600, marginBottom: 2 }}>PAGADO</div>
              <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--color-success-dark)' }}>S/. {paidSoFar.toFixed(2)}</div>
            </div>
            <div style={{ background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-sm)' }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 600, marginBottom: 2 }}>PENDIENTE</div>
              <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--color-error)' }}>S/. {pendingAmount.toFixed(2)}</div>
            </div>
          </div>

          {/* Barra de progreso con preview */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>
              <span>Progreso actual</span>
              <span>{pctPaid.toFixed(0)}% → <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{newPct.toFixed(0)}%</span></span>
            </div>
            <div style={{ height: 8, background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden', position: 'relative' }}>
              {/* Barra actual */}
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pctPaid}%`, background: 'linear-gradient(90deg, var(--color-success), var(--color-success-dark))', borderRadius: 'var(--radius-full)', transition: 'width 0.3s' }} />
              {/* Preview del nuevo pago */}
              {parseFloat(amount) > 0 && (
                <div style={{ position: 'absolute', left: `${pctPaid}%`, top: 0, height: '100%', width: `${newPct - pctPaid}%`, background: 'linear-gradient(90deg, var(--color-primary-light), var(--color-primary))', borderRadius: 'var(--radius-full)', opacity: 0.7, transition: 'width 0.3s' }} />
              )}
            </div>
          </div>
        </div>

        {/* ── Monto ── */}
        <div>
          <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--spacing-sm)' }}>
            Monto a pagar (S/.)
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)', fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>S/.</span>
            <input
              type="number"
              value={amount}
              min="0.01"
              step="0.01"
              max={pendingAmount}
              onChange={e => { setAmount(e.target.value); if (amountError) validateAmount(e.target.value); }}
              onBlur={e => validateAmount(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: 40,
                paddingRight: 14,
                paddingTop: 11,
                paddingBottom: 11,
                border: `2px solid ${amountError ? 'var(--color-error)' : 'var(--color-border-primary)'}`,
                borderRadius: 'var(--radius-lg)',
                fontSize: 'var(--font-size-xl)',
                fontWeight: 700,
                background: 'var(--color-bg-primary)',
                color: 'var(--color-text-primary)',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                outline: 'none',
                boxShadow: amountError ? '0 0 0 3px var(--color-error-alpha-10)' : 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocus={e => { if (!amountError) e.target.style.borderColor = 'var(--color-primary)'; }}
            />
          </div>
          {amountError && (
            <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-error)' }}>{amountError}</p>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {[25, 50, 75, 100].map(pct => {
              const val = (pendingAmount * pct / 100).toFixed(2);
              return (
                <button key={pct} type="button" onClick={() => { setAmount(val); setAmountError(''); }}
                  style={{ flex: 1, padding: '4px 0', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--color-border-primary)', background: amount === val ? 'var(--color-primary-alpha-10)' : 'var(--color-bg-secondary)', color: amount === val ? 'var(--color-primary)' : 'var(--color-text-tertiary)', fontWeight: 600, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                  {pct === 100 ? 'Total' : `${pct}%`}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Método de pago ── */}
        <div>
          <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--spacing-sm)' }}>
            Método de pago
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
            {PAYMENT_METHODS.map(m => (
              <button key={m.value} type="button" onClick={() => setMethod(m.value)}
                style={{
                  padding: '10px 4px',
                  borderRadius: 'var(--radius-lg)',
                  border: `2px solid ${method === m.value ? 'var(--color-primary)' : 'var(--color-border-primary)'}`,
                  background: method === m.value ? 'var(--color-primary-alpha-10)' : 'var(--color-bg-primary)',
                  color: method === m.value ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  fontWeight: 600,
                  fontSize: 11,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.15s',
                }}>
                <span style={{ fontSize: 20 }}>{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Notas opcionales ── */}
        <div>
          <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--spacing-sm)' }}>
            Notas <span style={{ color: 'var(--color-text-disabled)', fontWeight: 400, textTransform: 'none' }}>(opcional)</span>
          </label>
          <textarea
            className="adet-note-textarea"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Número de operación, referencia, observación..."
            rows={2}
          />
        </div>

        {/* ── Preview del pago ── */}
        {parseFloat(amount) > 0 && !amountError && (
          <div style={{
            background: 'var(--color-primary-alpha-10)',
            border: '1px solid var(--color-border-primary)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 2 }}>Registrando</div>
              <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-primary)' }}>
                S/. {parseFloat(amount).toFixed(2)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 2 }}>vía</div>
              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-primary)' }}>
                {PAYMENT_METHODS.find(m => m.value === method)?.icon}{' '}
                {PAYMENT_METHODS.find(m => m.value === method)?.label}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="primary" onClick={handleSubmit} isLoading={saving} disabled={saving || !!amountError || !amount}>
          Registrar Pago
        </Button>
      </div>
    </Modal>
  );
};

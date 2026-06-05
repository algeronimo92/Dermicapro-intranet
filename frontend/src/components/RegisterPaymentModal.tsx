import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Modal } from './Modal';
import { Button } from './Button';
import { CameraCaptureModal } from './CameraCaptureModal';
import { PaymentOrder, PaymentMethod } from '../types';
import { paymentOrdersService } from '../services/paymentOrders.service';

interface RegisterPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentOrder: PaymentOrder;
  patientId: string;
  patientBalance?: number;
  onSuccess: (updated: PaymentOrder) => void;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: PaymentMethod.yape,     label: 'Yape',         icon: '📲' },
  { value: PaymentMethod.plin,     label: 'Plin',         icon: '📱' },
  { value: PaymentMethod.cash,     label: 'Efectivo',     icon: '💵' },
  { value: PaymentMethod.transfer, label: 'Transferencia',icon: '🏦' },
  { value: PaymentMethod.card,     label: 'Tarjeta',      icon: '💳' },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export const RegisterPaymentModal: React.FC<RegisterPaymentModalProps> = ({
  isOpen,
  onClose,
  paymentOrder,
  patientId,
  patientBalance = 0,
  onSuccess,
}) => {
  const totalAmount    = Number(paymentOrder.totalAmount || 0);
  const paidSoFar      = paymentOrder.payments?.reduce((s, p) => s + Number(p.amountPaid), 0) || 0;
  const pendingAmount  = totalAmount - paidSoFar;

  const [amount, setAmount]           = useState('');
  const [method, setMethod]           = useState<PaymentMethod>(PaymentMethod.yape);
  const [notes, setNotes]             = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);
  const [uploadStep, setUploadStep]   = useState<'idle' | 'paying' | 'uploading'>('idle');
  const [error, setError]             = useState<string | null>(null);
  const [amountError, setAmountError] = useState('');
  const [fileError, setFileError]     = useState('');
  const [showCamera, setShowCamera]   = useState(false);
  const [lightbox, setLightbox]       = useState(false);
  const [useCredit, setUseCredit]     = useState(false);
  const [creditAmount, setCreditAmount] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxCredit = Math.min(patientBalance, pendingAmount);

  useEffect(() => {
    if (isOpen) {
      setAmount(pendingAmount.toFixed(2));
      setMethod(PaymentMethod.yape);
      setNotes('');
      setReceiptFile(null);
      setReceiptPreview(null);
      setError(null);
      setAmountError('');
      setFileError('');
      setUploadStep('idle');
      setUseCredit(false);
      setCreditAmount(maxCredit.toFixed(2));
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

  const handleFileChange = (file: File | null) => {
    setFileError('');
    if (!file) { setReceiptFile(null); setReceiptPreview(null); return; }

    if (!file.type.startsWith('image/')) {
      setFileError('Solo se permiten imágenes (JPG, PNG, WebP, HEIC…)');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError('El archivo no debe superar los 5 MB');
      return;
    }

    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = e => setReceiptPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    handleFileChange(e.dataTransfer.files?.[0] ?? null);
  };

  const handleSubmit = async () => {
    if (!validateAmount(amount)) return;
    try {
      setSaving(true);
      setError(null);
      setUploadStep('paying');

      const creditAmt  = useCredit ? Math.min(parseFloat(creditAmount) || 0, maxCredit, pendingAmount) : 0;
      const regularAmt = parseFloat(amount) - creditAmt;
      let lastPaymentOrder = paymentOrder;
      let lastPaymentId = '';

      // Pago 1: saldo a favor (si aplica)
      if (creditAmt > 0) {
        const res = await paymentOrdersService.registerPayment({
          patientId,
          paymentOrderId: paymentOrder.id,
          amountPaid: creditAmt,
          paymentMethod: PaymentMethod.account_credit,
          notes: notes.trim() || undefined,
        });
        lastPaymentOrder = res.paymentOrder;
        lastPaymentId    = res.paymentId;
      }

      // Pago 2: método normal (si queda saldo por pagar)
      if (regularAmt > 0.005) {
        const res = await paymentOrdersService.registerPayment({
          patientId,
          paymentOrderId: paymentOrder.id,
          amountPaid: regularAmt,
          paymentMethod: method,
          notes: notes.trim() || undefined,
        });
        lastPaymentOrder = res.paymentOrder;
        lastPaymentId    = res.paymentId;
      }

      // Subir comprobante al último pago creado
      if (receiptFile && lastPaymentId) {
        setUploadStep('uploading');
        await paymentOrdersService.uploadReceipt(lastPaymentId, receiptFile);
      }

      onSuccess(lastPaymentOrder);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al registrar el pago');
    } finally {
      setSaving(false);
      setUploadStep('idle');
    }
  };

  const pctPaid = totalAmount > 0 ? Math.min((paidSoFar / totalAmount) * 100, 100) : 0;
  const newPct  = totalAmount > 0
    ? Math.min(((paidSoFar + (parseFloat(amount) || 0)) / totalAmount) * 100, 100)
    : 0;

  const savingLabel = uploadStep === 'uploading'
    ? 'Subiendo comprobante…'
    : uploadStep === 'paying'
    ? 'Registrando pago…'
    : 'Registrar Pago';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Pago">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>

        {error && <div className="alert alert-error">{error}</div>}

        {/* ── Resumen de la orden de pago ── */}
        <div style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-secondary)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--spacing-md)',
        }}>
          <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)', marginBottom: 'var(--spacing-sm)' }}>
            Orden de Pago #{paymentOrder.id.slice(0, 8).toUpperCase()}
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

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>
              <span>Progreso actual</span>
              <span>{pctPaid.toFixed(0)}% → <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{newPct.toFixed(0)}%</span></span>
            </div>
            <div style={{ height: 8, background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pctPaid}%`, background: 'linear-gradient(90deg, var(--color-success), var(--color-success-dark))', borderRadius: 'var(--radius-full)', transition: 'width 0.3s' }} />
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

        {/* ── Saldo a Favor ── */}
        {patientBalance > 0 && (
          <div style={{
            borderRadius: 'var(--radius-xl)',
            border: `2px solid ${useCredit ? 'var(--color-success)' : 'var(--color-border-primary)'}`,
            background: useCredit ? 'var(--color-success-alpha-10)' : 'var(--color-bg-secondary)',
            overflow: 'hidden',
            transition: 'border-color 0.2s, background 0.2s',
          }}>
            {/* Toggle row */}
            <button type="button" onClick={() => setUseCredit(v => !v)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                gap: 'var(--spacing-sm)',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <span style={{ fontSize: 18 }}>💰</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    Usar saldo a favor
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                    S/. {patientBalance.toFixed(2)} disponibles
                  </div>
                </div>
              </div>
              {/* Toggle pill */}
              <div style={{
                width: 42, height: 24, borderRadius: 12, flexShrink: 0,
                background: useCredit ? 'var(--color-success)' : 'var(--color-border-primary)',
                position: 'relative', transition: 'background 0.2s',
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3,
                  left: useCredit ? 21 : 3,
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </div>
            </button>

            {/* Monto de crédito a aplicar */}
            {useCredit && (
              <div style={{ padding: '0 var(--spacing-md) var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                <div style={{ height: 1, background: 'var(--color-success-alpha-10)', margin: '0 -16px 4px' }} />
                <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Monto a descontar del saldo
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-tertiary)' }}>S/.</span>
                    <input type="number" value={creditAmount} min="0.01" step="0.01" max={maxCredit}
                      onChange={e => setCreditAmount(e.target.value)}
                      style={{
                        width: '100%', paddingLeft: 32, paddingRight: 10, paddingTop: 8, paddingBottom: 8,
                        border: '2px solid var(--color-success)', borderRadius: 'var(--radius-lg)',
                        fontSize: 'var(--font-size-base)', fontWeight: 700,
                        background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)',
                        fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none',
                      }} />
                  </div>
                  <button type="button" onClick={() => setCreditAmount(maxCredit.toFixed(2))}
                    style={{
                      padding: '7px 12px', borderRadius: 'var(--radius-lg)', flexShrink: 0,
                      border: '1.5px solid var(--color-success)', background: 'var(--color-success-alpha-10)',
                      color: 'var(--color-success-dark)', fontSize: 11, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                    Máx.
                  </button>
                </div>
                {/* Desglose */}
                {(() => {
                  const ca = Math.min(parseFloat(creditAmount) || 0, maxCredit, pendingAmount);
                  const rest = parseFloat(amount) - ca;
                  return ca > 0 ? (
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 'var(--radius-full)', background: 'var(--color-success-alpha-10)', color: 'var(--color-success-dark)', fontWeight: 600 }}>
                        💰 S/. {ca.toFixed(2)} saldo
                      </span>
                      {rest > 0.005 && (
                        <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 'var(--radius-full)', background: 'var(--color-primary-alpha-10)', color: 'var(--color-primary)', fontWeight: 600 }}>
                          + S/. {rest.toFixed(2)} en {PAYMENT_METHODS.find(m => m.value === method)?.label}
                        </span>
                      )}
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        )}

        {/* ── Comprobante (foto opcional) ── */}
        <div>
          <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--spacing-sm)' }}>
            Comprobante{' '}
            <span style={{ color: 'var(--color-text-disabled)', fontWeight: 400, textTransform: 'none' }}>(opcional)</span>
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => handleFileChange(e.target.files?.[0] ?? null)}
          />

          {receiptPreview ? (
            /* ── Vista previa portrait-friendly ── */
            <div style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '2px solid var(--color-primary)', background: '#111' }}>

              {/* Imagen con contain para no recortar portrait */}
              <button type="button" onClick={() => setLightbox(true)} title="Ver completo"
                style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: 'none', cursor: 'zoom-in' }}>
                <img
                  src={receiptPreview}
                  alt="Comprobante"
                  style={{
                    width: '100%',
                    maxHeight: 280,
                    objectFit: 'contain',
                    display: 'block',
                    background: '#111',
                  }}
                />
              </button>

              {/* Barra inferior: nombre + acciones */}
              <div style={{
                background: 'rgba(4,47,46,0.92)',
                padding: '6px 10px',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                {/* Expand */}
                <button type="button" onClick={() => setLightbox(true)} title="Ver completo"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Ver
                </button>

                {/* Nombre del archivo */}
                <span style={{ flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {receiptFile?.name}
                </span>

                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
                  {receiptFile ? (receiptFile.size / 1024 > 999 ? (receiptFile.size / 1024 / 1024).toFixed(1) + ' MB' : (receiptFile.size / 1024).toFixed(0) + ' KB') : ''}
                </span>

                {/* Cambiar */}
                <button type="button" onClick={() => fileInputRef.current?.click()} title="Cambiar imagen"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(45,212,191,0.25)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Cambiar
                </button>

                {/* Quitar */}
                <button type="button"
                  onClick={() => { setReceiptFile(null); setReceiptPreview(null); setFileError(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  title="Quitar imagen"
                  style={{ width: 24, height: 24, borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 15, lineHeight: 1, flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.7)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}>
                  ×
                </button>
              </div>
            </div>
          ) : (
            /* ── Dos opciones: galería + cámara ── */
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
              {/* Subir archivo */}
              <button type="button" className="upload-receipt-button" style={{ padding: 'var(--spacing-md) var(--spacing-sm)' }}
                onClick={() => fileInputRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
                <svg className="upload-icon" width="28" height="28" viewBox="0 0 32 32" fill="none">
                  <path d="M16 6v14M16 6l-6 6M16 6l6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 24h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                <span className="upload-label">Subir archivo</span>
                <span className="upload-hint">Galería · arrastra o clic</span>
              </button>

              {/* Tomar foto */}
              <button type="button" className="upload-receipt-button" style={{ padding: 'var(--spacing-md) var(--spacing-sm)' }}
                onClick={() => setShowCamera(true)}>
                <svg className="upload-icon" width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M23 7l-7 5 7 5V7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <span className="upload-label">Tomar foto</span>
                <span className="upload-hint">Usar cámara</span>
              </button>
            </div>
          )}

          {fileError && (
            <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-error)' }}>{fileError}</p>
          )}
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 2 }}>vía</div>
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {PAYMENT_METHODS.find(m => m.value === method)?.icon}{' '}
                  {PAYMENT_METHODS.find(m => m.value === method)?.label}
                </div>
              </div>
              {receiptFile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--font-size-xs)', color: 'var(--color-success)', fontWeight: 600 }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Con comprobante
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={saving || !!amountError || !amount}>
          {savingLabel}
        </Button>
      </div>

      <CameraCaptureModal
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={file => { handleFileChange(file); setShowCamera(false); }}
      />

      {/* ── Lightbox para ver comprobante a tamaño completo ── */}
      {lightbox && receiptPreview && createPortal(
        <div
          onClick={() => setLightbox(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: 'var(--spacing-lg)',
            cursor: 'zoom-out',
          }}
        >
          <button
            onClick={() => setLightbox(false)}
            style={{
              position: 'absolute', top: 16, right: 16,
              width: 40, height: 40, borderRadius: 'var(--radius-full)',
              background: 'rgba(255,255,255,0.15)', border: 'none',
              color: '#fff', fontSize: 22, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
          <img
            src={receiptPreview}
            alt="Comprobante completo"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '92vw',
              maxHeight: '88vh',
              objectFit: 'contain',
              borderRadius: 'var(--radius-xl)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
              cursor: 'default',
            }}
          />
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 12 }}>
            {receiptFile?.name} · {receiptFile ? (receiptFile.size / 1024 > 999 ? (receiptFile.size / 1024 / 1024).toFixed(1) + ' MB' : (receiptFile.size / 1024).toFixed(0) + ' KB') : ''}
          </p>
        </div>,
        document.body
      )}
    </Modal>
  );
};

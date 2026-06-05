import React, { useState, useEffect, useRef } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { CameraCapture } from './CameraCapture';
import { ImageViewer } from './ImageViewer';
import { PaymentMethod } from '../types';
import { creditsService } from '../services/credits.service';
import { paymentOrdersService } from '../services/paymentOrders.service';

interface AddCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  currentBalance: number;
  onSuccess: (newBalance: number) => void;
}

const METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: PaymentMethod.yape,     label: 'Yape',         icon: '📲' },
  { value: PaymentMethod.plin,     label: 'Plin',         icon: '📱' },
  { value: PaymentMethod.cash,     label: 'Efectivo',     icon: '💵' },
  { value: PaymentMethod.transfer, label: 'Transferencia',icon: '🏦' },
  { value: PaymentMethod.card,     label: 'Tarjeta',      icon: '💳' },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const AddCreditModal: React.FC<AddCreditModalProps> = ({
  isOpen, onClose, patientId, patientName, currentBalance, onSuccess,
}) => {
  const [amount, setAmount]             = useState('');
  const [method, setMethod]             = useState<PaymentMethod>(PaymentMethod.yape);
  const [notes, setNotes]               = useState('');
  const [receiptFile, setReceiptFile]   = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [amountError, setAmountError]   = useState('');
  const [fileError, setFileError]       = useState('');
  const [showCamera, setShowCamera]     = useState(false);
  const [lightbox, setLightbox]         = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setMethod(PaymentMethod.yape);
      setNotes('');
      setReceiptFile(null);
      setReceiptPreview(null);
      setError(null);
      setAmountError('');
      setFileError('');
    }
  }, [isOpen]);

  const validateAmount = (val: string) => {
    const n = parseFloat(val);
    if (!val || isNaN(n) || n <= 0) { setAmountError('Ingresa un monto válido mayor a 0'); return false; }
    setAmountError('');
    return true;
  };

  const handleFileChange = (file: File | null) => {
    setFileError('');
    if (!file) { setReceiptFile(null); setReceiptPreview(null); return; }
    if (!file.type.startsWith('image/')) { setFileError('Solo se permiten imágenes'); return; }
    if (file.size > MAX_FILE_SIZE) { setFileError('El archivo no debe superar los 5 MB'); return; }
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = e => setReceiptPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!validateAmount(amount)) return;
    try {
      setSaving(true);
      setError(null);
      const { paymentId, accountBalance } = await creditsService.addCredit(patientId, {
        amount: parseFloat(amount),
        paymentMethod: method,
        notes: notes.trim() || undefined,
      });
      if (receiptFile) {
        await paymentOrdersService.uploadReceipt(paymentId, receiptFile);
      }
      onSuccess(accountBalance);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al agregar saldo');
    } finally {
      setSaving(false);
    }
  };

  const clearFile = () => { setReceiptFile(null); setReceiptPreview(null); setFileError(''); if (fileInputRef.current) fileInputRef.current.value = ''; };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Agregar Saldo a Favor">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Saldo actual */}
        <div style={{
          background: 'var(--color-primary-alpha-10)',
          border: '1px solid var(--color-border-primary)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--spacing-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)' }}>
              Paciente
            </div>
            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: 2 }}>
              {patientName}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)' }}>
              Saldo actual
            </div>
            <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-primary)', marginTop: 2 }}>
              S/. {currentBalance.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Monto */}
        <div>
          <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--spacing-sm)' }}>
            Monto a abonar (S/.)
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)', fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>S/.</span>
            <input
              type="number" value={amount} min="0.01" step="0.01"
              onChange={e => { setAmount(e.target.value); if (amountError) validateAmount(e.target.value); }}
              onBlur={e => validateAmount(e.target.value)}
              placeholder="0.00"
              style={{
                width: '100%', paddingLeft: 40, paddingRight: 14, paddingTop: 11, paddingBottom: 11,
                border: `2px solid ${amountError ? 'var(--color-error)' : 'var(--color-border-primary)'}`,
                borderRadius: 'var(--radius-lg)', fontSize: 'var(--font-size-xl)', fontWeight: 700,
                background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)',
                fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none',
              }}
              onFocus={e => { if (!amountError) e.target.style.borderColor = 'var(--color-primary)'; }}
            />
          </div>
          {amountError && <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-error)' }}>{amountError}</p>}

          {/* Preview nuevo saldo */}
          {parseFloat(amount) > 0 && !amountError && (
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
              <span>Nuevo saldo:</span>
              <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: 'var(--font-size-sm)' }}>
                S/. {(currentBalance + parseFloat(amount)).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Método de pago */}
        <div>
          <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--spacing-sm)' }}>
            Método de pago recibido
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
            {METHODS.map(m => (
              <button key={m.value} type="button" onClick={() => setMethod(m.value)}
                style={{
                  padding: '10px 4px', borderRadius: 'var(--radius-lg)',
                  border: `2px solid ${method === m.value ? 'var(--color-primary)' : 'var(--color-border-primary)'}`,
                  background: method === m.value ? 'var(--color-primary-alpha-10)' : 'var(--color-bg-primary)',
                  color: method === m.value ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  fontWeight: 600, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}>
                <span style={{ fontSize: 20 }}>{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Comprobante */}
        <div>
          <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--spacing-sm)' }}>
            Comprobante <span style={{ color: 'var(--color-text-disabled)', fontWeight: 400, textTransform: 'none' }}>(opcional)</span>
          </label>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => handleFileChange(e.target.files?.[0] ?? null)} />

          {receiptPreview ? (
            <div style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '2px solid var(--color-primary)', background: '#111' }}>
              <button type="button" onClick={() => setLightbox(true)} style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: 'none', cursor: 'zoom-in' }}>
                <img src={receiptPreview} alt="Comprobante" style={{ width: '100%', maxHeight: 240, objectFit: 'contain', display: 'block', background: '#111' }} />
              </button>
              <div style={{ background: 'rgba(4,47,46,0.92)', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <button type="button" onClick={() => setLightbox(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Ver
                </button>
                <span style={{ flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{receiptFile?.name}</span>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  style={{ padding: '3px 8px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                  Cambiar
                </button>
                <button type="button" onClick={clearFile}
                  style={{ width: 24, height: 24, borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 15, flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.7)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}>×</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
              <button type="button" className="upload-receipt-button" style={{ padding: 'var(--spacing-md) var(--spacing-sm)' }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleFileChange(e.dataTransfer.files?.[0] ?? null); }}>
                <svg className="upload-icon" width="26" height="26" viewBox="0 0 32 32" fill="none">
                  <path d="M16 6v14M16 6l-6 6M16 6l6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 24h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                <span className="upload-label">Subir archivo</span>
                <span className="upload-hint">Galería · arrastra</span>
              </button>
              <button type="button" className="upload-receipt-button" style={{ padding: 'var(--spacing-md) var(--spacing-sm)' }}
                onClick={() => setShowCamera(true)}>
                <svg className="upload-icon" width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <path d="M23 7l-7 5 7 5V7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <span className="upload-label">Tomar foto</span>
                <span className="upload-hint">Usar cámara</span>
              </button>
            </div>
          )}
          {fileError && <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-error)' }}>{fileError}</p>}
        </div>

        {/* Notas */}
        <div>
          <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--spacing-sm)' }}>
            Notas <span style={{ color: 'var(--color-text-disabled)', fontWeight: 400, textTransform: 'none' }}>(opcional)</span>
          </label>
          <textarea className="adet-note-textarea" value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Número de operación, referencia..." rows={2} />
        </div>
      </div>

      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={saving || !!amountError || !amount}>
          {saving ? 'Agregando saldo…' : 'Agregar Saldo'}
        </Button>
      </div>

      {showCamera && (
        <CameraCapture
          onClose={() => setShowCamera(false)}
          onCapture={file => { handleFileChange(file); setShowCamera(false); }}
        />
      )}

      {lightbox && receiptPreview && (
        <ImageViewer images={[receiptPreview]} alt="Comprobante" onClose={() => setLightbox(false)} />
      )}
    </Modal>
  );
};

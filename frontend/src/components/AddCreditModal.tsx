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
const MAX_RECEIPTS = 3;

export const AddCreditModal: React.FC<AddCreditModalProps> = ({
  isOpen, onClose, patientId, patientName, currentBalance, onSuccess,
}) => {
  const [amount, setAmount]             = useState('');
  const [method, setMethod]             = useState<PaymentMethod>(PaymentMethod.yape);
  const [notes, setNotes]               = useState('');
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [receiptPreviews, setReceiptPreviews] = useState<string[]>([]);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [amountError, setAmountError]   = useState('');
  const [fileError, setFileError]       = useState('');
  const [showCamera, setShowCamera]     = useState(false);
  const [lightbox, setLightbox]         = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showConfirm, setShowConfirm]   = useState(false);


  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setMethod(PaymentMethod.yape);
      setNotes('');
      setReceiptFiles([]);
      setReceiptPreviews([]);
      setError(null);
      setAmountError('');
      setFileError('');
      setShowConfirm(false);
    }
  }, [isOpen]);

  const validateAmount = (val: string) => {
    const n = parseFloat(val);
    if (!val || isNaN(n) || n <= 0) { setAmountError('Ingresa un monto valido mayor a 0'); return false; }
    setAmountError('');
    return true;
  };

  const handleFilesAdd = (incoming: File[]) => {
    setFileError('');
    const remaining = MAX_RECEIPTS - receiptFiles.length;
    if (remaining <= 0) {
      setFileError(`Maximo ${MAX_RECEIPTS} comprobantes permitidos`);
      return;
    }
    const toAdd: File[] = [];
    for (const file of incoming.slice(0, remaining)) {
      if (!file.type.startsWith('image/')) { setFileError('Solo se permiten imagenes'); return; }
      if (file.size > MAX_FILE_SIZE) { setFileError('El archivo no debe superar los 5 MB'); return; }
      toAdd.push(file);
    }
    if (toAdd.length === 0) return;
    setReceiptFiles(prev => [...prev, ...toAdd]);
    toAdd.forEach(file => {
      const reader = new FileReader();
      reader.onload = e => setReceiptPreviews(prev => [...prev, e.target?.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeReceiptFile = (index: number) => {
    setReceiptFiles(prev => prev.filter((_, i) => i !== index));
    setReceiptPreviews(prev => prev.filter((_, i) => i !== index));
    setFileError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRequestConfirm = () => {
    if (!validateAmount(amount)) return;
    setShowConfirm(true);

  };

  const handleSubmit = async () => {
    setShowConfirm(false);
    try {
      setSaving(true);
      setError(null);
      const { paymentId, accountBalance } = await creditsService.addCredit(patientId, {
        amount: parseFloat(amount),
        paymentMethod: method,
        notes: notes.trim() || undefined,
      });
      if (receiptFiles.length > 0) {
        await paymentOrdersService.uploadReceipt(paymentId, receiptFiles);
      }
      onSuccess(accountBalance);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al agregar saldo');
    } finally {
      setSaving(false);
    }
  };

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

        {/* Metodo de pago */}
        <div>
          <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--spacing-sm)' }}>
            Metodo de pago recibido
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
          <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
            onChange={e => { const selected = e.target.files; if (selected?.length) handleFilesAdd(Array.from(selected)); if (fileInputRef.current) fileInputRef.current.value = ''; }} />

          {receiptFiles.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-sm)' }}>
                {receiptPreviews.map((preview, idx) => (
                  <div key={idx} style={{
                    position: 'relative',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    border: '2px solid var(--color-border-primary)',
                    background: '#111',
                    aspectRatio: '1',
                  }}>
                    <button type="button" onClick={() => { setLightboxIndex(idx); setLightbox(true); }}
                      style={{ display: 'block', width: '100%', height: '100%', padding: 0, border: 'none', background: 'none', cursor: 'zoom-in' }}>
                      <img src={preview} alt={`Comprobante ${idx + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </button>
                    <button type="button" onClick={() => removeReceiptFile(idx)}
                      style={{
                        position: 'absolute', top: 4, right: 4,
                        width: 22, height: 22, borderRadius: 'var(--radius-full)',
                        background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.25)',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.85)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.65)')}>
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--spacing-sm)' }}>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
                  {receiptFiles.length} de {MAX_RECEIPTS} comprobantes
                </span>
                {receiptFiles.length < MAX_RECEIPTS && (
                  <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '4px 10px', borderRadius: 'var(--radius-md)',
                        background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)',
                        color: 'var(--color-text-secondary)', fontSize: 11, fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}>
                      <svg width="12" height="12" viewBox="0 0 32 32" fill="none">
                        <path d="M16 6v14M16 6l-6 6M16 6l6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6 24h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                      </svg>
                      Agregar archivo
                    </button>
                    <button type="button" onClick={() => setShowCamera(true)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '4px 10px', borderRadius: 'var(--radius-md)',
                        background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)',
                        color: 'var(--color-text-secondary)', fontSize: 11, fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M23 7l-7 5 7 5V7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Tomar foto
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
              <button type="button" className="upload-receipt-button" style={{ padding: 'var(--spacing-md) var(--spacing-sm)' }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const dropped = e.dataTransfer.files; if (dropped?.length) handleFilesAdd(Array.from(dropped)); }}>
                <svg className="upload-icon" width="26" height="26" viewBox="0 0 32 32" fill="none">
                  <path d="M16 6v14M16 6l-6 6M16 6l6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 24h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                <span className="upload-label">Subir archivo</span>
                <span className="upload-hint">Galeria -- arrastra</span>
              </button>
              <button type="button" className="upload-receipt-button" style={{ padding: 'var(--spacing-md) var(--spacing-sm)' }}
                onClick={() => setShowCamera(true)}>
                <svg className="upload-icon" width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <path d="M23 7l-7 5 7 5V7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <span className="upload-label">Tomar foto</span>
                <span className="upload-hint">Usar camara</span>
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
            placeholder="Numero de operacion, referencia..." rows={2} />
        </div>
      </div>

      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="primary" onClick={handleRequestConfirm} disabled={saving || !!amountError || !amount}>
          {saving ? 'Agregando saldo...' : 'Agregar Saldo'}
        </Button>
      </div>

      {showCamera && (
        <CameraCapture
          onClose={() => setShowCamera(false)}
          onCapture={file => { handleFilesAdd([file]); setShowCamera(false); }}
        />
      )}

      {lightbox && receiptPreviews.length > 0 && (
        <ImageViewer images={receiptPreviews.filter(p => !!p)} initialIndex={lightboxIndex} alt="Comprobante" onClose={() => setLightbox(false)} />
      )}

      {showConfirm && (
        <Modal isOpen onClose={() => setShowConfirm(false)} title="Confirmar abono" size="small">
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
              <p style={{
                fontSize: 'var(--font-size-lg)', fontWeight: 700,
                color: 'var(--color-error, #dc2626)', margin: '0 0 8px',
              }}>
                Atencion: Esta accion no se puede deshacer
              </p>
              <p style={{
                fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)',
                margin: 0, lineHeight: 1.5,
              }}>
                Se agregara <strong style={{ color: 'var(--color-text-primary)' }}>S/. {parseFloat(amount).toFixed(2)}</strong> al
                saldo a favor de <strong style={{ color: 'var(--color-text-primary)' }}>{patientName}</strong> mediante <strong style={{ color: 'var(--color-text-primary)' }}>{METHODS.find(m => m.value === method)?.label}</strong>.
              </p>
              <p style={{
                fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)',
                margin: '8px 0 0', lineHeight: 1.5,
              }}>
                Nuevo saldo: <strong style={{ color: 'var(--color-primary)' }}>S/. {(currentBalance + parseFloat(amount)).toFixed(2)}</strong>
              </p>
            </div>
          </div>
          <div className="modal-actions" style={{ marginTop: 'var(--spacing-lg)' }}>
            <Button variant="secondary" onClick={() => setShowConfirm(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              style={{ background: 'var(--color-error, #dc2626)', borderColor: 'var(--color-error, #dc2626)' }}
            >
              Si, agregar saldo
            </Button>
          </div>
        </Modal>
      )}
    </Modal>
  );
};

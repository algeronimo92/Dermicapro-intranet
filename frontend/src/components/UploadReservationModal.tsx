import React, { useState, useRef } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { CameraCapture } from './CameraCapture';

const MAX_FILES = 3;

interface UploadReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amount: number, files: File[], paymentMethod: string) => Promise<void>;
  maxAmount?: number;
  fixedAmount?: number;
}

export const UploadReservationModal: React.FC<UploadReservationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  maxAmount,
  fixedAmount
}) => {
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCamera, setShowCamera] = useState(false);

  const addFiles = (newFiles: File[]) => {
    const remaining = MAX_FILES - files.length;
    if (remaining <= 0) {
      setError(`Solo se permiten ${MAX_FILES} comprobantes`);
      return;
    }

    const toAdd = newFiles.slice(0, remaining);
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

    for (const f of toAdd) {
      if (!validTypes.includes(f.type)) {
        setError('Solo se permiten archivos JPG, PNG o PDF');
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        setError('Cada archivo no debe superar los 5MB');
        return;
      }
    }

    setError(null);
    setFiles(prev => [...prev, ...toAdd]);

    toAdd.forEach(f => {
      if (f.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrls(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(f);
      } else {
        setPreviewUrls(prev => [...prev, '']);
      }
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;
    addFiles(Array.from(selected));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCameraCapture = (capturedFile: File) => {
    setShowCamera(false);
    addFiles([capturedFile]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const effectiveAmount = fixedAmount ?? parseFloat(amount);

    if (!fixedAmount && (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)) {
      setError('Por favor ingrese un monto valido');
      return;
    }

    if (!paymentMethod) {
      setError('Por favor seleccione un metodo de pago');
      return;
    }

    if (files.length === 0) {
      setError('Por favor seleccione al menos un archivo');
      return;
    }

    if (!fixedAmount && maxAmount && parseFloat(amount) > maxAmount) {
      setError(`El monto no puede ser mayor a S/. ${maxAmount.toFixed(2)}`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(effectiveAmount, files, paymentMethod);
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Error al subir recibo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setPaymentMethod('');
    setFiles([]);
    setPreviewUrls([]);
    setError(null);
    setIsSubmitting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Subir Recibo de Reserva">
      <form onSubmit={handleSubmit} className="upload-reservation-form">
        {error && (
          <div className="alert alert-error" style={{ marginBottom: '20px' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM10 6v4M10 14h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {error}
          </div>
        )}

        <div className="form-section">
          <div className="input-group">
            <label className="input-label">
              Monto de la Reserva {fixedAmount === undefined ? '*' : ''}
            </label>
            <div className="input-with-icon">
              <span className="input-prefix">S/.</span>
              {fixedAmount !== undefined ? (
                <input
                  type="number"
                  value={fixedAmount.toFixed(2)}
                  className="input input-with-prefix"
                  readOnly
                  disabled
                />
              ) : (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={maxAmount}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input input-with-prefix"
                  placeholder="0.00"
                  required
                  disabled={isSubmitting}
                />
              )}
            </div>
            {!fixedAmount && maxAmount && (
              <p className="input-help">
                Maximo: S/. {maxAmount.toFixed(2)}
              </p>
            )}
          </div>

          <div className="input-group">
            <label className="input-label">Metodo de Pago *</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="input"
              disabled={isSubmitting}
              required
            >
              <option value="">Seleccionar metodo...</option>
              <option value="yape">Yape</option>
              <option value="plin">Plin</option>
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
              <option value="card">Tarjeta</option>
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">
              Comprobante de Pago *
            </label>
            <div className="file-upload-area">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,application/pdf"
                onChange={handleFileSelect}
                className="file-input-hidden"
                disabled={isSubmitting}
                multiple
              />

              {files.length === 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', width: '100%' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="file-upload-button"
                    disabled={isSubmitting}
                    style={{ padding: 'var(--spacing-lg) var(--spacing-md)' }}
                  >
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                      <path d="M16 6v14M16 6l-6 6M16 6l6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M6 24h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                    <span className="upload-text">Subir archivos</span>
                    <span className="upload-hint">JPG, PNG o PDF (max {MAX_FILES})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    className="file-upload-button"
                    disabled={isSubmitting}
                    style={{ padding: 'var(--spacing-lg) var(--spacing-md)' }}
                  >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                      <path d="M23 7l-7 5 7 5V7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    <span className="upload-text">Tomar foto</span>
                    <span className="upload-hint">Usar camara</span>
                  </button>
                </div>
              ) : (
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(files.length, 3)}, 1fr)`, gap: 'var(--spacing-sm)' }}>
                    {files.map((f, idx) => (
                      <div key={idx} style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '2px solid var(--color-border-primary)', background: 'var(--color-bg-secondary)' }}>
                        {previewUrls[idx] ? (
                          <img src={previewUrls[idx]} alt={`Preview ${idx + 1}`} style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                        ) : (
                          <div style={{ height: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            <svg width="32" height="32" viewBox="0 0 64 64" fill="none">
                              <path d="M40 8H16a4 4 0 00-4 4v40a4 4 0 004 4h32a4 4 0 004-4V20L40 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M40 8v12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <p style={{ fontSize: 11, margin: 0, color: 'var(--color-text-tertiary)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 4px' }}>{f.name}</p>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          disabled={isSubmitting}
                          style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 'var(--radius-full)', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                        >
                          <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                            <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  {files.length < MAX_FILES && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
                      <button type="button" onClick={() => fileInputRef.current?.click()}
                        className="file-upload-button" disabled={isSubmitting}
                        style={{ padding: 'var(--spacing-sm)' }}>
                        <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                          <path d="M16 6v14M16 6l-6 6M16 6l6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M6 24h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                        </svg>
                        <span className="upload-text" style={{ fontSize: 12 }}>Agregar archivo</span>
                      </button>
                      <button type="button" onClick={() => setShowCamera(true)}
                        className="file-upload-button" disabled={isSubmitting}
                        style={{ padding: 'var(--spacing-sm)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M23 7l-7 5 7 5V7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        <span className="upload-text" style={{ fontSize: 12 }}>Tomar foto</span>
                      </button>
                    </div>
                  )}
                  <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 'var(--spacing-xs)', textAlign: 'center', marginBottom: 0 }}>
                    {files.length} de {MAX_FILES} comprobantes
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: '24px' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={isSubmitting || files.length === 0 || (!fixedAmount && !amount)}
          >
            {isSubmitting ? 'Subiendo...' : 'Subir Recibo'}
          </Button>
        </div>
      </form>
      {showCamera && (
        <CameraCapture
          onClose={() => setShowCamera(false)}
          onCapture={handleCameraCapture}
        />
      )}
    </Modal>
  );
};

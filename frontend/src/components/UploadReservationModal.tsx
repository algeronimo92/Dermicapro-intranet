import React, { useState, useRef } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { CameraCapture } from './CameraCapture';

interface UploadReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amount: number, file: File, paymentMethod: string) => Promise<void>;
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
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCamera, setShowCamera] = useState(false);

  const handleCameraCapture = (capturedFile: File) => {
    setShowCamera(false);
    setFile(capturedFile);
    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(capturedFile);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validar tipo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Solo se permiten archivos JPG, PNG o PDF');
      return;
    }

    // Validar tamaño (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('El archivo no debe superar los 5MB');
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Crear preview si es imagen
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const effectiveAmount = fixedAmount ?? parseFloat(amount);

    if (!fixedAmount && (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)) {
      setError('Por favor ingrese un monto válido');
      return;
    }

    if (!paymentMethod) {
      setError('Por favor seleccione un método de pago');
      return;
    }

    if (!file) {
      setError('Por favor seleccione un archivo');
      return;
    }

    if (!fixedAmount && maxAmount && parseFloat(amount) > maxAmount) {
      setError(`El monto no puede ser mayor a S/. ${maxAmount.toFixed(2)}`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(effectiveAmount, file, paymentMethod);
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
    setFile(null);
    setPreviewUrl(null);
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
                Máximo: S/. {maxAmount.toFixed(2)}
              </p>
            )}
          </div>

          <div className="input-group">
            <label className="input-label">Método de Pago *</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="input"
              disabled={isSubmitting}
              required
            >
              <option value="">Seleccionar método...</option>
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
                required
                disabled={isSubmitting}
              />

              {!file ? (
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
                    <span className="upload-text">Subir archivo</span>
                    <span className="upload-hint">JPG, PNG o PDF</span>
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
                    <span className="upload-hint">Usar cámara</span>
                  </button>
                </div>
              ) : (
                <div className="file-preview">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="preview-image" />
                  ) : (
                    <div className="pdf-preview">
                      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                        <path d="M40 8H16a4 4 0 00-4 4v40a4 4 0 004 4h32a4 4 0 004-4V20L40 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M40 8v12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <p>{file.name}</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setPreviewUrl(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="remove-file-btn"
                    disabled={isSubmitting}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Cambiar archivo
                  </button>
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
            disabled={isSubmitting || !file || (!fixedAmount && !amount)}
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

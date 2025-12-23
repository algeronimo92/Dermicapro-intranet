import React, { useState, useRef } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface UploadReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amount: number, file: File) => Promise<void>;
  maxAmount?: number;
}

export const UploadReservationModal: React.FC<UploadReservationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  maxAmount
}) => {
  const [amount, setAmount] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError('Por favor ingrese un monto válido');
      return;
    }

    if (!file) {
      setError('Por favor seleccione un archivo');
      return;
    }

    if (maxAmount && parseFloat(amount) > maxAmount) {
      setError(`El monto no puede ser mayor a S/. ${maxAmount.toFixed(2)}`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(parseFloat(amount), file);
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al subir recibo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setAmount('');
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
              Monto de la Reserva *
            </label>
            <div className="input-with-icon">
              <span className="input-prefix">S/.</span>
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
            </div>
            {maxAmount && (
              <p className="input-help">
                Máximo: S/. {maxAmount.toFixed(2)}
              </p>
            )}
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
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="file-upload-button"
                  disabled={isSubmitting}
                >
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/>
                    <path d="M24 16v16M16 24h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span className="upload-text">Clic para seleccionar archivo</span>
                  <span className="upload-hint">JPG, PNG o PDF (máx. 5MB)</span>
                </button>
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
            disabled={isSubmitting || !file || !amount}
          >
            {isSubmitting ? 'Subiendo...' : 'Subir Recibo'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import './ConfirmModal.css';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  /** Texto principal de la pregunta. */
  message: React.ReactNode;
  /** Detalle opcional bajo el mensaje (consecuencias, aclaraciones). */
  details?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** danger: acción que quita algo de la vista o del sistema; primary: acción neutra. */
  variant?: 'danger' | 'primary';
  loading?: boolean;
  loadingLabel?: string;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

// Confirmación propia de la app, en lugar del window.confirm del navegador.
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  details,
  confirmLabel,
  cancelLabel = 'Cancelar',
  variant = 'danger',
  loading = false,
  loadingLabel = 'Guardando...',
  error,
  onConfirm,
  onCancel,
}) => {
  const Icon = variant === 'danger' ? AlertTriangle : Info;
  return (
    <Modal isOpen={isOpen} onClose={() => !loading && onCancel()} title={title} size="small">
      <div className={`confirm-modal confirm-modal--${variant}`}>
        <span className="confirm-modal__icon" aria-hidden>
          <Icon size={22} />
        </span>
        <div className="confirm-modal__body">
          <p className="confirm-modal__message">{message}</p>
          {details && <div className="confirm-modal__details">{details}</div>}
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert" style={{ marginTop: 'var(--spacing-md)' }}>{error}</div>}

      <div className="modal-actions">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
        <Button variant={variant} onClick={onConfirm} disabled={loading} autoFocus>
          {loading ? loadingLabel : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
};

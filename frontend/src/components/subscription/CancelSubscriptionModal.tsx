import React, { useState } from 'react';
import { formatSubscriptionDate } from '../../services/subscription.service';
import './CancelSubscriptionModal.css';

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  periodEnd: string | null;
  isLoading: boolean;
  onCancel: () => void;
  onConfirm: (reason?: string) => Promise<void>;
}

const CancelSubscriptionModal: React.FC<CancelSubscriptionModalProps> = ({
  isOpen,
  periodEnd,
  isLoading,
  onCancel,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setError(null);
      await onConfirm(reason || undefined);
    } catch (err) {
      setError('Error al cancelar la suscripción. Por favor intenta de nuevo.');
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div className="cancel-modal__overlay" onClick={handleOverlayClick}>
      <div className="cancel-modal">
        <div className="cancel-modal__header">
          <h2 className="cancel-modal__title">Cancelar suscripción</h2>
          <button className="cancel-modal__close" onClick={onCancel}>
            ×
          </button>
        </div>

        <div className="cancel-modal__body">
          <div className="cancel-modal__warning">
            <span className="cancel-modal__warning-icon">⚠️</span>
            <div>
              <p className="cancel-modal__warning-text">
                Al cancelar, mantendrás acceso a todos los beneficios hasta el{' '}
                <strong>{formatSubscriptionDate(periodEnd)}</strong>.
              </p>
              <p className="cancel-modal__warning-subtext">
                Después de esta fecha, perderás acceso a los descuentos y sesiones incluidas.
              </p>
            </div>
          </div>

          <div className="cancel-modal__reason">
            <label htmlFor="cancel-reason" className="cancel-modal__label">
              ¿Por qué deseas cancelar? (opcional)
            </label>
            <textarea
              id="cancel-reason"
              className="cancel-modal__textarea"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tu feedback nos ayuda a mejorar..."
              rows={3}
              maxLength={500}
            />
          </div>

          {error && <p className="cancel-modal__error">{error}</p>}
        </div>

        <div className="cancel-modal__footer">
          <button
            className="cancel-modal__button cancel-modal__button--secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Mantener suscripción
          </button>
          <button
            className="cancel-modal__button cancel-modal__button--danger"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Cancelando...' : 'Confirmar cancelación'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelSubscriptionModal;

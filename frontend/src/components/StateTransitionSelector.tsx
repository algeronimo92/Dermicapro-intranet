import React, { useState } from 'react';
import { AppointmentStatus } from '../types';
import {
  getAvailableTransitions,
  canTransition,
  requiresConfirmation,
  getConfirmationMessage,
  createTransitionLog,
  TransitionContext,
} from '../config/appointmentStateMachine.config';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from './Modal';

interface StateTransitionSelectorProps {
  currentStatus: AppointmentStatus;
  appointmentId: string;
  appointment?: any;
  onTransition: (newStatus: AppointmentStatus) => Promise<void>;
  disabled?: boolean;
}

/**
 * Componente para seleccionar transiciones de estado válidas
 * Implementa la State Machine con guards y validaciones
 */
export const StateTransitionSelector: React.FC<StateTransitionSelectorProps> = ({
  currentStatus,
  appointmentId,
  appointment,
  onTransition,
  disabled = false,
}) => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingTransition, setPendingTransition] = useState<AppointmentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Contexto para evaluación de guards
  const context: TransitionContext = {
    appointment,
    user,
    metadata: {},
  };

  // Obtener transiciones disponibles
  const availableTransitions = getAvailableTransitions(
    currentStatus,
    user?.role,
    context
  );

  const handleTransitionClick = async (newStatus: AppointmentStatus) => {
    setError(null);

    // Validar si la transición es permitida
    const validation = canTransition(currentStatus, newStatus, user?.role, context);

    if (!validation.allowed) {
      setError(validation.reason || 'Transición no permitida');
      return;
    }

    // Validación especial: In Progress → Attended requiere fotos
    if (currentStatus === AppointmentStatus.in_progress && newStatus === AppointmentStatus.attended) {
      const hasBeforePhotos = appointment?.patientRecords?.some((record: any) => {
        const photos = record.beforePhotoUrls as string[] | null;
        return photos && photos.length > 0;
      });

      if (!hasBeforePhotos) {
        setError('⚠️ Debes subir al menos fotos de ANTES para finalizar la atención. Por favor, sube las fotos en la sección "Fotos del Tratamiento" antes de continuar.');
        return;
      }
    }

    // Verificar si requiere confirmación
    if (requiresConfirmation(currentStatus, newStatus)) {
      setPendingTransition(newStatus);
      setShowConfirmModal(true);
      return;
    }

    // Ejecutar transición directamente
    await executeTransition(newStatus);
  };

  const executeTransition = async (newStatus: AppointmentStatus) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Ejecutar la transición
      await onTransition(newStatus);

      // Crear log de auditoría
      createTransitionLog({
        appointmentId,
        fromStatus: currentStatus,
        toStatus: newStatus,
        userId: user!.id,
        timestamp: new Date(),
      });

      // Limpiar estado
      setPendingTransition(null);
      setShowConfirmModal(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cambiar el estado');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    if (pendingTransition) {
      await executeTransition(pendingTransition);
    }
  };

  const handleCancel = () => {
    setPendingTransition(null);
    setShowConfirmModal(false);
  };

  // Mapeo de iconos SVG
  const icons: Record<string, React.ReactNode> = {
    play: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M5 3L11 8L5 13V3z" fill="currentColor"/>
      </svg>
    ),
    check: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M13.333 4L6 11.333L2.667 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    x: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    refresh: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M13.65 6.35A6 6 0 108 14v0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 4v4h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    'arrow-left': (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    'user-x': (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10.667 14v-1.333A2.667 2.667 0 008 10H4a2.667 2.667 0 00-2.667 2.667V14M13.333 5.333l-2.666 2.667m0-2.667l2.666 2.667M6 6.667A2 2 0 116 2.667a2 2 0 010 4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    clock: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2"/>
        <path d="M8 4v4l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  };

  // Mapeo de colores por tipo de transición
  const getTransitionClass = (toStatus: AppointmentStatus): string => {
    switch (toStatus) {
      case AppointmentStatus.in_progress:
        return 'transition-btn--primary';
      case AppointmentStatus.attended:
        return 'transition-btn--success';
      case AppointmentStatus.reserved:
        return 'transition-btn--secondary';
      case AppointmentStatus.cancelled:
      case AppointmentStatus.no_show:
        return 'transition-btn--danger';
      default:
        return 'transition-btn--default';
    }
  };

  if (availableTransitions.length === 0) {
    return null; // No hay transiciones disponibles
  }

  return (
    <div className="state-transition-selector">
      <div className="transition-label">Cambiar estado a:</div>

      <div className="transition-buttons">
        {availableTransitions.map((transition) => (
          <button
            key={`${transition.from}-${transition.to}`}
            className={`transition-btn ${getTransitionClass(transition.to)}`}
            onClick={() => handleTransitionClick(transition.to)}
            disabled={disabled || isProcessing}
            title={transition.description}
          >
            {transition.icon && icons[transition.icon]}
            <span>{transition.label}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="transition-error">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2"/>
            <path d="M8 4v4M8 11h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          {error}
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={handleCancel}
        title="Confirmar Cambio de Estado"
      >
        <div className="transition-confirm-modal">
          <p className="transition-confirm-message">
            {pendingTransition && getConfirmationMessage(currentStatus, pendingTransition)}
          </p>

          <div className="transition-confirm-actions">
            <button
              className="btn-cancel"
              onClick={handleCancel}
              disabled={isProcessing}
            >
              Cancelar
            </button>
            <button
              className="btn-confirm"
              onClick={handleConfirm}
              disabled={isProcessing}
            >
              {isProcessing ? 'Procesando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

import React, { useState } from 'react';
import { AppointmentStatus } from '../types';
import {
  getAvailableTransitions,
  canTransition,
  requiresConfirmation,
  getConfirmationMessage,
  createTransitionLog,
  TransitionContext,
  StateTransition,
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

// Transiciones del flujo principal (acción más probable)
const PRIMARY_PATHS: [AppointmentStatus, AppointmentStatus][] = [
  [AppointmentStatus.reserved, AppointmentStatus.in_progress],
  [AppointmentStatus.in_progress, AppointmentStatus.attended],
  [AppointmentStatus.cancelled, AppointmentStatus.reserved],
  [AppointmentStatus.no_show, AppointmentStatus.reserved],
];

const isPrimary = (from: AppointmentStatus, to: AppointmentStatus) =>
  PRIMARY_PATHS.some(([f, t]) => f === from && t === to);

const isDestructive = (to: AppointmentStatus) =>
  to === AppointmentStatus.cancelled || to === AppointmentStatus.no_show;

// Iconos SVG
const ICONS: Record<string, React.ReactNode> = {
  play: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M5.5 3.5L14 9L5.5 14.5V3.5z" fill="currentColor"/>
    </svg>
  ),
  check: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M15 4.5L7 12.5L3 8.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  x: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  refresh: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M13.65 6.35A6 6 0 108 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M14 4v4h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  'arrow-left': (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  'user-x': (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M10.667 14v-1.333A2.667 2.667 0 008 10H4a2.667 2.667 0 00-2.667 2.667V14M12 5.333l2.667 2.667m0-2.667L12 8M6 7a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  clock: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M8 4.5v3.5l2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
};

const PRIMARY_COLORS: Partial<Record<AppointmentStatus, string>> = {
  [AppointmentStatus.in_progress]: 'sts-primary--primary',
  [AppointmentStatus.attended]:    'sts-primary--success',
  [AppointmentStatus.reserved]:    'sts-primary--primary',
};

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

  const context: TransitionContext = { appointment, user, metadata: {} };
  const availableTransitions = getAvailableTransitions(currentStatus, user?.role, context);

  const primaryTransitions = availableTransitions.filter(t => isPrimary(currentStatus, t.to));
  const secondaryTransitions = availableTransitions.filter(t => !isPrimary(currentStatus, t.to));
  const destructiveTransitions = secondaryTransitions.filter(t => isDestructive(t.to));
  const revertTransitions = secondaryTransitions.filter(t => !isDestructive(t.to));

  const handleClick = async (newStatus: AppointmentStatus) => {
    setError(null);

    const validation = canTransition(currentStatus, newStatus, user?.role, context);
    if (!validation.allowed) {
      setError(validation.reason || 'Transición no permitida');
      return;
    }

    if (requiresConfirmation(currentStatus, newStatus)) {
      setPendingTransition(newStatus);
      setShowConfirmModal(true);
      return;
    }

    await executeTransition(newStatus);
  };

  const executeTransition = async (newStatus: AppointmentStatus) => {
    setIsProcessing(true);
    setError(null);
    try {
      await onTransition(newStatus);
      createTransitionLog({
        appointmentId,
        fromStatus: currentStatus,
        toStatus: newStatus,
        userId: user!.id,
        timestamp: new Date(),
      });
      setPendingTransition(null);
      setShowConfirmModal(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cambiar el estado');
    } finally {
      setIsProcessing(false);
    }
  };

  if (availableTransitions.length === 0) return null;

  const renderPrimaryBtn = (t: StateTransition) => (
    <button
      key={t.to}
      className={`sts-primary-btn ${PRIMARY_COLORS[t.to] || 'sts-primary--indigo'}`}
      onClick={() => handleClick(t.to)}
      disabled={disabled || isProcessing}
    >
      <span className="sts-primary-btn__icon">{ICONS[t.icon || '']}</span>
      <span className="sts-primary-btn__body">
        <span className="sts-primary-btn__label">{t.label}</span>
        <span className="sts-primary-btn__desc">{t.description}</span>
      </span>
      <svg className="sts-primary-btn__arrow" width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M7 5l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );

  const renderSecondaryBtn = (t: StateTransition) => (
    <button
      key={t.to}
      className={`sts-secondary-btn ${isDestructive(t.to) ? 'sts-secondary-btn--danger' : 'sts-secondary-btn--neutral'}`}
      onClick={() => handleClick(t.to)}
      disabled={disabled || isProcessing}
      title={t.description}
    >
      {ICONS[t.icon || '']}
      <span>{t.label}</span>
    </button>
  );

  return (
    <div className="sts-wrapper">
      {/* Acción principal */}
      {primaryTransitions.length > 0 && (
        <div className="sts-primary-section">
          {primaryTransitions.map(renderPrimaryBtn)}
        </div>
      )}

      {/* Acciones secundarias */}
      {(revertTransitions.length > 0 || destructiveTransitions.length > 0) && (
        <div className="sts-secondary-section">
          {revertTransitions.map(renderSecondaryBtn)}
          {destructiveTransitions.map(renderSecondaryBtn)}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="sts-error">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M8 4.5v4M8 11h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          {error}
        </div>
      )}

      {/* Modal de confirmación */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => { setShowConfirmModal(false); setPendingTransition(null); }}
        title="Confirmar cambio de estado"
      >
        <div className="sts-confirm">
          <p className="sts-confirm__msg">
            {pendingTransition && getConfirmationMessage(currentStatus, pendingTransition)}
          </p>
          <div className="sts-confirm__actions">
            <button
              className="sts-confirm__cancel"
              onClick={() => { setShowConfirmModal(false); setPendingTransition(null); }}
              disabled={isProcessing}
            >
              Cancelar
            </button>
            <button
              className="sts-confirm__ok"
              onClick={() => pendingTransition && executeTransition(pendingTransition)}
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

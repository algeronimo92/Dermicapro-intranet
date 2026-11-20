import React from 'react';
import { Timer } from 'lucide-react';
import { useIdleCountdown, formatCountdown } from '../hooks/useIdleTimeout';

interface IdleWarningModalProps {
  getMsRemaining: () => number;
  /** Duración total de la advertencia, para dibujar el anillo */
  warningMs: number;
  onLogout: () => void;
  onContinue: () => void;
}

const R = 28;
const CIRC = 2 * Math.PI * R;

/** Advertencia de cierre por inactividad. Lleva su propio tic de 1 s. */
export const IdleWarningModal: React.FC<IdleWarningModalProps> = ({
  getMsRemaining, warningMs, onLogout, onContinue,
}) => {
  const ms = useIdleCountdown(getMsRemaining);
  const pct = Math.min(1, ms / warningMs);
  const critical = ms <= 15_000;

  return (
    <div className="app-dialog__backdrop" role="alertdialog" aria-modal="true" aria-labelledby="idle-modal-title">
      <div className={`app-dialog${critical ? ' app-dialog--critical' : ''}`}>
        <div className="app-dialog__ring">
          <svg width="80" height="80" aria-hidden="true">
            <circle cx="40" cy="40" r={R} className="app-dialog__ring-track" />
            <circle
              cx="40" cy="40" r={R}
              className="app-dialog__ring-fill"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC * (1 - pct)}
            />
          </svg>
          <Timer size={22} strokeWidth={1.75} className="app-dialog__ring-icon" />
        </div>

        <div>
          <h2 id="idle-modal-title" className="app-dialog__title">¿Sigues ahí?</h2>
          <p className="app-dialog__text">
            La sesión cerrará en <strong>{formatCountdown(ms)}</strong> por inactividad.
          </p>
        </div>

        <div className="app-dialog__actions">
          <button type="button" className="app-dialog__btn app-dialog__btn--ghost" onClick={onLogout}>
            Cerrar sesión
          </button>
          <button type="button" className="app-dialog__btn app-dialog__btn--primary" onClick={onContinue} autoFocus>
            Continuar sesión
          </button>
        </div>
      </div>
    </div>
  );
};

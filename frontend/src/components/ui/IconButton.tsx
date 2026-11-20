import React, { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import '../../styles/icon-button.css';

type Tone = 'success' | 'danger' | 'primary' | 'neutral';

interface IconButtonProps {
  icon: React.ReactNode;
  /** Texto del tooltip y nombre accesible del botón */
  label: string;
  onClick?: () => void;
  tone?: Tone;
  disabled?: boolean;
  /** Si está deshabilitado, el tooltip explica por qué */
  disabledReason?: string;
}

/**
 * Botón de ícono para acciones de tabla (aprobar, rechazar, pagar…).
 * El tooltip se dibuja en un portal para que no lo recorte el scroll de la
 * tabla, y aparece también con el foco del teclado.
 */
export const IconButton: React.FC<IconButtonProps> = ({
  icon, label, onClick, tone = 'neutral', disabled, disabledReason,
}) => {
  const ref = useRef<HTMLButtonElement>(null);
  const tipId = useId();
  const [tip, setTip] = useState<{ x: number; y: number; below: boolean } | null>(null);
  const text = disabled && disabledReason ? disabledReason : label;

  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const below = r.top < 48;
    setTip({ x: r.left + r.width / 2, y: below ? r.bottom + 8 : r.top - 8, below });
  };
  const hide = () => setTip(null);

  return (
    <>
      <button
        ref={ref}
        type="button"
        className={`icon-btn icon-btn--${tone}`}
        onClick={disabled ? undefined : onClick}
        aria-disabled={disabled || undefined}
        aria-label={label}
        aria-describedby={tip ? tipId : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {icon}
      </button>
      {tip && createPortal(
        <span
          id={tipId}
          role="tooltip"
          className={`icon-btn__tip${tip.below ? ' is-below' : ''}${disabled ? ' is-disabled' : ''}`}
          style={{ left: tip.x, top: tip.y }}
        >
          {text}
        </span>,
        document.body,
      )}
    </>
  );
};

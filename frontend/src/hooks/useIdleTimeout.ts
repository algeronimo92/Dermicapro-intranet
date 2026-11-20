import { useEffect, useRef, useCallback, useState } from 'react';

const ACTIVITY_EVENTS = [
  'mousemove', 'mousedown', 'keydown',
  'scroll', 'touchstart', 'click', 'wheel',
] as const;

interface Options {
  timeout: number;
  warningBefore: number;
  onTimeout: () => void;
}

export interface IdleState {
  showWarning: boolean;
  /** Milisegundos que faltan para el cierre por inactividad, leídos al momento */
  getMsRemaining: () => number;
  extendSession: () => void;
}

/**
 * Cierra la sesión tras `timeout` ms sin actividad.
 *
 * La marca de la última actividad vive en un ref, no en el estado: el layout
 * solo se vuelve a renderizar cuando aparece o desaparece la advertencia.
 * Antes este hook guardaba la hora en el estado y forzaba un render por
 * segundo (y por cada movimiento del mouse) de toda la aplicación, lo que
 * hacía que dashboards y gráficos se redibujaran sin parar. Los contadores
 * visibles usan `useIdleCountdown`, que se actualiza dentro de su propio
 * componente.
 */
export function useIdleTimeout({ timeout, warningBefore, onTimeout }: Options): IdleState {
  const [showWarning, setShowWarning] = useState(false);
  const lastResetRef = useRef(Date.now());

  const onTimeoutRef = useRef(onTimeout);
  useEffect(() => { onTimeoutRef.current = onTimeout; }, [onTimeout]);

  const logoutTimerRef  = useRef<ReturnType<typeof setTimeout>>(undefined);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const clearAllTimers = useCallback(() => {
    clearTimeout(logoutTimerRef.current);
    clearTimeout(warningTimerRef.current);
  }, []);

  const resetTimer = useCallback(() => {
    clearAllTimers();
    lastResetRef.current = Date.now();
    // React descarta el render si el valor no cambia
    setShowWarning(false);

    warningTimerRef.current = setTimeout(() => setShowWarning(true), timeout - warningBefore);

    logoutTimerRef.current = setTimeout(() => {
      clearAllTimers();
      setShowWarning(false);
      onTimeoutRef.current();
    }, timeout);
  }, [timeout, warningBefore, clearAllTimers]);

  const getMsRemaining = useCallback(
    () => Math.max(0, timeout - (Date.now() - lastResetRef.current)),
    [timeout],
  );

  useEffect(() => {
    const handle = () => resetTimer();
    ACTIVITY_EVENTS.forEach(e => document.addEventListener(e, handle, { passive: true }));
    resetTimer();
    return () => {
      clearAllTimers();
      ACTIVITY_EVENTS.forEach(e => document.removeEventListener(e, handle));
    };
  }, [resetTimer, clearAllTimers]);

  return { showWarning, getMsRemaining, extendSession: resetTimer };
}

/**
 * Lee los milisegundos restantes una vez por segundo. Úsalo solo en el
 * componente que pinta el contador, para que el tic no suba por el árbol.
 */
export function useIdleCountdown(getMsRemaining: () => number): number {
  const [ms, setMs] = useState(getMsRemaining);
  useEffect(() => {
    const id = setInterval(() => setMs(getMsRemaining()), 1000);
    return () => clearInterval(id);
  }, [getMsRemaining]);
  return ms;
}

export function formatCountdown(ms: number): string {
  const totalSecs = Math.ceil(ms / 1000);
  return `${Math.floor(totalSecs / 60)}:${String(totalSecs % 60).padStart(2, '0')}`;
}

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

interface IdleState {
  showWarning: boolean;
  secondsLeft: number;
  percentageRemaining: number;
  msRemaining: number;
  extendSession: () => void;
}

export function useIdleTimeout({ timeout, warningBefore, onTimeout }: Options): IdleState {
  // lastResetTime: timestamp del último reset — actualiza el cálculo en cada render
  const [lastResetTime, setLastResetTime] = useState(() => Date.now());
  // renderTick: incrementa cada segundo para forzar re-renders del cronómetro
  const [, setRenderTick] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.floor(warningBefore / 1000));

  // Valores derivados calculados en cada render — sin state async
  const msRemaining       = Math.max(0, timeout - (Date.now() - lastResetTime));
  const percentageRemaining = Math.max(0, Math.round((msRemaining / timeout) * 100));

  const onTimeoutRef = useRef(onTimeout);
  useEffect(() => { onTimeoutRef.current = onTimeout; }, [onTimeout]);

  const logoutTimerRef  = useRef<ReturnType<typeof setTimeout>>(undefined);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const countdownRef    = useRef<ReturnType<typeof setInterval>>(undefined);
  const renderTickRef   = useRef<ReturnType<typeof setInterval>>(undefined);

  const clearAllTimers = useCallback(() => {
    clearTimeout(logoutTimerRef.current);
    clearTimeout(warningTimerRef.current);
    clearInterval(countdownRef.current);
    clearInterval(renderTickRef.current);
  }, []);

  const resetTimer = useCallback(() => {
    clearAllTimers();
    const now = Date.now();
    setLastResetTime(now);
    setShowWarning(false);

    // Tick de 1 s para re-renderizar el cronómetro
    renderTickRef.current = setInterval(() => {
      setRenderTick(t => t + 1);
    }, 1000);

    // Advertencia
    warningTimerRef.current = setTimeout(() => {
      const warnSecs = Math.floor(warningBefore / 1000);
      setSecondsLeft(warnSecs);
      setShowWarning(true);

      countdownRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) { clearInterval(countdownRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
    }, timeout - warningBefore);

    // Logout
    logoutTimerRef.current = setTimeout(() => {
      clearAllTimers();
      setShowWarning(false);
      onTimeoutRef.current();
    }, timeout);
  }, [timeout, warningBefore, clearAllTimers]);

  const extendSession = useCallback(() => resetTimer(), [resetTimer]);

  useEffect(() => {
    const handle = () => resetTimer();
    ACTIVITY_EVENTS.forEach(e => document.addEventListener(e, handle, { passive: true }));
    resetTimer();
    return () => {
      clearAllTimers();
      ACTIVITY_EVENTS.forEach(e => document.removeEventListener(e, handle));
    };
  }, [resetTimer, clearAllTimers]);

  return { showWarning, secondsLeft, percentageRemaining, msRemaining, extendSession };
}

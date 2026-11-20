import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { flushSync } from 'react-dom';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  /** El modo de tema seleccionado por el usuario (light, dark, auto) */
  mode: ThemeMode;
  /** El tema resuelto actual (light o dark) después de aplicar auto */
  resolvedTheme: ResolvedTheme;
  /** Función para cambiar el modo de tema */
  setMode: (mode: ThemeMode) => void;
  /** Toggle rápido entre light y dark (ignora auto) */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'dermicapro-theme-mode';

/** Detecta la preferencia del sistema operativo */
const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/** Obtiene el modo guardado en localStorage o usa 'auto' como default */
const getSavedThemeMode = (): ThemeMode => {
  if (typeof window === 'undefined') return 'auto';
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === 'light' || saved === 'dark' || saved === 'auto') {
    return saved;
  }
  return 'auto';
};

/** Resuelve el tema actual basado en el modo y la preferencia del sistema */
const resolveTheme = (mode: ThemeMode): ResolvedTheme => {
  if (mode === 'auto') {
    return getSystemTheme();
  }
  return mode;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => getSavedThemeMode());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(mode));

  // Aplicar el tema inicial sin transiciones
  useEffect(() => {
    // Marcar como cargando para prevenir transiciones
    document.documentElement.classList.add('loading');

    const initialTheme = resolveTheme(mode);
    document.documentElement.setAttribute('data-theme', initialTheme);

    // Remover clase loading después de que el DOM esté pintado
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('loading');
      });
    });
  }, []);

  /**
   * Cambia el tema de una sola vez. Con View Transitions el navegador funde la
   * página completa (antes y después) en un único cruce; sin soporte, o con
   * "reducir movimiento", el cambio es instantáneo. En ambos casos se apagan
   * las transiciones de cada elemento para que nada quede a medio camino.
   */
  const applyTheme = useCallback((theme: ResolvedTheme, animate: boolean) => {
    const root = document.documentElement;
    if (root.getAttribute('data-theme') === theme) {
      setResolvedTheme(theme);
      return;
    }

    root.classList.add('theme-switching');
    // Se reactivan las transiciones en el siguiente frame (o a los 100 ms si la
    // página no está pintando frames, p. ej. en segundo plano)
    const finish = () => {
      let removed = false;
      const remove = () => {
        if (removed) return;
        removed = true;
        root.classList.remove('theme-switching');
      };
      requestAnimationFrame(remove);
      window.setTimeout(remove, 100);
    };
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const canAnimate = animate && !reduceMotion
      && document.visibilityState === 'visible' && 'startViewTransition' in document;

    if (canAnimate) {
      let applied = false;
      const transition = document.startViewTransition(() => {
        if (applied) return;
        applied = true;
        // El "después" debe incluir lo que pinta React (p. ej. colores de gráficos)
        flushSync(() => setResolvedTheme(theme));
        root.setAttribute('data-theme', theme);
      });
      transition.finished.finally(finish);
      // Si la página no se está pintando (pestaña en segundo plano), el
      // navegador no corre la transición: se aplica el cambio igual.
      // Red de seguridad: siempre se cierra el cambio y se reactivan las transiciones.
      window.setTimeout(() => {
        if (!applied) {
          applied = true;
          setResolvedTheme(theme);
          root.setAttribute('data-theme', theme);
        }
        transition.skipTransition();
        finish();
      }, 600);
    } else {
      setResolvedTheme(theme);
      root.setAttribute('data-theme', theme);
      void root.offsetHeight; // aplica el cambio con las transiciones apagadas
      finish();
    }
  }, []);

  // Aplicar el tema al documento cuando cambia (sin animar en la carga inicial)
  const isFirstApply = useRef(true);
  useEffect(() => {
    applyTheme(resolveTheme(mode), !isFirstApply.current);
    isFirstApply.current = false;
  }, [mode, applyTheme]);

  // Escuchar cambios en la preferencia del sistema (solo si mode === 'auto')
  useEffect(() => {
    if (mode !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      applyTheme(e.matches ? 'dark' : 'light', true);
    };

    // Usar addEventListener (moderna API)
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mode, applyTheme]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(THEME_STORAGE_KEY, newMode);
  };

  const toggleTheme = () => {
    const newMode: ThemeMode = resolvedTheme === 'light' ? 'dark' : 'light';
    setMode(newMode);
  };

  return (
    <ThemeContext.Provider value={{ mode, resolvedTheme, setMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Hook para acceder al contexto de tema
 * @returns {ThemeContextType} El contexto de tema con mode, resolvedTheme, setMode y toggleTheme
 * @throws {Error} Si se usa fuera de ThemeProvider
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider');
  }
  return context;
};

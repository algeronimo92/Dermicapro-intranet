import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

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

  // Aplicar el tema al documento cuando cambia
  useEffect(() => {
    const newResolvedTheme = resolveTheme(mode);
    setResolvedTheme(newResolvedTheme);
    document.documentElement.setAttribute('data-theme', newResolvedTheme);
  }, [mode]);

  // Escuchar cambios en la preferencia del sistema (solo si mode === 'auto')
  useEffect(() => {
    if (mode !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const newResolvedTheme = e.matches ? 'dark' : 'light';
      setResolvedTheme(newResolvedTheme);
      document.documentElement.setAttribute('data-theme', newResolvedTheme);
    };

    // Usar addEventListener (moderna API)
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mode]);

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

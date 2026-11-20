import { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardData, DashboardFilters } from '../types/dashboard.types';
import { dashboardService } from '../services/dashboard.service';

type Period = 'today' | 'week' | 'month' | 'year';

/**
 * Carga del dashboard.
 *
 * - `isLoading` solo es true en la primera carga (sin datos todavía): ahí va el skeleton.
 * - Al cambiar de período o refrescar, los datos actuales siguen en pantalla y
 *   `isRefreshing` indica que viene una versión nueva. Así la página no se
 *   desarma y se vuelve a armar en cada cambio.
 * - Si llegan respuestas fuera de orden (p. ej. cambios rápidos de período o el
 *   doble efecto de StrictMode), solo se aplica la de la última petición.
 */
export const useDashboard = (period: Period = 'month') => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const hasDataRef = useRef(false);

  const load = useCallback(async (p: Period) => {
    const requestId = ++requestIdRef.current;
    if (hasDataRef.current) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const filters: DashboardFilters = { period: p };
      const dashboardData = await dashboardService.getDashboard(filters);
      if (requestId !== requestIdRef.current) return; // respuesta vieja
      hasDataRef.current = true;
      setData(dashboardData);
    } catch (err: unknown) {
      if (requestId !== requestIdRef.current) return;
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'Error al cargar dashboard');
      console.error('Error loading dashboard:', err);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    load(period);
  }, [period, load]);

  const refresh = useCallback(() => load(period), [load, period]);

  return { data, isLoading, isRefreshing, error, refresh };
};

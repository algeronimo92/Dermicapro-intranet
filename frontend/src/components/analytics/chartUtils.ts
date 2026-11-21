import { useChartTheme, formatPEN, formatPENTick } from '../dashboard/widgets/chartTheme';

/** Utilidades de los gráficos de Analíticas (ver charts.tsx). */

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "2026-10" -> "oct 26", "2026-10-05" -> "5 oct"; cualquier otro texto se deja igual. */
export function formatPeriodLabel(value: unknown): string {
  const text = String(value ?? '');
  let m = /^(\d{4})-(\d{2})$/.exec(text);
  if (m) return `${MONTHS[Number(m[2]) - 1]} ${m[1].slice(2)}`;
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (m) return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}`;
  return text;
}

export const formatCount = (v: number) => v.toLocaleString('es-PE');

/** Para los KPI: soles sin decimales; para los ejes: miles abreviados. */
export { formatPEN, formatPENTick };

/** Colores fijos de los estados de cita, iguales a los del Dashboard. */
export function useStatusColors() {
  return useChartTheme().status;
}

export function useChartSeries() {
  return useChartTheme();
}

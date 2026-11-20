import { useMemo } from 'react';
import type React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';

/**
 * Colores de gráficos alineados con la marca (dorado champaña + carbón), con saturación baja.
 * Recharts recibe colores como atributos SVG, así que se resuelven aquí en
 * hex según el tema activo en vez de usar variables CSS.
 */

/** Paleta categórica: tonos separados en matiz y luminosidad para distinguirse sin depender solo del color */
const CATEGORICAL = {
  light: ['#A88B4E', '#4E7A7C', '#A3687A', '#6875A0', '#7C9873', '#B07A55', '#83709A', '#8E8A82'],
  dark:  ['#CDB27A', '#7FA9AA', '#CE98A6', '#9AA4CF', '#A3BF9A', '#D1A07E', '#AE9BC6', '#ABA79E'],
};

const SEMANTIC = {
  light: {
    brand:     '#A88B4E',
    sold:      '#A88B4E', // vendido — dorado
    collected: '#4E7A7C', // cobrado — verde azulado
    scheduled: '#6875A0', // agendadas — índigo
    attended:  '#7C9873', // atendidas — salvia
    patients:  '#A3687A', // pacientes — rosa
  },
  dark: {
    brand:     '#CDB27A',
    sold:      '#CDB27A',
    collected: '#7FA9AA',
    scheduled: '#9AA4CF',
    attended:  '#A3BF9A',
    patients:  '#CE98A6',
  },
};

/** Estados de cita: mismos tonos que los badges de la app */
const STATUS = {
  light: { reserved: '#466A89', in_progress: '#93602A', attended: '#3B7556', cancelled: '#A8433B', no_show: '#8E8A82' },
  dark:  { reserved: '#8DB0CC', in_progress: '#D4A56A', attended: '#7FB89A', cancelled: '#D98880', no_show: '#9C998F' },
};

const SURFACE = {
  light: { grid: '#E8E5DF', axis: '#6B675F', tooltipBg: '#FBFAF8', tooltipBorder: '#DEDAD2', tooltipText: '#2C2B29', cursor: 'rgba(126, 104, 56, 0.07)' },
  dark:  { grid: '#313238', axis: '#9C998F', tooltipBg: '#2E2F34', tooltipBorder: '#3A3C42', tooltipText: '#E6E4DF', cursor: 'rgba(200, 174, 116, 0.08)' },
};

export interface ChartTheme {
  categorical: string[];
  series: typeof SEMANTIC.light;
  status: Record<string, string>;
  grid: string;
  axis: string;
  cursor: string;
  tooltip: {
    contentStyle: React.CSSProperties;
    labelStyle: React.CSSProperties;
    itemStyle: React.CSSProperties;
  };
  tick: { fill: string; fontSize: number };
}

export function useChartTheme(): ChartTheme {
  const { resolvedTheme } = useTheme();
  return useMemo(() => {
    const t = resolvedTheme === 'dark' ? 'dark' : 'light';
    const sf = SURFACE[t];
    return {
      categorical: CATEGORICAL[t],
      series: SEMANTIC[t],
      status: STATUS[t],
      grid: sf.grid,
      axis: sf.axis,
      cursor: sf.cursor,
      tooltip: {
        contentStyle: {
          backgroundColor: sf.tooltipBg,
          border: `1px solid ${sf.tooltipBorder}`,
          borderRadius: 10,
          boxShadow: '0 8px 24px -8px rgba(0, 0, 0, 0.25)',
          padding: '10px 12px',
          color: sf.tooltipText,
        },
        labelStyle: { color: sf.tooltipText, fontWeight: 600, marginBottom: 4 },
        itemStyle: { color: sf.tooltipText, padding: '1px 0' },
      },
      tick: { fill: sf.axis, fontSize: 11 },
    };
  }, [resolvedTheme]);
}

export const formatPEN = (value: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

/** Eje de soles: abrevia miles para que las marcas no se solapen */
export const formatPENTick = (value: number) =>
  Math.abs(value) >= 1000 ? `S/${Math.round(value / 1000)}k` : `S/${value}`;

import { useMemo } from 'react';
import type React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';

/**
 * Colores de gráficos alineados con la marca (dorado + tinta).
 * Recharts recibe colores como atributos SVG, así que se resuelven aquí en
 * hex según el tema activo en vez de usar variables CSS.
 */

/** Paleta categórica: tonos separados en matiz y luminosidad para distinguirse sin depender solo del color */
const CATEGORICAL = {
  light: ['#B8892B', '#2F6F73', '#B4566E', '#5B6CB0', '#6E9E6A', '#C46A3A', '#7A5C9E', '#8A817A'],
  dark:  ['#D9B45A', '#5FA8AC', '#E08EA2', '#93A1E6', '#94C68F', '#E39462', '#B394D9', '#B5AA99'],
};

const SEMANTIC = {
  light: {
    brand:     '#B8892B',
    sold:      '#B8892B', // vendido — dorado
    collected: '#2F6F73', // cobrado — verde azulado
    scheduled: '#5B6CB0', // agendadas — índigo
    attended:  '#6E9E6A', // atendidas — salvia
    patients:  '#B4566E', // pacientes — rosa piel
  },
  dark: {
    brand:     '#D9B45A',
    sold:      '#D9B45A',
    collected: '#5FA8AC',
    scheduled: '#93A1E6',
    attended:  '#94C68F',
    patients:  '#E08EA2',
  },
};

/** Estados de cita: mismos tonos que los badges de la app */
const STATUS = {
  light: { reserved: '#2F6690', in_progress: '#B45309', attended: '#047857', cancelled: '#C42B2B', no_show: '#8A817A' },
  dark:  { reserved: '#7FB3D9', in_progress: '#FBBF24', attended: '#34D399', cancelled: '#F87171', no_show: '#A39886' },
};

const SURFACE = {
  light: { grid: '#EEE8DD', axis: '#6E6458', tooltipBg: '#FFFFFF', tooltipBorder: '#E2D9C9', tooltipText: '#1C1814', cursor: 'rgba(140, 106, 30, 0.08)' },
  dark:  { grid: '#2A251F', axis: '#A39886', tooltipBg: '#24201B', tooltipBorder: '#3A332B', tooltipText: '#F5F1EA', cursor: 'rgba(212, 175, 79, 0.10)' },
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

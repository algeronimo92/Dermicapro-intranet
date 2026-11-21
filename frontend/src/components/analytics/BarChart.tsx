import React from 'react';
import { AnlxBarChart, ChartCard } from './charts';
import { formatPEN, formatPENTick } from '../dashboard/widgets/chartTheme';

interface BarChartProps {
  data: Record<string, unknown>[];
  title: string;
  subtitle?: string;
  xKey: string;
  yKey: string;
  /** Nombre de la serie en el tooltip */
  label?: string;
  height?: number;
  valueFormatter?: (value: number) => string;
}

/** Barras de montos en soles dentro de una tarjeta. */
export const BarChart: React.FC<BarChartProps> = ({
  data, title, subtitle, xKey, yKey, label = 'Monto', height = 280, valueFormatter = formatPEN,
}) => (
  <ChartCard title={title} subtitle={subtitle}>
    <AnlxBarChart
      data={data}
      categoryKey={xKey}
      valueKey={yKey}
      label={label}
      height={height}
      valueFormatter={valueFormatter}
      tickFormatter={formatPENTick}
    />
  </ChartCard>
);

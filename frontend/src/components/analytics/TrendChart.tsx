import React from 'react';
import { AnlxTrendChart, ChartCard } from './charts';

interface TrendChartProps {
  data: { month: string; value: number }[];
  title: string;
  subtitle?: string;
  label?: string;
  height?: number;
  valueFormatter?: (value: number) => string;
}

/** Tendencia mensual en soles (área con degradado) dentro de una tarjeta. */
export const TrendChart: React.FC<TrendChartProps> = ({
  data, title, subtitle, label = 'Ingresos', height = 280, valueFormatter,
}) => (
  <ChartCard title={title} subtitle={subtitle}>
    <AnlxTrendChart data={data} xKey="month" valueKey="value" label={label} height={height} valueFormatter={valueFormatter} />
  </ChartCard>
);

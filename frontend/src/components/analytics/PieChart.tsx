import React from 'react';
import { AnlxDonut, ChartCard, DonutItem } from './charts';

interface PieChartProps {
  data: DonutItem[];
  title: string;
  subtitle?: string;
  totalLabel?: string;
  height?: number;
  formatter?: (v: number) => string;
}

/** Dona con total al centro y leyenda con valor y porcentaje, dentro de una tarjeta. */
export const PieChart: React.FC<PieChartProps> = ({ data, title, subtitle, totalLabel, height, formatter }) => (
  <ChartCard title={title} subtitle={subtitle}>
    <AnlxDonut data={data} totalLabel={totalLabel} height={height} formatter={formatter} />
  </ChartCard>
);

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getChartColor } from '../../utils/chartColors';

interface TrendChartProps {
  data: { month: string; value: number }[];
  title: string;
  colorIndex?: 1 | 2 | 3 | 4 | 5 | 6;
  height?: number;
  valueFormatter?: (value: number) => string;
}

const fmtPEN = (v: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0 }).format(v);

export const TrendChart: React.FC<TrendChartProps> = ({
  data, title, colorIndex = 2, height = 300, valueFormatter,
}) => {
  const color = getChartColor(colorIndex);
  const fmt = valueFormatter || fmtPEN;
  return (
    <div className="anlx-chart-card">
      <h3 className="anlx-chart-title">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={(v: any) => fmtPEN(Number(v))} />
          <Tooltip formatter={(v: any) => fmt(Number(v))} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 4, fill: color }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

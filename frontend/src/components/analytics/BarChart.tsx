import React from 'react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getChartColor } from '../../utils/chartColors';

interface BarChartProps {
  data: any[];
  title: string;
  xKey: string;
  yKey: string;
  colorIndex?: 1 | 2 | 3 | 4 | 5 | 6;
  height?: number;
  valueFormatter?: (value: number) => string;
}

const fmtPEN = (v: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0 }).format(v);

export const BarChart: React.FC<BarChartProps> = ({
  data, title, xKey, yKey, colorIndex = 1, height = 300, valueFormatter,
}) => {
  const color = getChartColor(colorIndex);
  const fmt = valueFormatter || fmtPEN;
  return (
    <div className="anlx-chart-card">
      <h3 className="anlx-chart-title">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis tickFormatter={(v: any) => fmtPEN(Number(v))} />
          <Tooltip formatter={(v: any) => fmt(Number(v))} />
          <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

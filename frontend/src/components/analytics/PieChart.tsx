import React from 'react';
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getChartColors } from '../../utils/chartColors';

interface PieChartProps {
  data: { name: string; value: number }[];
  title: string;
  height?: number;
}

export const PieChart: React.FC<PieChartProps> = ({ data, title, height = 300 }) => {
  const colors = getChartColors(6);

  // Filtrar entradas sin datos para no mostrar segmentos vacíos
  const filtered = data.filter(d => d.value > 0);

  return (
    <div className="anlx-chart-card">
      <h3 className="anlx-chart-title">{title}</h3>
      {filtered.length === 0 ? (
        <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
          Sin datos para este período
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <RechartsPieChart>
            <Pie
              data={filtered}
              cx="50%"
              cy="45%"
              outerRadius={90}
              labelLine={false}
              label={({ percent }: any) =>
                (percent ?? 0) > 0.05 ? `${((percent ?? 0) * 100).toFixed(0)}%` : ''
              }
              dataKey="value"
            >
              {filtered.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border-primary)',
                borderRadius: 'var(--radius-lg)',
                color: 'var(--color-text-primary)',
                fontSize: 13,
              }}
              formatter={(value: any, name: any) => [`${value}`, name]}
            />
            <Legend
              wrapperStyle={{
                color: 'var(--color-text-secondary)',
                fontSize: 13,
                paddingTop: 8,
              }}
              formatter={(value) => (
                <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{value}</span>
              )}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

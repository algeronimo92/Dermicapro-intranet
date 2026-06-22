import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import './RevenueChart.css';

interface NewPatientsChartProps {
  data: Array<{ period: string; count: number }>;
  granularity?: 'day' | 'month';
  title?: string;
  height?: number;
  color?: string;
  total?: number;
}

const MONTH_NAMES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const formatLabel = (periodStr: string, granularity: 'day' | 'month'): string => {
  if (granularity === 'month') {
    const parts = periodStr.split('-');
    return `${MONTH_NAMES[parseInt(parts[1]) - 1]} ${parts[0].slice(2)}`;
  }
  const date = new Date(periodStr + 'T12:00:00');
  const day = date.getDate();
  const mon = MONTH_NAMES[date.getMonth()];
  const dow = DAY_NAMES[date.getDay()];
  return `${dow} ${day} ${mon}`;
};

export const NewPatientsChart: React.FC<NewPatientsChartProps> = ({
  data,
  granularity = 'day',
  title,
  height = 260,
  color = '#6366f1',
  total,
}) => {
  return (
    <div className="revenue-chart">
      {total !== undefined && (
        <div className="revenue-chart__kpi-header">
          <div>
            <p className="revenue-chart__kpi-label">Nuevos Pacientes</p>
            <p className="revenue-chart__kpi-value">{total}</p>
          </div>
        </div>
      )}

      {title && <h3 className="revenue-chart__title">{title}</h3>}

      {data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="period"
              tickFormatter={(v: string) => formatLabel(v, granularity)}
              stroke="#6b7280"
              style={{ fontSize: '11px' }}
              interval="preserveStartEnd"
            />
            <YAxis
              allowDecimals={false}
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              width={32}
            />
            <Tooltip
              formatter={(value: unknown) => [value as React.ReactNode, 'Pacientes nuevos']}
              labelFormatter={(label: unknown) =>
                typeof label === 'string' ? formatLabel(label, granularity) : ''
              }
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              name="Nuevos Pacientes"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: color }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="revenue-chart__empty">Sin datos para el período seleccionado</div>
      )}
    </div>
  );
};

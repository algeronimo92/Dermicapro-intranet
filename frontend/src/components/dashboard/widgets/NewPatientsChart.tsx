import React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartLegend } from './ChartLegend';
import { useChartTheme } from './chartTheme';
import './RevenueChart.css';

interface NewPatientsChartProps {
  data: Array<{ period: string; count: number }>;
  granularity?: 'day' | 'month';
  title?: string;
  height?: number;
  /** Color de la serie; por defecto el rosa de la paleta del tema */
  color?: string;
  total?: number;
}

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const formatLabel = (periodStr: string, granularity: 'day' | 'month', long = false): string => {
  if (granularity === 'month') {
    const parts = periodStr.split('-');
    return `${MONTH_NAMES[parseInt(parts[1], 10) - 1]} ${parts[0].slice(2)}`;
  }
  const date = new Date(periodStr + 'T12:00:00');
  const base = `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
  return long ? `${DAY_NAMES[date.getDay()]} ${base}` : base;
};

export const NewPatientsChart: React.FC<NewPatientsChartProps> = ({
  data,
  granularity = 'day',
  title = 'Nuevos pacientes',
  height = 240,
  color,
  total,
}) => {
  const theme = useChartTheme();
  const stroke = color ?? theme.series.patients;
  const gradientId = React.useId().replace(/:/g, '');
  const shownTotal = total ?? data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="revenue-chart">
      <div className="chart-card__header">
        <div>
          <h3 className="revenue-chart__title">{title}</h3>
          <p className="revenue-chart__subtitle">
            Pacientes registrados por {granularity === 'month' ? 'mes' : 'día'} en el período
          </p>
          <ChartLegend items={[{ label: 'Pacientes nuevos', color: stroke, shape: 'line' }]} className="chart-legend--spaced" />
        </div>
        <div className="chart-card__kpi">
          <p className="revenue-chart__kpi-label">Total del período</p>
          <p className="revenue-chart__kpi-value">{shownTotal}</p>
        </div>
      </div>

      {data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={theme.grid} strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="period"
              tickFormatter={(v: string) => formatLabel(v, granularity)}
              tick={theme.tick}
              axisLine={{ stroke: theme.grid }}
              tickLine={false}
              tickMargin={8}
              interval="preserveStartEnd"
              minTickGap={12}
            />
            <YAxis allowDecimals={false} tick={theme.tick} axisLine={false} tickLine={false} width={32} />
            <Tooltip
              cursor={{ stroke: theme.axis, strokeDasharray: '3 3' }}
              {...theme.tooltip}
              formatter={(value: unknown) => [value as React.ReactNode, 'Pacientes nuevos']}
              labelFormatter={(label: unknown) =>
                typeof label === 'string' ? formatLabel(label, granularity, true) : ''
              }
            />
            <Area
              type="monotone"
              dataKey="count"
              name="Pacientes nuevos"
              stroke={stroke}
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 5, fill: stroke }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="revenue-chart__empty">Sin pacientes nuevos en el período seleccionado</div>
      )}
    </div>
  );
};

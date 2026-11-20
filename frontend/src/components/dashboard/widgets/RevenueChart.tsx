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
import { useChartTheme, formatPEN, formatPENTick } from './chartTheme';
import './RevenueChart.css';

interface RevenueChartProps {
  data: Array<{ month: string; amount: number }>;
  title?: string;
  subtitle?: string;
  /** Color de la serie; por defecto el dorado de marca del tema activo */
  color?: string;
  height?: number;
}

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** "2024-01" → "Ene 24" */
const formatMonth = (monthStr: string) => {
  const [year, month] = monthStr.split('-');
  const idx = parseInt(month, 10) - 1;
  return MONTH_NAMES[idx] ? `${MONTH_NAMES[idx]} ${year.slice(2)}` : monthStr;
};

export const RevenueChart: React.FC<RevenueChartProps> = ({
  data,
  title = 'Ingresos mensuales',
  subtitle = 'Total cobrado por mes',
  color,
  height = 280,
}) => {
  const theme = useChartTheme();
  const stroke = color ?? theme.series.brand;
  const gradientId = React.useId().replace(/:/g, '');
  const total = data.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="revenue-chart">
      <div className="chart-card__header">
        <div>
          <h3 className="revenue-chart__title">{title}</h3>
          {subtitle && <p className="revenue-chart__subtitle">{subtitle}</p>}
        </div>
        <ChartLegend items={[{ label: 'Ingresos', color: stroke, shape: 'line', value: formatPEN(total) }]} />
      </div>

      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.32} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={theme.grid} strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonth}
              tick={theme.tick}
              axisLine={{ stroke: theme.grid }}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              tickFormatter={formatPENTick}
              tick={theme.tick}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip
              cursor={{ stroke: theme.axis, strokeDasharray: '3 3' }}
              {...theme.tooltip}
              formatter={(value: unknown) => [formatPEN(typeof value === 'number' ? value : 0), 'Ingresos']}
              labelFormatter={(label: unknown) => (typeof label === 'string' ? formatMonth(label) : '')}
            />
            <Area
              type="monotone"
              dataKey="amount"
              name="Ingresos"
              stroke={stroke}
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              dot={{ r: 3, fill: stroke, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: stroke, stroke: theme.tooltip.contentStyle.backgroundColor as string, strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="revenue-chart__empty">Sin ingresos en el período seleccionado</div>
      )}
    </div>
  );
};

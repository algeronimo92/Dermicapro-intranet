import React from 'react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartLegend } from './ChartLegend';
import { useChartTheme } from './chartTheme';
import './RevenueChart.css';

export interface ActivitySeries {
  /** Clave del dato dentro de cada punto de la serie */
  key: string;
  name: string;
  color: string;
  type?: 'bar' | 'line';
  /** Eje al que se ancla. El derecho se usa para mezclar soles con conteos */
  axis?: 'left' | 'right';
  /** Si se indica, la leyenda muestra el total de la serie con este formato */
  formatTotal?: (value: number) => string;
}

interface ActivityChartProps {
  data: object[];
  /** Campo del eje X (fecha, semana o día de la semana) */
  xKey: string;
  series: ActivitySeries[];
  title: string;
  subtitle?: string;
  height?: number;
  /** Etiqueta corta para las marcas del eje X */
  xTickFormatter?: (value: string) => string;
  /** Etiqueta larga para la cabecera del tooltip */
  xLabelFormatter?: (value: string) => string;
  formatLeft?: (value: number) => string;
  formatRight?: (value: number) => string;
  tickFormatLeft?: (value: number) => string;
  tickFormatRight?: (value: number) => string;
  emptyMessage?: string;
}

export const ActivityChart: React.FC<ActivityChartProps> = ({
  data,
  xKey,
  series,
  title,
  subtitle,
  height = 260,
  xTickFormatter,
  xLabelFormatter,
  formatLeft = (v) => String(v),
  formatRight = (v) => String(v),
  tickFormatLeft,
  tickFormatRight,
  emptyMessage = 'Sin datos para el período seleccionado',
}) => {
  const theme = useChartTheme();
  // Con muchos puntos las barras quedan como hilos: se dibujan como áreas suaves
  const dense = data.length > 40;
  const hasRightAxis = series.some((s) => s.axis === 'right');

  // Un formateador por serie: sin esto el tooltip no sabe cuál aplicar
  const formatterByKey = new Map(
    series.map((s) => [s.key, s.axis === 'right' ? formatRight : formatLeft])
  );

  const legendItems = series.map((s) => {
    const total = s.formatTotal
      ? s.formatTotal((data as Record<string, unknown>[]).reduce((sum, d) => sum + (Number(d[s.key]) || 0), 0))
      : undefined;
    return { label: s.name, color: s.color, shape: s.type === 'line' || dense ? 'line' as const : 'square' as const, value: total };
  });

  return (
    <div className="revenue-chart">
      <div className="chart-card__header">
        <div>
          <h3 className="revenue-chart__title">{title}</h3>
          {subtitle && <p className="revenue-chart__subtitle">{subtitle}</p>}
        </div>
        <ChartLegend items={legendItems} />
      </div>

      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={data} margin={{ top: 5, right: hasRightAxis ? 4 : 8, left: 0, bottom: 0 }} barGap={4}>
            <CartesianGrid stroke={theme.grid} strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey={xKey}
              tickFormatter={xTickFormatter}
              tick={theme.tick}
              axisLine={{ stroke: theme.grid }}
              tickLine={false}
              tickMargin={8}
              interval="preserveStartEnd"
              minTickGap={12}
            />
            <YAxis
              yAxisId="left"
              allowDecimals={false}
              tickFormatter={tickFormatLeft}
              tick={theme.tick}
              width={56}
              tickLine={false}
              axisLine={false}
            />
            {hasRightAxis && (
              <YAxis
                yAxisId="right"
                orientation="right"
                allowDecimals={false}
                tickFormatter={tickFormatRight}
                tick={theme.tick}
                width={56}
                tickLine={false}
                axisLine={false}
              />
            )}
            <Tooltip
              cursor={{ fill: theme.cursor }}
              {...theme.tooltip}
              formatter={(value: unknown, name: unknown, item: { dataKey?: unknown }) => {
                const format = formatterByKey.get(String(item?.dataKey)) ?? formatLeft;
                return [format(typeof value === 'number' ? value : 0), name as string];
              }}
              labelFormatter={(label: unknown) =>
                typeof label === 'string' && xLabelFormatter
                  ? xLabelFormatter(label)
                  : String(label ?? '')
              }
            />
            {series.map((s) =>
              s.type === 'line' ? (
                <Line
                  key={s.key}
                  yAxisId={s.axis ?? 'left'}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name}
                  stroke={s.color}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: s.color, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: s.color }}
                  isAnimationActive={false}
                />
              ) : dense ? (
                <Area
                  key={s.key}
                  yAxisId={s.axis ?? 'left'}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name}
                  stroke={s.color}
                  strokeWidth={2}
                  fill={s.color}
                  fillOpacity={0.14}
                  dot={false}
                  activeDot={{ r: 4, fill: s.color }}
                  isAnimationActive={false}
                />
              ) : (
                <Bar
                  key={s.key}
                  yAxisId={s.axis ?? 'left'}
                  dataKey={s.key}
                  name={s.name}
                  fill={s.color}
                  radius={[5, 5, 0, 0]}
                  maxBarSize={30}
                  isAnimationActive={false}
                />
              )
            )}
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <div className="revenue-chart__empty">{emptyMessage}</div>
      )}
    </div>
  );
};

import React from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import './RevenueChart.css';

export interface ActivitySeries {
  /** Clave del dato dentro de cada punto de la serie */
  key: string;
  name: string;
  color: string;
  type?: 'bar' | 'line';
  /** Eje al que se ancla. El derecho se usa para mezclar soles con conteos */
  axis?: 'left' | 'right';
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

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
};

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
  const hasRightAxis = series.some((s) => s.axis === 'right');

  // Un punto por eje: sin esto el tooltip no sabe qué formateador aplicar
  const formatterByKey = new Map(
    series.map((s) => [s.key, s.axis === 'right' ? formatRight : formatLeft])
  );

  return (
    <div className="revenue-chart">
      <div className="revenue-chart__heading">
        <h3 className="revenue-chart__title revenue-chart__title--tight">{title}</h3>
        {subtitle && <p className="revenue-chart__subtitle">{subtitle}</p>}
      </div>

      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={data} margin={{ top: 5, right: hasRightAxis ? 8 : 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey={xKey}
              tickFormatter={xTickFormatter}
              stroke="#6b7280"
              style={{ fontSize: '11px' }}
              interval="preserveStartEnd"
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              allowDecimals={false}
              tickFormatter={tickFormatLeft}
              stroke="#6b7280"
              style={{ fontSize: '11px' }}
              width={52}
              tickLine={false}
              axisLine={false}
            />
            {hasRightAxis && (
              <YAxis
                yAxisId="right"
                orientation="right"
                allowDecimals={false}
                tickFormatter={tickFormatRight}
                stroke="#6b7280"
                style={{ fontSize: '11px' }}
                width={52}
                tickLine={false}
                axisLine={false}
              />
            )}
            <Tooltip
              cursor={{ fill: 'rgba(107, 114, 128, 0.08)' }}
              contentStyle={TOOLTIP_STYLE}
              formatter={(value: unknown, name: unknown, item: any) => {
                const format = formatterByKey.get(item?.dataKey) ?? formatLeft;
                return [format(typeof value === 'number' ? value : 0), name as string];
              }}
              labelFormatter={(label: unknown) =>
                typeof label === 'string' && xLabelFormatter
                  ? xLabelFormatter(label)
                  : String(label ?? '')
              }
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
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
                  strokeWidth={2}
                  dot={{ r: 3, fill: s.color, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: s.color }}
                  isAnimationActive={false}
                />
              ) : (
                <Bar
                  key={s.key}
                  yAxisId={s.axis ?? 'left'}
                  dataKey={s.key}
                  name={s.name}
                  fill={s.color}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={38}
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

import React, { useId } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useChartTheme, formatPEN, formatPENTick } from '../dashboard/widgets/chartTheme';
import { formatCount, formatPeriodLabel } from './chartUtils';
import { PieChartWidget } from '../dashboard/widgets/PieChartWidget';

/**
 * Gráficos de Analíticas con el mismo lenguaje visual que el Dashboard:
 * paleta de la marca según el tema, ejes y rejilla discretos, tooltip legible
 * en claro y oscuro, y montos abreviados en los ejes.
 */

// ── Contenedor ────────────────────────────────────────────────────────────────

export const ChartCard: React.FC<{ title: string; subtitle?: string; children: React.ReactNode; className?: string }> = ({
  title, subtitle, children, className = '',
}) => (
  <section className={`anlx-chart-card ${className}`}>
    <header className="anlx-chart-header">
      <h3 className="anlx-chart-title">{title}</h3>
      {subtitle && <p className="anlx-chart-subtitle">{subtitle}</p>}
    </header>
    {children}
  </section>
);

const EmptyChart: React.FC<{ height: number }> = ({ height }) => (
  <div className="anlx-chart-empty" style={{ height }}>Sin datos para este período</div>
);

// ── Barras ────────────────────────────────────────────────────────────────────

/**
 * Etiqueta del eje de categorías en rankings: nombres de servicio largos en
 * una sola línea, recortados con puntos suspensivos (Recharts los partiría en
 * dos líneas y se encimarían). El nombre completo queda en el title.
 * Recharts le inyecta x, y y payload al clonarla.
 */
const RankingTick: React.FC<{
  x?: number; y?: number; payload?: { value: unknown };
  format: (v: unknown) => string; fill: string; fontSize: number;
}> = ({ x, y, payload, format, fill, fontSize }) => {
  const text = format(payload?.value);
  const short = text.length > 24 ? `${text.slice(0, 23)}…` : text;
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fill={fill} fontSize={fontSize}>
      <title>{text}</title>
      {short}
    </text>
  );
};

interface AnlxBarChartProps<T> {
  data: T[];
  categoryKey: keyof T & string;
  valueKey: keyof T & string;
  /** Nombre de la serie en el tooltip, p. ej. "Ingresos" */
  label: string;
  /** "vertical" = barras horizontales con las categorías a la izquierda (rankings) */
  layout?: 'horizontal' | 'vertical';
  color?: string;
  height?: number;
  valueFormatter?: (v: number) => string;
  tickFormatter?: (v: number) => string;
  categoryFormatter?: (v: unknown) => string;
}

export function AnlxBarChart<T extends object>({
  data, categoryKey, valueKey, label, layout = 'horizontal', color, height = 280,
  valueFormatter = formatCount, tickFormatter, categoryFormatter = formatPeriodLabel,
}: AnlxBarChartProps<T>) {
  const theme = useChartTheme();
  if (!data?.length || data.every(d => !Number(d[valueKey]))) return <EmptyChart height={height} />;

  const fill = color ?? theme.series.brand;
  // Recharts tipa dataKey contra las filas; aquí las claves ya están validadas por T.
  const rows = data as unknown as Record<string, unknown>[];
  const cKey: string = categoryKey;
  const vKey: string = valueKey;
  const ranking = layout === 'vertical';
  const axisTick = (v: unknown) => (tickFormatter ? tickFormatter(Number(v)) : formatCount(Number(v)));
  const categoryTick = (v: unknown) => categoryFormatter(v);

  return (
    <ResponsiveContainer width="100%" height={ranking ? Math.max(height, data.length * 34 + 24) : height}>
      <BarChart data={rows} layout={layout} margin={{ top: 4, right: 12, left: 0, bottom: 0 }} barCategoryGap={ranking ? 8 : '22%'}>
        <CartesianGrid stroke={theme.grid} strokeDasharray="0" vertical={ranking} horizontal={!ranking} />
        {ranking ? (
          <>
            <XAxis type="number" tick={theme.tick} tickFormatter={axisTick} axisLine={false} tickLine={false} />
            <YAxis
              type="category" dataKey={cKey}
              tick={<RankingTick format={categoryFormatter} fill={theme.tick.fill} fontSize={theme.tick.fontSize} />}
              width={160} axisLine={false} tickLine={false} interval={0}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={cKey} tick={theme.tick} tickFormatter={categoryTick}
              axisLine={{ stroke: theme.grid }} tickLine={false} tickMargin={8} minTickGap={8}
            />
            <YAxis tick={theme.tick} tickFormatter={axisTick} axisLine={false} tickLine={false} width={56} allowDecimals={false} />
          </>
        )}
        <Tooltip
          {...theme.tooltip}
          cursor={{ fill: theme.cursor }}
          labelFormatter={(v: unknown) => categoryFormatter(v)}
          formatter={(v: unknown) => [valueFormatter(Number(v)), label]}
        />
        <Bar
          dataKey={vKey} name={label} fill={fill} maxBarSize={ranking ? 22 : 44}
          radius={ranking ? [0, 6, 6, 0] : [6, 6, 0, 0]} isAnimationActive={false}
        >
          {ranking && data.map((_, i) => <Cell key={i} fill={fill} fillOpacity={1 - Math.min(i, 8) * 0.07} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Tendencia ─────────────────────────────────────────────────────────────────

interface AnlxTrendChartProps<T> {
  data: T[];
  xKey: keyof T & string;
  valueKey: keyof T & string;
  label: string;
  color?: string;
  height?: number;
  valueFormatter?: (v: number) => string;
  tickFormatter?: (v: number) => string;
}

export function AnlxTrendChart<T extends object>({
  data, xKey, valueKey, label, color, height = 280,
  valueFormatter = formatPEN, tickFormatter = formatPENTick,
}: AnlxTrendChartProps<T>) {
  const theme = useChartTheme();
  const gradientId = `anlx-trend-${useId().replace(/:/g, '')}`;
  if (!data?.length) return <EmptyChart height={height} />;
  const stroke = color ?? theme.series.collected;
  const rows = data as unknown as Record<string, unknown>[];
  const xk: string = xKey;
  const vKey: string = valueKey;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.3} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={theme.grid} vertical={false} />
        <XAxis
          dataKey={xk} tick={theme.tick} tickFormatter={formatPeriodLabel}
          axisLine={{ stroke: theme.grid }} tickLine={false} tickMargin={8} minTickGap={16}
        />
        <YAxis tick={theme.tick} tickFormatter={(v: unknown) => tickFormatter(Number(v))} axisLine={false} tickLine={false} width={56} />
        <Tooltip
          {...theme.tooltip}
          cursor={{ stroke: theme.axis, strokeDasharray: '3 3' }}
          labelFormatter={(v: unknown) => formatPeriodLabel(v)}
          formatter={(v: unknown) => [valueFormatter(Number(v)), label]}
        />
        <Area
          type="monotone" dataKey={vKey} name={label} stroke={stroke} strokeWidth={2.5}
          fill={`url(#${gradientId})`} isAnimationActive={false}
          dot={data.length <= 12 ? { r: 3, fill: stroke, strokeWidth: 0 } : false}
          activeDot={{ r: 6, fill: stroke, stroke: theme.tooltip.contentStyle.backgroundColor as string, strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Dona ──────────────────────────────────────────────────────────────────────

export interface DonutItem { name: string; value: number; color?: string }

export const AnlxDonut: React.FC<{
  data: DonutItem[];
  totalLabel?: string;
  height?: number;
  formatter?: (v: number) => string;
}> = ({ data, totalLabel = 'Total', height = 220, formatter = formatCount }) => {
  const items = data.filter(d => d.value > 0);
  if (!items.length) return <EmptyChart height={height} />;
  return <PieChartWidget data={items} height={height} totalLabel={totalLabel} formatter={formatter} />;
};

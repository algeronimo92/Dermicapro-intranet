import React, { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { useChartTheme } from './chartTheme';
import './RevenueChart.css';
import './PieChartWidget.css';

export interface PieChartItem {
  name: string;
  value: number;
  /** Color fijo para este segmento (p. ej. estados de cita) */
  color?: string;
}

interface PieChartWidgetProps {
  data: PieChartItem[];
  title?: string;
  subtitle?: string;
  /** Paleta a usar cuando los items no traen color; por defecto la categórica del tema */
  colors?: string[];
  height?: number;
  formatter?: (value: number) => string;
  /** Etiqueta del total en el centro de la dona */
  totalLabel?: string;
  /** Se conserva por compatibilidad: ahora siempre se dibuja como dona */
  donut?: boolean;
}

/**
 * Dona con el total al centro y una leyenda lateral con valor y porcentaje
 * de cada segmento. Así se lee sin tener que pasar el mouse.
 *
 * Sin tooltip flotante: caía justo encima del total del centro y se encimaban.
 * Al pasar el mouse (o el foco) por un segmento o por su fila de la leyenda,
 * el centro muestra ese segmento y el resto se atenúa.
 */
export const PieChartWidget: React.FC<PieChartWidgetProps> = ({
  data,
  title,
  subtitle,
  colors,
  height = 240,
  formatter = (v) => v.toLocaleString('es-PE'),
  totalLabel = 'Total',
}) => {
  const theme = useChartTheme();
  const [active, setActive] = useState<number | null>(null);
  if (!data || data.length === 0) return null;

  const palette = colors ?? theme.categorical;
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const items = data.map((d, i) => ({ ...d, fill: d.color ?? palette[i % palette.length] }));
  const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);
  const current = active !== null ? items[active] : null;

  return (
    <div className="pie-chart-widget">
      {title && (
        <div className="chart-card__header pie-chart-widget__header">
          <div>
            <h3 className="revenue-chart__title">{title}</h3>
            {subtitle && <p className="revenue-chart__subtitle">{subtitle}</p>}
          </div>
        </div>
      )}

      <div className="pie-chart-widget__body">
        <div className="pie-chart-widget__chart" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={items}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="62%"
                outerRadius="92%"
                paddingAngle={items.length > 1 ? 2 : 0}
                cornerRadius={4}
                stroke="none"
                isAnimationActive={false}
                onMouseEnter={(_: unknown, i: number) => setActive(i)}
                onMouseLeave={() => setActive(null)}
              >
                {items.map((d, i) => (
                  <Cell
                    key={d.name}
                    fill={d.fill}
                    fillOpacity={active === null || active === i ? 1 : 0.3}
                    style={{ transition: 'fill-opacity 120ms ease', cursor: 'default', outline: 'none' }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pie-chart-widget__center" aria-live="polite">
            {current ? (
              <>
                <span className="pie-chart-widget__center-value">{formatter(current.value)}</span>
                <span className="pie-chart-widget__center-label pie-chart-widget__center-label--active">
                  {current.name} · {pct(current.value)}%
                </span>
              </>
            ) : (
              <>
                <span className="pie-chart-widget__center-value">{formatter(total)}</span>
                <span className="pie-chart-widget__center-label">{totalLabel}</span>
              </>
            )}
          </div>
        </div>

        <ul className="chart-legend chart-legend--stacked" aria-label={`Leyenda de ${title ?? 'gráfico'}`}>
          {items.map((d, i) => (
            <li
              key={d.name}
              className={`chart-legend__item${active === null ? '' : active === i ? ' is-active' : ' is-dimmed'}`}
              tabIndex={0}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            >
              <span className="chart-legend__marker chart-legend__marker--square" style={{ background: d.fill }} aria-hidden="true" />
              <span className="chart-legend__label">{d.name}</span>
              <span className="chart-legend__value">{formatter(d.value)}</span>
              <span className="chart-legend__pct">{pct(d.value)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

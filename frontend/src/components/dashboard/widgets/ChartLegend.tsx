import React from 'react';

export interface LegendItem {
  label: string;
  color: string;
  /** Forma del marcador: barra/área (cuadrado) o línea */
  shape?: 'square' | 'line';
  /** Valor resumido opcional, p. ej. el total del período */
  value?: string;
}

/** Leyenda HTML: legible, accesible y consistente entre todos los gráficos */
export const ChartLegend: React.FC<{ items: LegendItem[]; className?: string }> = ({ items, className = '' }) => (
  <ul className={`chart-legend ${className}`} aria-label="Leyenda">
    {items.map(item => (
      <li key={item.label} className="chart-legend__item">
        <span
          className={`chart-legend__marker chart-legend__marker--${item.shape ?? 'square'}`}
          style={{ background: item.color }}
          aria-hidden="true"
        />
        <span className="chart-legend__label">{item.label}</span>
        {item.value && <span className="chart-legend__value">{item.value}</span>}
      </li>
    ))}
  </ul>
);

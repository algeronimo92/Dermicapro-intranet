import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import './StatCard.css';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  /** Texto que acompaña a la tendencia */
  trendLabel?: string;
  /** Tono del icono (y del acento de la tarjeta) */
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  /**
   * soft: tarjeta de superficie con icono de color.
   * solid: tarjeta destacada en tinta y dorado, para el KPI principal de cada sección.
   */
  variant?: 'solid' | 'soft';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel = 'vs mes anterior',
  color = 'primary',
  variant = 'soft',
}) => (
  <div className={`stat-card stat-card--${variant} stat-card--${color}`}>
    <div className="stat-card__header">
      <h3 className="stat-card__title">{title}</h3>
      {icon && <div className="stat-card__icon" aria-hidden="true">{icon}</div>}
    </div>

    <div className="stat-card__value">{value}</div>

    {(subtitle || trend) && (
      <div className="stat-card__footer">
        {trend && (
          <span
            className={`stat-card__trend ${trend.isPositive ? 'stat-card__trend--up' : 'stat-card__trend--down'}`}
            aria-label={`${trend.isPositive ? 'Subió' : 'Bajó'} ${trend.value}% ${trendLabel}`}
          >
            {trend.isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {trend.value}%
          </span>
        )}
        {trend && <span className="stat-card__trend-label">{trendLabel}</span>}
        {subtitle && <span className="stat-card__subtitle">{subtitle}</span>}
      </div>
    )}
  </div>
);

import React from 'react';
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
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'primary',
}) => {
  return (
    <div className={`stat-card stat-card--${color}`}>
      <div className="stat-card__header">
        <h3 className="stat-card__title">{title}</h3>
        {icon && <div className="stat-card__icon">{icon}</div>}
      </div>

      <div className="stat-card__body">
        <div className="stat-card__value">{value}</div>

        {subtitle && (
          <div className="stat-card__subtitle">{subtitle}</div>
        )}

        {trend && (
          <div className={`stat-card__trend ${trend.isPositive ? 'stat-card__trend--positive' : 'stat-card__trend--negative'}`}>
            <span className="stat-card__trend-icon">
              {trend.isPositive ? '↑' : '↓'}
            </span>
            <span className="stat-card__trend-value">
              {Math.abs(trend.value)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

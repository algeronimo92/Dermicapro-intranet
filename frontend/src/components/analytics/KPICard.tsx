import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  icon?: string;
}

export const KPICard: React.FC<KPICardProps> = ({ title, value, subtitle, color = 'primary', icon }) => {
  const cls = color === 'danger' ? 'error' : color;
  return (
    <div className={`anlx-kpi-card anlx-kpi-card--${cls}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div className="anlx-kpi-label">{title}</div>
          <div className="anlx-kpi-value">{value}</div>
          {subtitle && <div className="anlx-kpi-sub">{subtitle}</div>}
        </div>
        {icon && <span style={{ fontSize: 28, opacity: 0.2 }}>{icon}</span>}
      </div>
    </div>
  );
};

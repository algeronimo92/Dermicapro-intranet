import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  icon?: string;
}

const colorMap = {
  primary: '#3498db',
  success: '#2ecc71',
  warning: '#f39c12',
  danger: '#e74c3c',
  info: '#9b59b6',
};

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  color = 'primary',
  icon,
}) => {
  const cardColor = colorMap[color];

  return (
    <div
      style={{
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        borderLeft: `4px solid ${cardColor}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666', fontWeight: 'normal' }}>
            {title}
          </h4>
          <p style={{ margin: '0', fontSize: '28px', fontWeight: 'bold', color: '#333' }}>
            {value}
          </p>
          {subtitle && (
            <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#999' }}>
              {subtitle}
            </p>
          )}
        </div>
        {icon && (
          <span style={{ fontSize: '32px', opacity: 0.2 }}>
            {icon}
          </span>
        )}
      </div>
    </div>
  );
};

import React from 'react';

interface MetricCardProps {
  title: string;
  metrics: {
    label: string;
    value: string | number;
    color?: string;
  }[];
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, metrics }) => {
  return (
    <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>{title}</h3>
      <div style={{ display: 'grid', gap: '12px' }}>
        {metrics.map((metric, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              background: '#f8f9fa',
              borderRadius: '4px',
              borderLeft: `4px solid ${metric.color || '#3498db'}`
            }}
          >
            <span style={{ fontSize: '14px', color: '#666' }}>{metric.label}</span>
            <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>
              {metric.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

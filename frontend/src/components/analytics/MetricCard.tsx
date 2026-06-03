import React from 'react';

interface MetricCardProps {
  title: string;
  metrics: { label: string; value: string | number; color?: string; }[];
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, metrics }) => (
  <div className="anlx-chart-card">
    <h3 className="anlx-chart-title">{title}</h3>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
      {metrics.map((m, i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: 'var(--spacing-sm) var(--spacing-md)',
          background: 'var(--color-bg-primary)',
          borderRadius: 'var(--radius-md)',
          borderLeft: `4px solid ${m.color || 'var(--color-primary)'}`,
        }}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{m.label}</span>
          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text-primary)' }}>{m.value}</span>
        </div>
      ))}
    </div>
  </div>
);

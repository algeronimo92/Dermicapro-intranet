import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import './PieChartWidget.css';

export interface PieChartItem {
  name: string;
  value: number;
}

interface PieChartWidgetProps {
  data: PieChartItem[];
  title?: string;
  colors?: string[];
  height?: number;
  formatter?: (value: number) => string;
  donut?: boolean;
}

const DEFAULT_COLORS = [
  '#0F766E',
  '#6366f1',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#84cc16',
  '#f97316',
];

export const PieChartWidget: React.FC<PieChartWidgetProps> = ({
  data,
  title,
  colors = DEFAULT_COLORS,
  height = 260,
  formatter,
  donut = false,
}) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="pie-chart-widget">
      {title && <h3 className="pie-chart-widget__title">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={donut ? '42%' : 0}
            outerRadius="68%"
            paddingAngle={2}
            isAnimationActive={false}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: unknown) => [
              formatter ? formatter(Number(value)) : String(value),
            ]}
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '12px', lineHeight: '1.8' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

import React from 'react';

interface RankingTableProps {
  title: string;
  data: {
    id: string;
    name: string;
    value: number;
    count?: number;
  }[];
  valueLabel?: string;
  countLabel?: string;
  valueFormatter?: (value: number) => string;
}

export const RankingTable: React.FC<RankingTableProps> = ({
  title,
  data,
  valueLabel = 'Revenue',
  countLabel = 'Count',
  valueFormatter
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatter = valueFormatter || formatCurrency;

  return (
    <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>{title}</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #eee' }}>
            <th style={{ textAlign: 'left', padding: '12px', fontSize: '14px', color: '#666' }}>#</th>
            <th style={{ textAlign: 'left', padding: '12px', fontSize: '14px', color: '#666' }}>Name</th>
            {data[0]?.count !== undefined && (
              <th style={{ textAlign: 'right', padding: '12px', fontSize: '14px', color: '#666' }}>{countLabel}</th>
            )}
            <th style={{ textAlign: 'right', padding: '12px', fontSize: '14px', color: '#666' }}>{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={item.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
              <td style={{ padding: '12px', fontSize: '16px', fontWeight: 'bold', color: '#999' }}>
                {index + 1}
              </td>
              <td style={{ padding: '12px', fontSize: '14px' }}>{item.name}</td>
              {item.count !== undefined && (
                <td style={{ padding: '12px', fontSize: '14px', textAlign: 'right' }}>
                  {item.count}
                </td>
              )}
              <td style={{ padding: '12px', fontSize: '14px', textAlign: 'right', fontWeight: 'bold' }}>
                {formatter(item.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

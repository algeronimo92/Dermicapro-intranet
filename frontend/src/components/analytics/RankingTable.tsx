import React from 'react';

interface RankingTableProps {
  title: string;
  data: { id: string; name: string; value: number; count?: number; }[];
  valueLabel?: string;
  countLabel?: string;
  valueFormatter?: (value: number) => string;
}

const fmtPEN = (v: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0 }).format(v);

export const RankingTable: React.FC<RankingTableProps> = ({
  title, data,
  valueLabel = 'Valor',
  countLabel = 'Cantidad',
  valueFormatter,
}) => {
  const fmt = valueFormatter || fmtPEN;
  return (
    <div className="anlx-chart-card">
      <h3 className="anlx-chart-title">{title}</h3>
      <div className="anlx-table-wrap">
        <table className="anlx-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nombre</th>
              {data[0]?.count !== undefined && <th className="anlx-table__right">{countLabel}</th>}
              <th className="anlx-table__right">{valueLabel}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={item.id}>
                <td>
                  <span className={`anlx-rank-badge anlx-rank-badge--${idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : 'default'}`}>
                    {idx + 1}
                  </span>
                </td>
                <td style={{ fontWeight: 500 }}>{item.name}</td>
                {item.count !== undefined && <td className="anlx-table__right">{item.count}</td>}
                <td className="anlx-table__right anlx-table__currency">{fmt(item.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

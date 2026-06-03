import React from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';
import { analyticsService } from '../../services/analytics.service';
import { AnalyticsFilters, SalesAnalyticsData } from '../../types/analytics.types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { getChartColor } from '../../utils/chartColors';

interface SalesAnalyticsProps { filters?: AnalyticsFilters; }

const fmt = (v: number) => `S/ ${v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const SalesAnalytics: React.FC<SalesAnalyticsProps> = ({ filters }) => {
  const { data, isLoading, error } = useAnalytics<SalesAnalyticsData>(
    (f) => analyticsService.getSalesAnalytics(f),
    filters
  );

  if (isLoading) return <div className="anlx-loading">Cargando datos de ventas...</div>;
  if (error)     return <div className="anlx-error">Error: {error}</div>;
  if (!data)     return <div className="anlx-empty">No hay datos disponibles</div>;

  const commissionsData = [
    { name: 'Pendientes', value: data.commissions.pending,  color: getChartColor(3) },
    { name: 'Aprobadas',  value: data.commissions.approved, color: getChartColor(2) },
    { name: 'Pagadas',    value: data.commissions.paid,     color: getChartColor(1) },
  ];

  return (
    <div className="anlx-section">

      {/* KPIs */}
      <div className="anlx-kpi-grid">
        <div className="anlx-kpi-card anlx-kpi-card--info">
          <div className="anlx-kpi-label">Total Órdenes</div>
          <div className="anlx-kpi-value">{data.overview.totalOrders}</div>
        </div>
        <div className="anlx-kpi-card anlx-kpi-card--success">
          <div className="anlx-kpi-label">Ingresos Totales</div>
          <div className="anlx-kpi-value">{fmt(data.overview.totalRevenue)}</div>
        </div>
        <div className="anlx-kpi-card anlx-kpi-card--accent">
          <div className="anlx-kpi-label">Valor Promedio Orden</div>
          <div className="anlx-kpi-value">{fmt(data.overview.averageOrderValue)}</div>
        </div>
        <div className="anlx-kpi-card anlx-kpi-card--primary">
          <div className="anlx-kpi-label">Tasa de Conversión</div>
          <div className="anlx-kpi-value">{data.overview.conversionRate.toFixed(1)}%</div>
        </div>
      </div>

      {/* Charts */}
      <div className="anlx-chart-grid">
        <div className="anlx-chart-card">
          <h3 className="anlx-chart-title">Top 10 Servicios por Ingresos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.topServices} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => `S/${(v/1000).toFixed(0)}k`} />
              <YAxis dataKey="serviceName" type="category" width={120} />
              <Tooltip formatter={(v: any) => fmt(Number(v))} />
              <Bar dataKey="revenue" fill={getChartColor(1)} name="Ingresos" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="anlx-chart-card">
          <h3 className="anlx-chart-title">Comisiones por Estado</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={commissionsData} cx="50%" cy="50%" outerRadius={100}
                labelLine={false} label={(e) => `${e.name}: ${e.value}`}
                dataKey="value">
                {commissionsData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ranking de vendedores */}
      <div className="anlx-chart-card">
        <h3 className="anlx-chart-title">Ranking de Vendedores</h3>
        <div className="anlx-table-wrap">
          <table className="anlx-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Vendedor</th>
                <th className="anlx-table__right">Órdenes</th>
                <th className="anlx-table__right">Ingresos</th>
                <th className="anlx-table__right">Comisiones</th>
              </tr>
            </thead>
            <tbody>
              {data.salesPeople.map((person, idx) => (
                <tr key={person.id}>
                  <td>
                    <span className={`anlx-rank-badge anlx-rank-badge--${idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : 'default'}`}>
                      {person.ranking}
                    </span>
                  </td>
                  <td style={{ fontWeight: 'var(--font-weight-medium)' as any }}>{person.name}</td>
                  <td className="anlx-table__right">{person.ordersCount}</td>
                  <td className="anlx-table__right anlx-table__currency">{fmt(person.revenue)}</td>
                  <td className="anlx-table__right" style={{ color: 'var(--color-info-dark)', fontWeight: 600 }}>
                    {fmt(person.commissionsEarned)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumen comisiones */}
      <div className="anlx-kpi-grid">
        <div className="anlx-kpi-card anlx-kpi-card--warning">
          <div className="anlx-kpi-label">Comisiones Pendientes</div>
          <div className="anlx-kpi-value">{data.commissions.pending}</div>
          <div className="anlx-kpi-sub">{fmt(data.commissions.totalPending)}</div>
        </div>
        <div className="anlx-kpi-card anlx-kpi-card--success">
          <div className="anlx-kpi-label">Comisiones Aprobadas</div>
          <div className="anlx-kpi-value">{data.commissions.approved}</div>
          <div className="anlx-kpi-sub">{fmt(data.commissions.totalApproved)}</div>
        </div>
        <div className="anlx-kpi-card anlx-kpi-card--info">
          <div className="anlx-kpi-label">Comisiones Pagadas</div>
          <div className="anlx-kpi-value">{data.commissions.paid}</div>
          <div className="anlx-kpi-sub">{fmt(data.commissions.totalPaid)}</div>
        </div>
        <div className="anlx-kpi-card anlx-kpi-card--accent">
          <div className="anlx-kpi-label">Total Comisiones</div>
          <div className="anlx-kpi-value">{data.commissions.pending + data.commissions.approved + data.commissions.paid}</div>
          <div className="anlx-kpi-sub">{fmt(data.commissions.totalAmount)}</div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import { useAnalytics } from '../../hooks/useAnalytics';
import { analyticsService } from '../../services/analytics.service';
import { AnalyticsFilters, SalesAnalyticsData } from '../../types/analytics.types';
import { AnlxBarChart, AnlxDonut, ChartCard } from '../../components/analytics/charts';
import { formatPENTick, useChartSeries } from '../../components/analytics/chartUtils';

interface SalesAnalyticsProps { filters?: AnalyticsFilters; }

const fmt = (v: number) => `S/ ${v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const SalesAnalytics: React.FC<SalesAnalyticsProps> = ({ filters }) => {
  const { data, isLoading, error } = useAnalytics<SalesAnalyticsData>(
    (f) => analyticsService.getSalesAnalytics(f),
    filters
  );
  const theme = useChartSeries();

  if (isLoading && !data) return <DashboardSkeleton />;
  if (error)     return <div className="anlx-error">Error: {error}</div>;
  if (!data)     return <div className="anlx-empty">No hay datos disponibles</div>;

  const commissionsData = [
    { name: 'Pendientes', value: data.commissions.pending,  color: theme.status.in_progress },
    { name: 'Aprobadas',  value: data.commissions.approved, color: theme.status.reserved },
    { name: 'Pagadas',    value: data.commissions.paid,     color: theme.status.attended },
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
        <ChartCard title="Top 10 servicios por ingresos">
          <AnlxBarChart
            data={data.topServices} categoryKey="serviceName" valueKey="revenue" label="Ingresos"
            layout="vertical" valueFormatter={fmt} tickFormatter={formatPENTick}
          />
        </ChartCard>

        <ChartCard title="Comisiones por estado" subtitle="Cantidad de comisiones">
          <AnlxDonut data={commissionsData} totalLabel="Comisiones" />
        </ChartCard>
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

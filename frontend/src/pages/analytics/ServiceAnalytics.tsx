import React from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';
import { analyticsService } from '../../services/analytics.service';
import { AnalyticsFilters, ServiceAnalyticsData } from '../../types/analytics.types';
import { getChartColor } from '../../utils/chartColors';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ServiceAnalyticsProps { filters?: AnalyticsFilters; }

const fmt = (v: number) => `S/ ${v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const completionVariant = (rate: number) => {
  if (rate >= 80) return { bg: 'var(--color-success-alpha-10)', color: 'var(--color-success-dark)' };
  if (rate >= 60) return { bg: 'var(--color-warning-alpha-10)', color: 'var(--color-warning-dark)' };
  return { bg: 'var(--color-error-alpha-10)', color: 'var(--color-error)' };
};

export const ServiceAnalytics: React.FC<ServiceAnalyticsProps> = ({ filters }) => {
  const { data, isLoading, error } = useAnalytics<ServiceAnalyticsData>(
    (f) => analyticsService.getServiceAnalytics(f),
    filters
  );

  if (isLoading) return <div className="anlx-loading">Cargando datos de servicios...</div>;
  if (error)     return <div className="anlx-error">Error: {error}</div>;
  if (!data)     return <div className="anlx-empty">No hay datos disponibles</div>;

  return (
    <div className="anlx-section">

      {/* KPIs */}
      <div className="anlx-kpi-grid">
        <div className="anlx-kpi-card anlx-kpi-card--info">
          <div className="anlx-kpi-label">Total Servicios</div>
          <div className="anlx-kpi-value">{data.overview.totalServices}</div>
        </div>
        <div className="anlx-kpi-card anlx-kpi-card--success">
          <div className="anlx-kpi-label">Servicios Activos</div>
          <div className="anlx-kpi-value">{data.overview.activeServices}</div>
        </div>
        <div className="anlx-kpi-card anlx-kpi-card--primary">
          <div className="anlx-kpi-label">Ingresos Totales</div>
          <div className="anlx-kpi-value">{fmt(data.overview.totalRevenue)}</div>
        </div>
        <div className="anlx-kpi-card anlx-kpi-card--warning">
          <div className="anlx-kpi-label">Precio Promedio</div>
          <div className="anlx-kpi-value">{fmt(data.pricing.averageServicePrice)}</div>
        </div>
      </div>

      {/* Tabla de rendimiento */}
      <div className="anlx-chart-card">
        <h3 className="anlx-chart-title">Rendimiento por Servicio</h3>
        <div className="anlx-table-wrap">
          <table className="anlx-table">
            <thead>
              <tr>
                <th>Servicio</th>
                <th className="anlx-table__right">Veces Ordenado</th>
                <th className="anlx-table__right">Ingresos</th>
                <th className="anlx-table__right">Precio Promedio</th>
                <th className="anlx-table__right">% Completado</th>
              </tr>
            </thead>
            <tbody>
              {data.performance.map((svc) => {
                const v = completionVariant(svc.completionRate);
                return (
                  <tr key={svc.serviceTemplateId}>
                    <td style={{ fontWeight: 500 }}>{svc.serviceName}</td>
                    <td className="anlx-table__right">{svc.timesOrdered}</td>
                    <td className="anlx-table__right anlx-table__currency">{fmt(svc.revenue)}</td>
                    <td className="anlx-table__right">{fmt(svc.averagePrice)}</td>
                    <td className="anlx-table__right">
                      <span style={{ padding: '3px 8px', borderRadius: 'var(--radius-md)', fontSize: 11, fontWeight: 600, background: v.bg, color: v.color }}>
                        {svc.completionRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts */}
      <div className="anlx-chart-grid">
        <div className="anlx-chart-card">
          <h3 className="anlx-chart-title">Top 10 Servicios por Ingresos</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.performance.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => `S/${(v/1000).toFixed(0)}k`} />
              <YAxis dataKey="serviceName" type="category" width={150} />
              <Tooltip formatter={(v: any) => fmt(Number(v))} />
              <Bar dataKey="revenue" fill={getChartColor(2)} name="Ingresos" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="anlx-chart-card">
          <h3 className="anlx-chart-title">Top 10 Servicios por Popularidad</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.performance.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="serviceName" type="category" width={150} />
              <Tooltip />
              <Bar dataKey="timesOrdered" fill={getChartColor(1)} name="Veces Ordenado" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rango de precios */}
      <div className="anlx-kpi-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="anlx-kpi-card anlx-kpi-card--info" style={{ textAlign: 'center' }}>
          <div className="anlx-kpi-label">Precio Mínimo</div>
          <div className="anlx-kpi-value">{fmt(data.pricing.priceRange.min)}</div>
        </div>
        <div className="anlx-kpi-card anlx-kpi-card--success" style={{ textAlign: 'center' }}>
          <div className="anlx-kpi-label">Precio Promedio</div>
          <div className="anlx-kpi-value">{fmt(data.pricing.averageServicePrice)}</div>
        </div>
        <div className="anlx-kpi-card anlx-kpi-card--error" style={{ textAlign: 'center' }}>
          <div className="anlx-kpi-label">Precio Máximo</div>
          <div className="anlx-kpi-value">{fmt(data.pricing.priceRange.max)}</div>
        </div>
      </div>

      {/* Paquetes */}
      {data.packages.length > 0 && (
        <div className="anlx-chart-card">
          <h3 className="anlx-chart-title">Paquetes de Servicios</h3>
          <div className="anlx-table-wrap">
            <table className="anlx-table">
              <thead>
                <tr>
                  <th>Paquete</th>
                  <th className="anlx-table__right">Servicios</th>
                  <th className="anlx-table__right">Precio</th>
                  <th className="anlx-table__right">Popularidad</th>
                </tr>
              </thead>
              <tbody>
                {data.packages.map((pkg) => (
                  <tr key={pkg.packageId}>
                    <td style={{ fontWeight: 500 }}>{pkg.packageName}</td>
                    <td className="anlx-table__right">{pkg.serviceCount}</td>
                    <td className="anlx-table__right anlx-table__currency">{fmt(pkg.totalPrice)}</td>
                    <td className="anlx-table__right">
                      <span style={{ padding: '3px 8px', borderRadius: 'var(--radius-md)', fontSize: 11, fontWeight: 600, background: 'var(--color-primary-alpha-10)', color: 'var(--color-primary)' }}>
                        {pkg.popularity} órdenes
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

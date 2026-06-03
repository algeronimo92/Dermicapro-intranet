import React from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';
import { analyticsService } from '../../services/analytics.service';
import { AnalyticsFilters, CustomerAnalyticsData } from '../../types/analytics.types';
import { getChartColor } from '../../utils/chartColors';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface CustomerAnalyticsProps { filters?: AnalyticsFilters; }

const fmt = (v: number) => `S/ ${v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const CustomerAnalytics: React.FC<CustomerAnalyticsProps> = ({ filters }) => {
  const { data, isLoading, error } = useAnalytics<CustomerAnalyticsData>(
    (f) => analyticsService.getCustomerAnalytics(f),
    filters
  );

  if (isLoading) return <div className="anlx-loading">Cargando datos de clientes...</div>;
  if (error)     return <div className="anlx-error">Error: {error}</div>;
  if (!data)     return <div className="anlx-empty">No hay datos disponibles</div>;

  const genderData = data.demographics.byGender.map((item) => ({
    name: item.gender === 'M' ? 'Masculino' : item.gender === 'F' ? 'Femenino' : 'Otro',
    value: item.count,
  }));

  const PIE_COLORS = [getChartColor(1), getChartColor(6), getChartColor(3)];

  return (
    <div className="anlx-section">

      {/* KPIs */}
      <div className="anlx-kpi-grid">
        <div className="anlx-kpi-card anlx-kpi-card--info">
          <div className="anlx-kpi-label">Total Pacientes</div>
          <div className="anlx-kpi-value">{data.overview.totalPatients}</div>
        </div>
        <div className="anlx-kpi-card anlx-kpi-card--success">
          <div className="anlx-kpi-label">Nuevos Pacientes</div>
          <div className="anlx-kpi-value">{data.overview.newPatients}</div>
        </div>
        <div className="anlx-kpi-card anlx-kpi-card--accent">
          <div className="anlx-kpi-label">Pacientes Recurrentes</div>
          <div className="anlx-kpi-value">{data.overview.returningPatients}</div>
        </div>
        <div className="anlx-kpi-card anlx-kpi-card--error">
          <div className="anlx-kpi-label">Tasa de Abandono</div>
          <div className="anlx-kpi-value">{data.overview.churnRate.toFixed(1)}%</div>
        </div>
      </div>

      {/* Charts: Género + Edad */}
      <div className="anlx-chart-grid">
        <div className="anlx-chart-card">
          <h3 className="anlx-chart-title">Pacientes por Género</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={genderData} cx="50%" cy="50%" outerRadius={100}
                labelLine={false} label={(e) => `${e.name}: ${e.value}`} dataKey="value">
                {genderData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937'}} 
                itemStyle={{ color: '#fff' }} 
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="anlx-chart-card">
          <h3 className="anlx-chart-title">Pacientes por Rango de Edad</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.demographics.byAgeRange}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937'}} 
                itemStyle={{ color: '#fff' }} 
                cursor={{ fill: 'none' }}
              />
              <Bar dataKey="count" fill={getChartColor(1)} name="Pacientes" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CLV + Deuda + Retención */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)' }}>
        <div className="anlx-chart-card" style={{ textAlign: 'center', marginBottom: 0 }}>
          <h3 className="anlx-chart-title">Valor de Vida Promedio (CLV)</h3>
          <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, color: 'var(--color-success-dark)', padding: 'var(--spacing-lg) 0' }}>
            {fmt(data.lifetime.averageCLV)}
          </div>
          <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>Dinero pagado por cliente</div>
        </div>

        <div className="anlx-chart-card" style={{ textAlign: 'center', marginBottom: 0 }}>
          <h3 className="anlx-chart-title">Total Por Cobrar</h3>
          <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, color: 'var(--color-warning-dark)', padding: 'var(--spacing-lg) 0' }}>
            {fmt(data.accountsReceivable.totalDebt)}
          </div>
          <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
            {data.accountsReceivable.debtorCount} deudor(es)
          </div>
        </div>

        <div className="anlx-chart-card" style={{ marginBottom: 0 }}>
          <h3 className="anlx-chart-title">Métricas de Retención</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            {[
              { label: 'Tasa de Retención', value: `${data.retention.rate.toFixed(1)}%`, color: 'var(--color-success-dark)' },
              { label: 'Clientes Recurrentes', value: `${data.retention.repeatCustomerRate.toFixed(1)}%`, color: 'var(--color-primary)' },
              { label: 'Días Entre Visitas', value: `${data.retention.averageDaysBetweenVisits.toFixed(0)} días`, color: 'var(--color-accent)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--spacing-sm) var(--spacing-md)', background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>{label}</span>
                <span style={{ fontWeight: 700, color, fontSize: 'var(--font-size-sm)' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tablas: Top clientes + Top deudores */}
      <div className="anlx-chart-grid">
        <div className="anlx-chart-card">
          <h3 className="anlx-chart-title">Top 10 Clientes por Dinero Pagado</h3>
          <div className="anlx-table-wrap">
            <table className="anlx-table">
              <thead><tr><th>#</th><th>Paciente</th><th className="anlx-table__right">Citas</th><th className="anlx-table__right">Total Pagado</th></tr></thead>
              <tbody>
                {data.lifetime.topCustomers.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--color-text-disabled)' }}>No hay pagos registrados aún</td></tr>
                ) : data.lifetime.topCustomers.map((c, idx) => (
                  <tr key={c.patientId}>
                    <td><span className={`anlx-rank-badge anlx-rank-badge--${idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : 'default'}`}>{idx + 1}</span></td>
                    <td style={{ fontWeight: 500 }}>{c.patientName}</td>
                    <td className="anlx-table__right">{c.appointmentsCount}</td>
                    <td className="anlx-table__right anlx-table__currency">{fmt(c.totalSpent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="anlx-chart-card">
          <h3 className="anlx-chart-title">Top 10 Deudores (Por Cobrar)</h3>
          <div className="anlx-table-wrap">
            <table className="anlx-table">
              <thead><tr><th>#</th><th>Paciente</th><th className="anlx-table__right">Facturas</th><th className="anlx-table__right">Sin Facturar</th><th className="anlx-table__right">Total Deuda</th></tr></thead>
              <tbody>
                {data.accountsReceivable.topDebtors.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--color-text-disabled)' }}>No hay deudas pendientes</td></tr>
                ) : data.accountsReceivable.topDebtors.map((d, idx) => (
                  <tr key={d.patientId}>
                    <td><span className="anlx-rank-badge" style={{ background: 'var(--color-error-alpha-10)', color: 'var(--color-error)' }}>{idx + 1}</span></td>
                    <td style={{ fontWeight: 500 }}>{d.patientName}</td>
                    <td className="anlx-table__right" style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-xs)' }}>{fmt(d.invoicesDebt)}</td>
                    <td className="anlx-table__right" style={{ color: 'var(--color-warning-dark)', fontSize: 'var(--font-size-xs)' }}>{fmt(d.uninvoicedOrders)}</td>
                    <td className="anlx-table__right" style={{ fontWeight: 160, color: 'var(--color-error)' }}>{fmt(d.totalDebt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

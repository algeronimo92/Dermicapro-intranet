import React from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';
import { analyticsService } from '../../services/analytics.service';
import { FinancialAnalyticsData, AnalyticsFilters } from '../../types/analytics.types';
import { KPICard } from '../../components/analytics/KPICard';
import { TrendChart } from '../../components/analytics/TrendChart';
import { BarChart } from '../../components/analytics/BarChart';
import { MetricCard } from '../../components/analytics/MetricCard';
import { RankingTable } from '../../components/analytics/RankingTable';

interface FinancialAnalyticsProps {
  filters: AnalyticsFilters;
}

export const FinancialAnalytics: React.FC<FinancialAnalyticsProps> = ({ filters }) => {
  const { data, isLoading, error } = useAnalytics<FinancialAnalyticsData>(
    (f) => analyticsService.getFinancialAnalytics(f),
    filters
  );

  if (isLoading) return <div className="anlx-loading">Cargando datos financieros...</div>;
  if (error)     return <div className="anlx-error">Error: {error}</div>;
  if (!data)     return <div className="anlx-empty">No hay datos disponibles</div>;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 0
    }).format(value);
  };

  const paymentMethodMetrics = data.revenue.byPaymentMethod.map((pm) => ({
    label: pm.method,
    value: `${formatCurrency(pm.amount)} (${pm.count})`,
    color: 'var(--chart-1)'
  }));

  const agingMetrics = data.accountsReceivable.aging.map((a) => ({
    label: a.range,
    value: `${formatCurrency(a.amount)} (${a.count})`,
    color: a.range.includes('90+') ? 'var(--color-error)' : a.range.includes('61-90') ? 'var(--color-warning)' : 'var(--chart-1)'
  }));

  return (
    <div className="anlx-section" style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
      {/* KPIs Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        <KPICard
          title="Ingresos Totales"
          value={formatCurrency(data.revenue.total)}
          color="success"
        />
        <KPICard
          title="Ticket Promedio"
          value={formatCurrency(data.revenue.averageTicket)}
          color="info"
        />
        <KPICard
          title="Cuentas por Cobrar"
          value={formatCurrency(data.accountsReceivable.total)}
          color="warning"
        />
        <KPICard
          title="Ingresos Proyectados"
          value={formatCurrency(data.cashFlow.projected)}
          color="primary"
        />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <TrendChart
          data={data.revenue.trend}
          title="Tendencia de Ingresos"
          colorIndex={2}
        />
        <MetricCard
          title="Ingresos por Método de Pago"
          metrics={paymentMethodMetrics}
        />
      </div>

      {/* Cash Flow and Aging */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <BarChart
          data={data.cashFlow.daily.slice(-30)}
          title="Flujo de Caja Diario (últimos 30 días)"
          xKey="date"
          yKey="amount"
          colorIndex={5}
        />
        <MetricCard
          title="Antigüedad de Cuentas por Cobrar"
          metrics={agingMetrics}
        />
      </div>

      {/* Top Debtors */}
      <RankingTable
        title="Top 10 Deudores"
        data={data.accountsReceivable.topDebtors.map((d) => ({
          id: d.patientId,
          name: d.patientName,
          value: d.amount
        }))}
        valueLabel="Deuda"
      />
    </div>
  );
};

import React from 'react';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import { useAnalytics } from '../../hooks/useAnalytics';
import { analyticsService } from '../../services/analytics.service';
import { FinancialAnalyticsData, AnalyticsFilters } from '../../types/analytics.types';
import { KPICard } from '../../components/analytics/KPICard';
import { TrendChart } from '../../components/analytics/TrendChart';
import { BarChart } from '../../components/analytics/BarChart';
import { MetricCard } from '../../components/analytics/MetricCard';
import { RankingTable } from '../../components/analytics/RankingTable';
import { PieChart } from '../../components/analytics/PieChart';
import { formatPEN } from '../../components/analytics/chartUtils';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia',
  yape: 'Yape', plin: 'Plin', account_credit: 'Saldo a favor',
};

interface FinancialAnalyticsProps {
  filters: AnalyticsFilters;
}

export const FinancialAnalytics: React.FC<FinancialAnalyticsProps> = ({ filters }) => {
  const { data, isLoading, error } = useAnalytics<FinancialAnalyticsData>(
    (f) => analyticsService.getFinancialAnalytics(f),
    filters
  );

  if (isLoading && !data) return <DashboardSkeleton />;
  if (error)     return <div className="anlx-error">Error: {error}</div>;
  if (!data)     return <div className="anlx-empty">No hay datos disponibles</div>;

  const formatCurrency = formatPEN;

  const paymentMethodData = data.revenue.byPaymentMethod.map((pm) => ({
    name: PAYMENT_METHOD_LABELS[pm.method] ?? pm.method,
    value: pm.amount,
  }));

  const agingMetrics = data.accountsReceivable.aging.map((a) => ({
    label: a.range,
    value: `${formatCurrency(a.amount)} (${a.count})`,
    color: a.range.includes('90+') ? 'var(--color-error)' : a.range.includes('61-90') ? 'var(--color-warning)' : 'var(--color-primary)'
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
      <div className="anlx-chart-grid anlx-chart-grid--wide">
        <TrendChart
          data={data.revenue.trend}
          title="Tendencia de ingresos"
          subtitle="Pagos registrados por mes"
        />
        <PieChart
          data={paymentMethodData}
          title="Ingresos por método de pago"
          totalLabel="Cobrado"
          formatter={formatCurrency}
        />
      </div>

      {/* Cash Flow and Aging */}
      <div className="anlx-chart-grid">
        <BarChart
          data={data.cashFlow.daily.slice(-30)}
          title="Flujo de caja diario"
          subtitle="Últimos 30 días"
          xKey="date"
          yKey="amount"
          label="Cobrado"
        />
        <MetricCard
          title="Antigüedad de cuentas por cobrar"
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

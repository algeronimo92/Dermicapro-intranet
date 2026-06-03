import React from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';
import { analyticsService } from '../../services/analytics.service';
import { ExecutiveSummaryData, AnalyticsFilters } from '../../types/analytics.types';
import { KPICard } from '../../components/analytics/KPICard';
import { TrendChart } from '../../components/analytics/TrendChart';
import { RankingTable } from '../../components/analytics/RankingTable';
import { PieChart } from '../../components/analytics/PieChart';

interface ExecutiveSummaryProps {
  filters: AnalyticsFilters;
}

export const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({ filters }) => {
  const { data, isLoading, error } = useAnalytics<ExecutiveSummaryData>(
    (f) => analyticsService.getExecutiveSummary(f),
    filters
  );

  if (isLoading) return <div className="anlx-loading">Cargando resumen ejecutivo...</div>;
  if (error)     return <div className="anlx-error">Error: {error}</div>;
  if (!data)     return <div className="anlx-empty">No hay datos disponibles</div>;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 0
    }).format(value);
  };

  const STATUS_LABELS: Record<string, string> = {
    reserved: 'Reservada', in_progress: 'En Atención',
    attended: 'Atendida', cancelled: 'Cancelada', no_show: 'No Asistió',
  };

  const pieData = data.appointmentsByStatus.map((item) => ({
    name: STATUS_LABELS[item.status] ?? item.status,
    value: item.count,
  }));

  return (
    <div className="anlx-section" style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
      {/* KPIs Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        <KPICard
          title="Ingresos Totales"
          value={formatCurrency(data.kpis.totalRevenue)}
          color="success"
        />
        <KPICard
          title="Citas del Período"
          value={data.kpis.totalAppointments}
          color="primary"
        />
        <KPICard
          title="Tasa de Asistencia"
          value={`${data.kpis.attendanceRate}%`}
          color="info"
        />
        <KPICard
          title="Comisiones Pendientes"
          value={formatCurrency(data.kpis.pendingCommissions)}
          color="warning"
        />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <TrendChart
          data={data.revenueTrend}
          title="Tendencia de Ingresos"
          colorIndex={2}
        />
        <PieChart
          data={pieData}
          title="Citas por Estado"
        />
      </div>

      {/* Tables Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        <RankingTable
          title="Top 5 Servicios"
          data={data.topServices.map(s => ({ id: s.id, name: s.name, value: s.revenue, count: s.count }))}
          valueLabel="Ingresos"
          countLabel="Ventas"
        />
      </div>
    </div>
  );
};

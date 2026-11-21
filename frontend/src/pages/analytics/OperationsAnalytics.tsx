import React from 'react';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import { useAnalytics } from '../../hooks/useAnalytics';
import { analyticsService } from '../../services/analytics.service';
import { AnalyticsFilters, OperationsAnalyticsData } from '../../types/analytics.types';
import { AnlxBarChart, AnlxDonut, ChartCard } from '../../components/analytics/charts';
import { useChartSeries } from '../../components/analytics/chartUtils';

interface OperationsAnalyticsProps { filters?: AnalyticsFilters; }

export const OperationsAnalytics: React.FC<OperationsAnalyticsProps> = ({ filters }) => {
  const { data, isLoading, error } = useAnalytics<OperationsAnalyticsData>(
    (f) => analyticsService.getOperationsAnalytics(f),
    filters
  );
  const theme = useChartSeries();

  if (isLoading && !data) return <DashboardSkeleton />;
  if (error)     return <div className="anlx-error">Error: {error}</div>;
  if (!data)     return <div className="anlx-empty">No hay datos disponibles</div>;

  const statusData = [
    { name: 'Completadas', value: data.appointments.completed,  color: theme.status.attended },
    { name: 'Canceladas',  value: data.appointments.cancelled,  color: theme.status.cancelled },
    { name: 'No asistió',  value: data.appointments.noShows,    color: theme.status.no_show },
  ];

  const statusLabels: Record<string, string> = {
    in_progress: 'En Atención',
    reserved:    'Reservada',
    attended:    'Atendida',
    cancelled:   'Cancelada',
    no_show:     'No Asistió',
  };

  return (
    <div className="anlx-section">

      {/* KPIs */}
      <div className="anlx-kpi-grid">
        <div className="anlx-kpi-card anlx-kpi-card--info">
          <div className="anlx-kpi-label">Total Citas</div>
          <div className="anlx-kpi-value">{data.appointments.total}</div>
        </div>
        <div className="anlx-kpi-card anlx-kpi-card--success">
          <div className="anlx-kpi-label">Tasa de Asistencia</div>
          <div className="anlx-kpi-value">{data.appointments.attendanceRate.toFixed(1)}%</div>
        </div>
        <div className="anlx-kpi-card anlx-kpi-card--accent">
          <div className="anlx-kpi-label">Tasa de Utilización</div>
          <div className="anlx-kpi-value">{data.utilization.rate.toFixed(1)}%</div>
        </div>
        <div className="anlx-kpi-card anlx-kpi-card--warning">
          <div className="anlx-kpi-label">Tiempo de Espera Promedio</div>
          <div className="anlx-kpi-value">{data.scheduling.averageWaitTime} min</div>
        </div>
      </div>

      {/* Charts */}
      <div className="anlx-chart-grid">
        <ChartCard title="Citas por estado">
          <AnlxDonut data={statusData} totalLabel="Citas" />
        </ChartCard>

        <ChartCard title="Citas por día de la semana">
          <AnlxBarChart data={data.scheduling.byDayOfWeek} categoryKey="day" valueKey="count" label="Citas" color={theme.series.scheduled} />
        </ChartCard>
      </div>

      {/* Citas por hora */}
      <ChartCard title="Citas por hora del día" subtitle="Hora de inicio programada">
        <AnlxBarChart
          data={data.scheduling.byTimeSlot} categoryKey="hour" valueKey="count" label="Citas"
          categoryFormatter={(h) => `${h}:00`}
        />
      </ChartCard>

      {/* Horas pico */}
      <div className="anlx-chart-grid">
        <div className="anlx-chart-card">
          <h3 className="anlx-chart-title">Horas Pico</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            {data.utilization.peakHours.map((hour, idx) => (
              <li key={idx} style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                background: 'var(--color-success-alpha-10)',
                borderRadius: 'var(--radius-md)',
                borderLeft: '3px solid var(--color-success)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-sm)',
              }}>
                {hour}
              </li>
            ))}
          </ul>
        </div>

        <div className="anlx-chart-card">
          <h3 className="anlx-chart-title">Horas con Baja Demanda</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            {data.utilization.lowHours.map((hour, idx) => (
              <li key={idx} style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                background: 'var(--color-error-alpha-10)',
                borderRadius: 'var(--radius-md)',
                borderLeft: '3px solid var(--color-error)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-sm)',
              }}>
                {hour}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Próximas citas */}
      <div className="anlx-chart-card">
        <h3 className="anlx-chart-title">Próximas Citas (Próxima Semana)</h3>
        <div className="anlx-table-wrap">
          <table className="anlx-table">
            <thead>
              <tr>
                <th>Fecha / Hora</th>
                <th>Paciente</th>
                <th>Servicios</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.upcomingAppointments.map((apt) => (
                <tr key={apt.id}>
                  <td>{new Date(apt.scheduledDate).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td>{apt.patient.firstName} {apt.patient.lastName}</td>
                  <td className="anlx-table__muted">{apt.services.join(', ')}</td>
                  <td>
                    <span className={`phist-status-badge phist-status-badge--${apt.status}`}>
                      {statusLabels[apt.status] || apt.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

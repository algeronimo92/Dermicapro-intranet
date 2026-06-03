import React from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';
import { analyticsService } from '../../services/analytics.service';
import { AnalyticsFilters, OperationsAnalyticsData } from '../../types/analytics.types';
import { getChartColor } from '../../utils/chartColors';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface OperationsAnalyticsProps { filters?: AnalyticsFilters; }

export const OperationsAnalytics: React.FC<OperationsAnalyticsProps> = ({ filters }) => {
  const { data, isLoading, error } = useAnalytics<OperationsAnalyticsData>(
    (f) => analyticsService.getOperationsAnalytics(f),
    filters
  );

  if (isLoading) return <div className="anlx-loading">Cargando datos operacionales...</div>;
  if (error)     return <div className="anlx-error">Error: {error}</div>;
  if (!data)     return <div className="anlx-empty">No hay datos disponibles</div>;

  const statusData = [
    { name: 'Completadas', value: data.appointments.completed,  color: getChartColor(2) },
    { name: 'Canceladas',  value: data.appointments.cancelled,  color: getChartColor(4) },
    { name: 'No asistió',  value: data.appointments.noShows,    color: getChartColor(3) },
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
        <div className="anlx-chart-card">
          <h3 className="anlx-chart-title">Citas por Estado</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" outerRadius={100}
                labelLine={false} label={(e) => `${e.name}: ${e.value}`} dataKey="value">
                {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="anlx-chart-card">
          <h3 className="anlx-chart-title">Citas por Día de la Semana</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.scheduling.byDayOfWeek}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill={getChartColor(1)} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Citas por hora */}
      <div className="anlx-chart-card">
        <h3 className="anlx-chart-title">Citas por Hora del Día</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.scheduling.byTimeSlot}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" label={{ value: 'Hora', position: 'insideBottom', offset: -5 }} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill={getChartColor(2)} name="Número de Citas" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

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

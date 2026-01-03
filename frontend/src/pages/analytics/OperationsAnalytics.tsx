import React from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';
import { analyticsService } from '../../services/analytics.service';
import { AnalyticsFilters, OperationsAnalyticsData } from '../../types/analytics.types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface OperationsAnalyticsProps {
  filters?: AnalyticsFilters;
}

const COLORS = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12'];

export const OperationsAnalytics: React.FC<OperationsAnalyticsProps> = ({ filters }) => {
  const { data, isLoading, error } = useAnalytics<OperationsAnalyticsData>(
    (f) => analyticsService.getOperationsAnalytics(f),
    filters
  );

  if (isLoading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando datos operacionales...</div>;
  }

  if (error) {
    return <div style={{ padding: '40px', color: '#e74c3c' }}>Error: {error}</div>;
  }

  if (!data) {
    return <div style={{ padding: '40px' }}>No hay datos disponibles</div>;
  }

  const appointmentStatusData = [
    { name: 'Completadas', value: data.appointments.completed, color: '#2ecc71' },
    { name: 'Canceladas', value: data.appointments.cancelled, color: '#e74c3c' },
    { name: 'No Shows', value: data.appointments.noShows, color: '#f39c12' },
  ];

  return (
    <div style={{ padding: '20px' }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #3498db' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Total Citas</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>{data.appointments.total}</div>
        </div>

        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #2ecc71' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Tasa de Asistencia</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>{data.appointments.attendanceRate.toFixed(1)}%</div>
        </div>

        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #9b59b6' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Tasa de Utilización</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>{data.utilization.rate.toFixed(1)}%</div>
        </div>

        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #f39c12' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Tiempo de Espera Promedio</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>{data.scheduling.averageWaitTime} min</div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        {/* Appointments by Status */}
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px' }}>Citas por Estado</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={appointmentStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {appointmentStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Appointments by Day of Week */}
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px' }}>Citas por Día de la Semana</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.scheduling.byDayOfWeek}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3498db" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Appointments by Time Slot */}
      <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px' }}>Citas por Hora del Día</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.scheduling.byTimeSlot}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" label={{ value: 'Hora', position: 'insideBottom', offset: -5 }} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#2ecc71" name="Número de Citas" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Peak Hours */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '18px' }}>Horas Pico</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {data.utilization.peakHours.map((hour, idx) => (
              <li key={idx} style={{ padding: '10px', background: '#f8f9fa', marginBottom: '8px', borderRadius: '4px', borderLeft: '3px solid #2ecc71' }}>
                {hour}
              </li>
            ))}
          </ul>
        </div>

        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '18px' }}>Horas con Baja Demanda</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {data.utilization.lowHours.map((hour, idx) => (
              <li key={idx} style={{ padding: '10px', background: '#f8f9fa', marginBottom: '8px', borderRadius: '4px', borderLeft: '3px solid #e74c3c' }}>
                {hour}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '18px' }}>Próximas Citas (Próxima Semana)</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Fecha/Hora</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Paciente</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Servicios</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.upcomingAppointments.map((apt) => (
                <tr key={apt.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '12px' }}>
                    {new Date(apt.scheduledDate).toLocaleString('es-ES', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {apt.patient.firstName} {apt.patient.lastName}
                  </td>
                  <td style={{ padding: '12px' }}>{apt.services.join(', ')}</td>
                  <td style={{ padding: '12px' }}>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: apt.status === 'confirmed' ? '#d4edda' : '#fff3cd',
                        color: apt.status === 'confirmed' ? '#155724' : '#856404',
                      }}
                    >
                      {apt.status === 'confirmed' ? 'Confirmada' : 'Programada'}
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

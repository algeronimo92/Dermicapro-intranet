import React from 'react';
import { NurseDashboardData } from '../../types/dashboard.types';
import { StatCard } from './widgets/StatCard';

interface NurseDashboardProps {
  data: NurseDashboardData | null;
  isLoading: boolean;
}

export const NurseDashboard: React.FC<NurseDashboardProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="dashboard-empty">
        <p>No hay datos disponibles</p>
      </div>
    );
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="nurse-dashboard">
      <h1 className="dashboard__title">Dashboard Enfermería</h1>

      {/* Quick Stats */}
      <section className="dashboard__section">
        <h2 className="dashboard__section-title">Estadísticas de Hoy</h2>
        <div className="stats-grid stats-grid--2">
          <StatCard
            title="Pacientes Atendidos"
            value={data.patients.attendedToday}
            icon="✅"
            color="success"
          />
          <StatCard
            title="Citas Agendadas"
            value={data.patients.scheduledToday}
            icon="📅"
            color="info"
          />
        </div>
      </section>

      {/* Today's Appointments */}
      <section className="dashboard__section">
        <h2 className="dashboard__section-title">Citas de Hoy</h2>
        {data.appointments.today && data.appointments.today.length > 0 ? (
          <div className="appointments-list">
            {data.appointments.today.map((appointment: any) => (
              <div key={appointment.id} className="appointment-card">
                <div className="appointment-card__header">
                  <div className="appointment-card__time">
                    {formatTime(appointment.scheduledDate)}
                  </div>
                  <div className={`appointment-card__status appointment-card__status--${appointment.status}`}>
                    {appointment.status}
                  </div>
                </div>
                <div className="appointment-card__body">
                  <h3 className="appointment-card__patient">
                    {appointment.patient?.firstName} {appointment.patient?.lastName}
                  </h3>
                  {appointment.appointmentServices && appointment.appointmentServices.length > 0 && (
                    <div className="appointment-card__services">
                      {appointment.appointmentServices.map((appSvc: any, idx: number) => (
                        <span key={idx} className="service-tag">
                          {appSvc.order?.service?.name || 'Servicio'}
                        </span>
                      ))}
                    </div>
                  )}
                  {appointment.notes && (
                    <p className="appointment-card__notes">{appointment.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="dashboard__empty-state">
            <p>No hay citas programadas para hoy</p>
          </div>
        )}
      </section>

      {/* Upcoming Appointments */}
      <section className="dashboard__section">
        <h2 className="dashboard__section-title">Próximas Citas</h2>
        {data.appointments.upcoming && data.appointments.upcoming.length > 0 ? (
          <div className="upcoming-appointments">
            <table className="appointments-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Paciente</th>
                  <th>Servicio</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.appointments.upcoming.map((appointment: any) => (
                  <tr key={appointment.id}>
                    <td>{formatDate(appointment.scheduledDate)}</td>
                    <td>{formatTime(appointment.scheduledDate)}</td>
                    <td>
                      {appointment.patient?.firstName} {appointment.patient?.lastName}
                    </td>
                    <td>
                      {appointment.appointmentServices?.[0]?.order?.service?.name || 'N/A'}
                    </td>
                    <td>
                      <span className={`status-badge status-badge--${appointment.status}`}>
                        {appointment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="dashboard__empty-state">
            <p>No hay citas próximas</p>
          </div>
        )}
      </section>

      {/* Top Performed Services */}
      {data.services.topPerformed && data.services.topPerformed.length > 0 && (
        <section className="dashboard__section">
          <h2 className="dashboard__section-title">Servicios Más Realizados (Último Mes)</h2>
          <div className="services-list">
            {data.services.topPerformed.map((service, index) => (
              <div key={service.serviceId} className="service-item">
                <div className="service-item__rank">#{index + 1}</div>
                <div className="service-item__info">
                  <div className="service-item__name">{service.name}</div>
                  <div className="service-item__count">{service.count} veces</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

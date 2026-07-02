import React from 'react';
import { CheckCircle, CalendarDays, CalendarRange, Activity, Star } from 'lucide-react';
import { MedicalDashboardData } from '../../types/dashboard.types';
import { StatCard } from './widgets/StatCard';

const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  reserved:    'Reservada',
  in_progress: 'En Atención',
  attended:    'Atendida',
  cancelled:   'Cancelada',
  no_show:     'No Asistió',
};

interface MedicalDashboardProps {
  data: MedicalDashboardData | null;
  isLoading: boolean;
}

export const MedicalDashboard: React.FC<MedicalDashboardProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  if (!data) {
    return <div className="dashboard-empty"><p>No hay datos disponibles</p></div>;
  }

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('es-PE', {
      weekday: 'short', month: 'short', day: 'numeric',
    });

  const getServices = (appointment: any): string[] =>
    appointment.appointmentServices
      ?.map((as: any) => as.serviceInstance?.service?.name)
      .filter(Boolean) || [];

  return (
    <div className="medical-dashboard">

      {/* Mis stats del día */}
      <section className="dashboard__section">
        <h2 className="dashboard__section-title">Mi día hoy</h2>
        <div className="stats-grid stats-grid--3">
          <StatCard
            title="Atendidos por mí hoy"
            value={data.today.attendedByMe}
            icon={<CheckCircle size={20} />}
            color="success"
            variant="solid"
          />
          <StatCard
            title="Pendientes en clínica"
            value={data.today.pendingToday.length}
            icon={<CalendarDays size={20} />}
            color="warning"
            variant="soft"
          />
          <StatCard
            title="Total agenda clínica"
            value={data.today.scheduledForClinic}
            icon={<Activity size={20} />}
            color="info"
            variant="soft"
          />
        </div>
      </section>

      {/* Citas pendientes hoy */}
      {data.today.pendingToday.length > 0 && (
        <section className="dashboard__section">
          <h2 className="dashboard__section-title">Pendientes de atención hoy</h2>
          <div className="appointments-list">
            {data.today.pendingToday.map((apt: any) => (
              <div key={apt.id} className="appointment-card">
                <div className="appointment-card__header">
                  <div className="appointment-card__time">{formatTime(apt.scheduledDate)}</div>
                  <div className={`appointment-card__status appointment-card__status--${apt.status}`}>
                    {APPOINTMENT_STATUS_LABELS[apt.status] ?? apt.status}
                  </div>
                </div>
                <div className="appointment-card__body">
                  <h3 className="appointment-card__patient">
                    {apt.patient?.firstName} {apt.patient?.lastName}
                  </h3>
                  {getServices(apt).length > 0 && (
                    <div className="appointment-card__services">
                      {getServices(apt).map((svc: string, i: number) => (
                        <span key={i} className="service-tag">{svc}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Mi rendimiento personal */}
      <section className="dashboard__section">
        <h2 className="dashboard__section-title">Mi rendimiento</h2>
        <div className="stats-grid stats-grid--2">
          <StatCard
            title="Atendidos esta semana"
            value={data.personal.attendedThisWeek}
            icon={<CalendarRange size={20} />}
            color="primary"
            variant="solid"
          />
          <StatCard
            title="Atendidos este mes"
            value={data.personal.attendedThisMonth}
            icon={<Activity size={20} />}
            color="success"
            variant="soft"
          />
        </div>

        {data.personal.myTopServices.length > 0 && (
          <div className="dashboard__card">
            <h3 className="dashboard__card-title">Mis procedimientos más realizados (último mes)</h3>
            <div className="services-list">
              {data.personal.myTopServices.map((svc, i) => (
                <div key={svc.serviceId} className="service-item">
                  <div className="service-item__rank">#{i + 1}</div>
                  <div className="service-item__info">
                    <div className="service-item__name">{svc.name}</div>
                    <div className="service-item__count">{svc.count} veces</div>
                  </div>
                  <Star size={14} style={{ color: 'var(--color-warning)', marginLeft: 'auto' }} />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Próximas citas de la clínica */}
      {data.upcoming.length > 0 && (
        <section className="dashboard__section">
          <h2 className="dashboard__section-title">Próximas citas en agenda</h2>
          <div className="dashboard__card">
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
                {data.upcoming.map((apt: any) => (
                  <tr key={apt.id}>
                    <td>{formatDate(apt.scheduledDate)}</td>
                    <td>{formatTime(apt.scheduledDate)}</td>
                    <td>{apt.patient?.firstName} {apt.patient?.lastName}</td>
                    <td>{getServices(apt)[0] || 'N/A'}</td>
                    <td>
                      <span className={`status-badge status-badge--${apt.status}`}>
                        {APPOINTMENT_STATUS_LABELS[apt.status] ?? apt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

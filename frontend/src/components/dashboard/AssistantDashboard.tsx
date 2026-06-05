import React from 'react';
import { Clock, CheckCircle, Activity, AlertCircle, Users, Zap } from 'lucide-react';
import { AssistantDashboardData } from '../../types/dashboard.types';
import { StatCard } from './widgets/StatCard';

const STATUS_LABELS: Record<string, string> = {
  reserved:    'En espera',
  in_progress: 'En atención',
  attended:    'Atendida',
  no_show:     'No llegó',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  reserved:    <Clock size={14} />,
  in_progress: <Activity size={14} />,
  attended:    <CheckCircle size={14} />,
  no_show:     <AlertCircle size={14} />,
};

interface AssistantDashboardProps {
  data: AssistantDashboardData | null;
  isLoading: boolean;
}

export const AssistantDashboard: React.FC<AssistantDashboardProps> = ({ data, isLoading }) => {
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

  const getInitials = (firstName: string, lastName: string) =>
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  return (
    <div className="assistant-dashboard">

      {/* KPIs del día */}
      <section className="dashboard__section">
        <h2 className="dashboard__section-title">Estado de hoy</h2>
        <div className="stats-grid stats-grid--4">
          <StatCard
            title="Atendidos"
            value={data.today.attended}
            icon={<CheckCircle size={20} />}
            color="success"
            variant="solid"
            subtitle={`${data.today.attendanceRate}% asistencia`}
          />
          <StatCard
            title="En atención"
            value={data.today.inProgress}
            icon={<Activity size={20} />}
            color="warning"
            variant={data.today.inProgress > 0 ? 'solid' : 'soft'}
          />
          <StatCard
            title="En espera"
            value={data.today.waiting}
            icon={<Clock size={20} />}
            color="info"
            variant="soft"
          />
          <StatCard
            title="No llegaron"
            value={data.today.noShow}
            icon={<AlertCircle size={20} />}
            color="error"
            variant="soft"
          />
        </div>
      </section>

      {/* Próximas — siguientes 2 horas */}
      {data.nextUp.length > 0 && (
        <section className="dashboard__section">
          <h2 className="dashboard__section-title">
            <Zap size={16} style={{ display: 'inline', marginRight: 6, color: 'var(--color-warning)' }} />
            Próximas 2 horas
          </h2>
          <div className="queue-next-up">
            {data.nextUp.map((apt) => (
              <div key={apt.id} className="queue-next-item">
                <div className="queue-next-item__time">
                  {formatTime(apt.scheduledDate)}
                  <span className="queue-next-item__minutes">en {apt.minutesUntil} min</span>
                </div>
                <div className="queue-next-item__avatar">
                  {getInitials(apt.patient.firstName, apt.patient.lastName)}
                </div>
                <div className="queue-next-item__info">
                  <div className="queue-next-item__name">
                    {apt.patient.firstName} {apt.patient.lastName}
                  </div>
                  <div className="queue-next-item__services">
                    {apt.services.join(' · ') || 'Sin servicio'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Cola completa del día */}
      <section className="dashboard__section">
        <h2 className="dashboard__section-title">
          Cola del día
          <span className="dashboard__section-badge">{data.today.total}</span>
        </h2>
        {data.queue.length > 0 ? (
          <div className="dashboard__card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="queue-list">
              {data.queue.map((item) => (
                <div
                  key={item.id}
                  className={`queue-item queue-item--${item.status}`}
                >
                  <div className="queue-item__time">{formatTime(item.scheduledDate)}</div>
                  <div className="queue-item__avatar">
                    {getInitials(item.patient.firstName, item.patient.lastName)}
                  </div>
                  <div className="queue-item__info">
                    <div className="queue-item__name">
                      {item.patient.firstName} {item.patient.lastName}
                    </div>
                    <div className="queue-item__services">
                      {item.services.join(' · ') || 'Sin servicio'}
                    </div>
                    {item.patient.phone && (
                      <div className="queue-item__phone">{item.patient.phone}</div>
                    )}
                  </div>
                  <div className="queue-item__meta">
                    <div className={`queue-item__status queue-item__status--${item.status}`}>
                      {STATUS_ICON[item.status]}
                      <span>{STATUS_LABELS[item.status] ?? item.status}</span>
                    </div>
                    <div className="queue-item__duration">{item.durationMinutes} min</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="dashboard__empty-state">
            <p>No hay citas programadas para hoy</p>
          </div>
        )}
      </section>

      {/* Resumen semanal */}
      <section className="dashboard__section">
        <h2 className="dashboard__section-title">Esta semana</h2>
        <div className="stats-grid stats-grid--4">
          <StatCard
            title="Total citas"
            value={data.week.total}
            icon={<Users size={20} />}
            color="primary"
            variant="soft"
          />
          <StatCard
            title="Atendidas"
            value={data.week.attended}
            icon={<CheckCircle size={20} />}
            color="success"
            variant="soft"
          />
          <StatCard
            title="No asistieron"
            value={data.week.noShow}
            icon={<AlertCircle size={20} />}
            color="error"
            variant="soft"
          />
          <StatCard
            title="Tasa de no-show"
            value={`${data.week.noShowRate}%`}
            icon={<Activity size={20} />}
            color={data.week.noShowRate > 20 ? 'error' : data.week.noShowRate > 10 ? 'warning' : 'success'}
            variant="soft"
          />
        </div>
      </section>
    </div>
  );
};

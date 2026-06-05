import React from 'react';
import {
  TrendingUp, Clock, CheckCircle, BarChart2,
  ShoppingBag, CreditCard, Users, AlertTriangle,
} from 'lucide-react';
import { SalesDashboardData } from '../../types/dashboard.types';
import { StatCard } from './widgets/StatCard';
import { RevenueChart } from './widgets/RevenueChart';

const COMMISSION_STATUS_LABELS: Record<string, string> = {
  pending:   'Pendiente',
  approved:  'Aprobada',
  paid:      'Pagada',
  cancelled: 'Cancelada',
  rejected:  'Rechazada',
};

const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  reserved:    'Reservada',
  in_progress: 'En Atención',
  attended:    'Atendida',
  cancelled:   'Cancelada',
  no_show:     'No Asistió',
};

interface SalesDashboardProps {
  data: SalesDashboardData | null;
  isLoading: boolean;
}

const computeRevenueTrend = (monthly: Array<{ month: string; amount: number }>) => {
  if (!monthly || monthly.length < 2) return undefined;
  const sorted = [...monthly].sort((a, b) => a.month.localeCompare(b.month));
  const current = sorted[sorted.length - 1].amount;
  const previous = sorted[sorted.length - 2].amount;
  if (previous === 0) return undefined;
  const change = Math.round(((current - previous) / previous) * 100);
  return { value: Math.abs(change), isPositive: change >= 0 };
};

export const SalesDashboard: React.FC<SalesDashboardProps> = ({ data, isLoading }) => {
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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 0,
    }).format(value);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('es-PE', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const revenueTrend = computeRevenueTrend(data.sales.monthlyRevenue);

  const goalBarColor =
    data.goals.percentage >= 100 ? 'var(--color-accent)' :
    data.goals.percentage >= 80  ? 'var(--color-success)' :
    data.goals.percentage >= 50  ? 'var(--color-info)' :
                                    'var(--color-warning)';

  return (
    <div className="sales-dashboard">

      {/* Sales Stats */}
      <section className="dashboard__section">
        <h2 className="dashboard__section-title">Mis Ventas</h2>
        <div className="stats-grid stats-grid--2">
          <StatCard
            title="Ingresos Totales"
            value={formatCurrency(data.sales.totalRevenue)}
            icon={<TrendingUp size={20} />}
            color="success"
            variant="solid"
            trend={revenueTrend}
          />
          <StatCard
            title="Total de Órdenes"
            value={data.sales.totalOrders}
            icon={<ShoppingBag size={20} />}
            color="primary"
            variant="soft"
          />
        </div>

        {data.sales.monthlyRevenue?.length > 0 && (
          <div className="dashboard__chart-container">
            <RevenueChart
              data={data.sales.monthlyRevenue}
              title="Mis Ingresos Mensuales"
              color="#BE185D"
            />
          </div>
        )}
      </section>

      {/* Goals */}
      <section className="dashboard__section">
        <h2 className="dashboard__section-title">Meta del Mes</h2>
        <div className="goal-card">
          <div className="goal-card__header">
            <div className="goal-card__info">
              <div className="goal-card__label">Meta Mensual</div>
              <div className="goal-card__amount">{formatCurrency(data.goals.monthly)}</div>
            </div>
            <div className="goal-card__percentage">
              {data.goals.percentage}%
              {data.goals.percentage >= 100 && (
                <span className="goal-card__badge">🎉</span>
              )}
            </div>
          </div>
          <div className="goal-card__progress">
            <div
              className="goal-card__progress-bar"
              style={{
                width: `${Math.min(data.goals.percentage, 100)}%`,
                backgroundColor: goalBarColor,
              }}
            />
          </div>
          <div className="goal-card__footer">
            <div className="goal-card__achieved">
              Logrado: {formatCurrency(data.goals.achieved)}
            </div>
            <div className="goal-card__remaining">
              {data.goals.percentage >= 100
                ? `¡Superado por ${formatCurrency(data.goals.achieved - data.goals.monthly)}!`
                : `Faltante: ${formatCurrency(data.goals.monthly - data.goals.achieved)}`}
            </div>
          </div>
        </div>
      </section>

      {/* Commissions Stats */}
      <section className="dashboard__section">
        <h2 className="dashboard__section-title">Mis Comisiones</h2>
        <div className="stats-grid stats-grid--4">
          <StatCard
            title="Total Ganado"
            value={formatCurrency(data.commissions.totalEarned)}
            icon={<BarChart2 size={20} />}
            color="primary"
            variant="solid"
          />
          <StatCard
            title="Pendientes"
            value={formatCurrency(data.commissions.pending)}
            icon={<Clock size={20} />}
            color="warning"
            variant="soft"
          />
          <StatCard
            title="Aprobadas"
            value={formatCurrency(data.commissions.approved)}
            icon={<CheckCircle size={20} />}
            color="info"
            variant="soft"
          />
          <StatCard
            title="Pagadas"
            value={formatCurrency(data.commissions.paid)}
            icon={<CreditCard size={20} />}
            color="success"
            variant="soft"
          />
        </div>

        {data.commissions.history?.length > 0 && (
          <div className="dashboard__card">
            <h3 className="dashboard__card-title">Historial de Comisiones Recientes</h3>
            <div className="commissions-table">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Servicio</th>
                    <th>Monto</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.commissions.history.map((commission: any) => (
                    <tr key={commission.id}>
                      <td>{formatDate(commission.createdAt)}</td>
                      <td>{commission.service?.name || 'N/A'}</td>
                      <td>{formatCurrency(commission.commissionAmount)}</td>
                      <td>
                        <span className={`status-badge status-badge--${commission.status}`}>
                          {COMMISSION_STATUS_LABELS[commission.status] ?? commission.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Today's attendance — ¿llegaron mis pacientes? */}
      {data.todayAttendance && (
        <section className="dashboard__section">
          <h2 className="dashboard__section-title">Mis citas de hoy — ¿llegaron?</h2>
          <div className="stats-grid stats-grid--3">
            <StatCard
              title="Llegaron"
              value={data.todayAttendance.arrived}
              icon={<CheckCircle size={20} />}
              color="success"
              variant={data.todayAttendance.arrived > 0 ? 'solid' : 'soft'}
            />
            <StatCard
              title="En espera"
              value={data.todayAttendance.waiting}
              icon={<Clock size={20} />}
              color="info"
              variant="soft"
            />
            <StatCard
              title="No llegaron"
              value={data.todayAttendance.noShow}
              icon={<AlertTriangle size={20} />}
              color={data.todayAttendance.noShow > 0 ? 'error' : 'success'}
              variant="soft"
            />
          </div>

          {data.todayAttendance.queue.length > 0 && (
            <div className="dashboard__card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="queue-list">
                {data.todayAttendance.queue.map((item) => (
                  <div key={item.id} className={`queue-item queue-item--${item.status}`}>
                    <div className="queue-item__time">{formatDate(item.scheduledDate)}</div>
                    <div className="queue-item__info">
                      <div className="queue-item__name">
                        {item.patient.firstName} {item.patient.lastName}
                      </div>
                      <div className="queue-item__services">
                        {item.services.join(' · ') || 'Sin servicio'}
                      </div>
                    </div>
                    <div className={`queue-item__status queue-item__status--${item.status}`}>
                      {APPOINTMENT_STATUS_LABELS[item.status] ?? item.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Patients */}
      <section className="dashboard__section">
        <h2 className="dashboard__section-title">Mis Pacientes</h2>
        <div className="stats-grid stats-grid--1">
          <StatCard
            title="Total de Pacientes Captados"
            value={data.patients.total}
            icon={<Users size={20} />}
            color="primary"
            variant="soft"
          />
        </div>

        {data.patients.recentAppointments?.length > 0 && (
          <div className="dashboard__card">
            <h3 className="dashboard__card-title">Citas Recientes de Mis Pacientes</h3>
            <div className="appointments-list-compact">
              {data.patients.recentAppointments.map((appointment: any) => (
                <div key={appointment.id} className="appointment-item-compact">
                  <div className="appointment-item-compact__date">
                    {formatDate(appointment.scheduledDate)}
                  </div>
                  <div className="appointment-item-compact__patient">
                    {appointment.patient?.firstName} {appointment.patient?.lastName}
                  </div>
                  <div className={`appointment-item-compact__status appointment-item-compact__status--${appointment.status}`}>
                    {APPOINTMENT_STATUS_LABELS[appointment.status] ?? appointment.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

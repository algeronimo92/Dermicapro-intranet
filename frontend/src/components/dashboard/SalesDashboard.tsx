import React from 'react';
import { SalesDashboardData } from '../../types/dashboard.types';
import { StatCard } from './widgets/StatCard';
import { RevenueChart } from './widgets/RevenueChart';

interface SalesDashboardProps {
  data: SalesDashboardData | null;
  isLoading: boolean;
}

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="sales-dashboard">
      <h1 className="dashboard__title">Dashboard de Ventas</h1>

      {/* Sales Stats */}
      <section className="dashboard__section">
        <h2 className="dashboard__section-title">Mis Ventas</h2>
        <div className="stats-grid stats-grid--2">
          <StatCard
            title="Total de Órdenes"
            value={data.sales.totalOrders}
            icon="🛍️"
            color="primary"
          />
          <StatCard
            title="Ingresos Totales"
            value={formatCurrency(data.sales.totalRevenue)}
            icon="💰"
            color="success"
          />
        </div>

        {/* Revenue Chart */}
        {data.sales.monthlyRevenue && data.sales.monthlyRevenue.length > 0 && (
          <div className="dashboard__chart-container">
            <RevenueChart
              data={data.sales.monthlyRevenue}
              title="Mis Ingresos Mensuales"
              color="#6366f1"
            />
          </div>
        )}
      </section>

      {/* Commissions Stats */}
      <section className="dashboard__section">
        <h2 className="dashboard__section-title">Mis Comisiones</h2>
        <div className="stats-grid stats-grid--4">
          <StatCard
            title="Pendientes"
            value={formatCurrency(data.commissions.pending)}
            icon="⏳"
            color="warning"
          />
          <StatCard
            title="Aprobadas"
            value={formatCurrency(data.commissions.approved)}
            icon="✓"
            color="info"
          />
          <StatCard
            title="Pagadas"
            value={formatCurrency(data.commissions.paid)}
            icon="💸"
            color="success"
          />
          <StatCard
            title="Total Ganado"
            value={formatCurrency(data.commissions.totalEarned)}
            icon="📊"
            color="primary"
          />
        </div>

        {/* Commission History */}
        {data.commissions.history && data.commissions.history.length > 0 && (
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
                          {commission.status}
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
            </div>
          </div>
          <div className="goal-card__progress">
            <div
              className="goal-card__progress-bar"
              style={{ width: `${Math.min(data.goals.percentage, 100)}%` }}
            />
          </div>
          <div className="goal-card__footer">
            <div className="goal-card__achieved">
              Logrado: {formatCurrency(data.goals.achieved)}
            </div>
            <div className="goal-card__remaining">
              Faltante: {formatCurrency(Math.max(0, data.goals.monthly - data.goals.achieved))}
            </div>
          </div>
        </div>
      </section>

      {/* Patients */}
      <section className="dashboard__section">
        <h2 className="dashboard__section-title">Mis Pacientes</h2>
        <div className="stats-grid stats-grid--1">
          <StatCard
            title="Total de Pacientes Captados"
            value={data.patients.total}
            icon="👥"
            color="primary"
          />
        </div>

        {/* Recent Appointments */}
        {data.patients.recentAppointments && data.patients.recentAppointments.length > 0 && (
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
                    {appointment.status}
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

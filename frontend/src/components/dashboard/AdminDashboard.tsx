import React from 'react';
import { AdminDashboardData } from '../../types/dashboard.types';
import { StatCard } from './widgets/StatCard';
import { RevenueChart } from './widgets/RevenueChart';

const STATUS_LABELS: Record<string, string> = {
  reserved:    'Reservada',
  in_progress: 'En Atención',
  attended:    'Atendida',
  cancelled:   'Cancelada',
  no_show:     'No Asistió',
};

interface AdminDashboardProps {
  data: AdminDashboardData | null;
  isLoading: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ data, isLoading }) => {
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

  return (
    <div className="admin-dashboard">
      <h1 className="dashboard__title">Dashboard Administrativo</h1>

      {/* Financial Stats */}
      <section className="dashboard__section">
        <h2 className="dashboard__section-title">Finanzas</h2>
        <div className="stats-grid stats-grid--4">
          <StatCard
            title="Ingresos Totales"
            value={formatCurrency(data.financials.totalRevenue)}
            icon="💰"
            color="success"
          />
          <StatCard
            title="Pendiente"
            value={formatCurrency(data.financials.pendingRevenue)}
            icon="⏳"
            color="warning"
          />
          <StatCard
            title="Pagado"
            value={formatCurrency(data.financials.paidRevenue)}
            icon="✅"
            color="primary"
          />
          <StatCard
            title="Tasa de Pago"
            value={`${data.financials.totalRevenue > 0
              ? Math.round((data.financials.paidRevenue / data.financials.totalRevenue) * 100)
              : 0}%`}
            icon="📊"
            color="info"
          />
        </div>

        {/* Revenue Chart */}
        {data.financials.monthlyRevenue && data.financials.monthlyRevenue.length > 0 && (
          <div className="dashboard__chart-container">
            <RevenueChart
              data={data.financials.monthlyRevenue}
              title="Tendencia de Ingresos (Últimos 6 meses)"
              color="#10b981"
            />
          </div>
        )}
      </section>

      {/* Appointments Stats */}
      <section className="dashboard__section">
        <h2 className="dashboard__section-title">Citas</h2>
        <div className="stats-grid stats-grid--3">
          <StatCard
            title="Total de Citas"
            value={data.appointments.total}
            icon="📅"
            color="primary"
          />
          <StatCard
            title="Citas Hoy"
            value={data.appointments.today}
            icon="🗓️"
            color="info"
          />
          <StatCard
            title="Esta Semana"
            value={data.appointments.thisWeek}
            icon="📆"
            color="success"
          />
        </div>

        {/* Appointments by Status */}
        {data.appointments.byStatus && data.appointments.byStatus.length > 0 && (
          <div className="dashboard__card">
            <h3 className="dashboard__card-title">Estado de Citas</h3>
            <div className="status-list">
              {data.appointments.byStatus.map((statusItem) => (
                <div key={statusItem.status} className="status-item">
                  <span className="status-item__label">
                    {STATUS_LABELS[statusItem.status] ?? statusItem.status}
                  </span>
                  <span className="status-item__value">{statusItem.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Sales Stats */}
      <section className="dashboard__section">
        <h2 className="dashboard__section-title">Ventas</h2>
        <div className="stats-grid stats-grid--2">
          <StatCard
            title="Servicios Vendidos"
            value={data.sales.totalOrders}
            icon="🛍️"
            color="primary"
          />
          <StatCard
            title="Valor Total"
            value={formatCurrency(data.sales.totalOrdersValue)}
            icon="💵"
            color="success"
          />
        </div>

        {/* Top Services */}
        {data.sales.topServices && data.sales.topServices.length > 0 && (
          <div className="dashboard__card">
            <h3 className="dashboard__card-title">Servicios Más Vendidos</h3>
            <div className="services-table">
              <table>
                <thead>
                  <tr>
                    <th>Servicio</th>
                    <th>Cantidad</th>
                    <th>Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sales.topServices.map((service) => (
                    <tr key={service.serviceTemplateId}>
                      <td>{service.name}</td>
                      <td>{service.count}</td>
                      <td>{formatCurrency(service.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Commissions Stats */}
      <section className="dashboard__section">
        <h2 className="dashboard__section-title">Comisiones</h2>
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
            title="Total"
            value={formatCurrency(data.commissions.totalAmount)}
            icon="📊"
            color="primary"
          />
        </div>
      </section>
    </div>
  );
};

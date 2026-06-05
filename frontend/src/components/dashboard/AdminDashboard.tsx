import React from 'react';
import {
  TrendingUp, Clock, CheckCircle, BarChart2,
  Calendar, CalendarDays, CalendarRange,
  ShoppingBag, Banknote, CreditCard, Users,
} from 'lucide-react';
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

const STATUS_COLORS: Record<string, string> = {
  reserved:    'var(--color-status-scheduled)',
  in_progress: 'var(--color-status-in-progress)',
  attended:    'var(--color-status-completed)',
  cancelled:   'var(--color-status-cancelled)',
  no_show:     'var(--color-status-no-show)',
};

interface AdminDashboardProps {
  data: AdminDashboardData | null;
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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 0,
    }).format(value);

  const revenueTrend = computeRevenueTrend(data.financials.monthlyRevenue);

  const totalAppointments = data.appointments.byStatus.reduce((s, i) => s + i.count, 0);

  return (
    <div className="admin-dashboard">

      {/* Financial Stats */}
      <section className="dashboard__section">
        <h2 className="dashboard__section-title">Finanzas</h2>
        <div className="stats-grid stats-grid--4">
          <StatCard
            title="Ingresos Totales"
            value={formatCurrency(data.financials.totalRevenue)}
            icon={<TrendingUp size={20} />}
            color="success"
            variant="solid"
            trend={revenueTrend}
          />
          <StatCard
            title="Pendiente"
            value={formatCurrency(data.financials.pendingRevenue)}
            icon={<Clock size={20} />}
            color="warning"
            variant="soft"
          />
          <StatCard
            title="Pagado"
            value={formatCurrency(data.financials.paidRevenue)}
            icon={<CheckCircle size={20} />}
            color="primary"
            variant="soft"
          />
          <StatCard
            title="Tasa de Pago"
            value={`${data.financials.totalRevenue > 0
              ? Math.round((data.financials.paidRevenue / data.financials.totalRevenue) * 100)
              : 0}%`}
            icon={<BarChart2 size={20} />}
            color="info"
            variant="soft"
          />
        </div>

        {data.financials.monthlyRevenue?.length > 0 && (
          <div className="dashboard__chart-container">
            <RevenueChart
              data={data.financials.monthlyRevenue}
              title="Tendencia de Ingresos (Últimos 6 meses)"
              color="#0F766E"
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
            icon={<Calendar size={20} />}
            color="primary"
            variant="solid"
          />
          <StatCard
            title="Citas Hoy"
            value={data.appointments.today}
            icon={<CalendarDays size={20} />}
            color="info"
            variant="soft"
          />
          <StatCard
            title="Esta Semana"
            value={data.appointments.thisWeek}
            icon={<CalendarRange size={20} />}
            color="success"
            variant="soft"
          />
        </div>

        {data.appointments.byStatus?.length > 0 && (
          <div className="dashboard__card">
            <h3 className="dashboard__card-title">Estado de Citas</h3>
            <div className="status-list">
              {data.appointments.byStatus.map((item) => {
                const pct = totalAppointments > 0
                  ? Math.round((item.count / totalAppointments) * 100)
                  : 0;
                return (
                  <div key={item.status} className="status-item">
                    <span
                      className="status-item__dot"
                      style={{ backgroundColor: STATUS_COLORS[item.status] ?? 'var(--color-text-tertiary)' }}
                    />
                    <span className="status-item__label">
                      {STATUS_LABELS[item.status] ?? item.status}
                    </span>
                    <div className="status-item__bar-track">
                      <div
                        className="status-item__bar-fill"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: STATUS_COLORS[item.status] ?? 'var(--color-text-tertiary)',
                        }}
                      />
                    </div>
                    <span className="status-item__count">{item.count}</span>
                    <span className="status-item__pct">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Sales Stats */}
      <section className="dashboard__section">
        <h2 className="dashboard__section-title">Ventas</h2>
        <div className="stats-grid stats-grid--2">
          <StatCard
            title="Valor Total"
            value={formatCurrency(data.sales.totalOrdersValue)}
            icon={<Banknote size={20} />}
            color="success"
            variant="solid"
          />
          <StatCard
            title="Servicios Vendidos"
            value={data.sales.totalOrders}
            icon={<ShoppingBag size={20} />}
            color="primary"
            variant="soft"
          />
        </div>

        {data.sales.topServices?.length > 0 && (
          <div className="dashboard__card">
            <h3 className="dashboard__card-title">Servicios Más Vendidos</h3>
            <div className="services-list">
              {data.sales.topServices.map((service, index) => (
                <div key={service.serviceTemplateId} className="service-item">
                  <div className="service-item__rank">#{index + 1}</div>
                  <div className="service-item__info">
                    <div className="service-item__name">{service.name}</div>
                    <div className="service-item__count">{service.count} sesiones</div>
                  </div>
                  <div className="service-item__revenue">
                    {formatCurrency(service.revenue)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Commissions Stats */}
      <section className="dashboard__section">
        <h2 className="dashboard__section-title">Comisiones</h2>
        <div className="stats-grid stats-grid--4">
          <StatCard
            title="Total Comisiones"
            value={formatCurrency(data.commissions.totalAmount)}
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
            icon={<Users size={20} />}
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
      </section>
    </div>
  );
};

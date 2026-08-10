import React from 'react';
import {
  TrendingUp, Clock, CheckCircle, BarChart2,
  Calendar, CalendarDays, CalendarRange,
  ShoppingBag, Banknote, CreditCard, Users,
  Activity, Gauge,
} from 'lucide-react';
import { AdminDashboardData } from '../../types/dashboard.types';
import { StatCard } from './widgets/StatCard';
import { RevenueChart } from './widgets/RevenueChart';
import { PieChartWidget } from './widgets/PieChartWidget';
import { NewPatientsChart } from './widgets/NewPatientsChart';
import { ActivityChart } from './widgets/ActivityChart';

const STATUS_LABELS: Record<string, string> = {
  reserved:    'Reservada',
  in_progress: 'En Atención',
  attended:    'Atendida',
  cancelled:   'Cancelada',
  no_show:     'No Asistió',
};

const STATUS_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#6b7280'];
const STATUS_ORDER  = ['reserved', 'in_progress', 'attended', 'cancelled', 'no_show'];

const SERVICE_COLORS  = ['#0F766E', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6'];
const PAYMENT_COLORS  = ['#10b981', '#6366f1', '#3b82f6', '#8b5cf6', '#06b6d4'];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash:     'Efectivo',
  card:     'Tarjeta',
  transfer: 'Transferencia',
  yape:     'Yape',
  plin:     'Plin',
};

const MONTH_NAMES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** Parsea YYYY-MM-DD al mediodía local: evita que la zona horaria corra el día */
const parseDateKey = (key: string) => new Date(`${key}T12:00:00`);

const formatDayTick = (key: string) => {
  const date = parseDateKey(key);
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
};

const formatDayLabel = (key: string) => {
  const date = parseDateKey(key);
  return `${DAY_NAMES[date.getDay()]} ${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
};

const formatWeekTick = (key: string) => formatDayTick(key);

const formatWeekLabel = (key: string) => {
  const start = parseDateKey(key);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `Semana ${start.getDate()} ${MONTH_NAMES[start.getMonth()]} – ${end.getDate()} ${MONTH_NAMES[end.getMonth()]}`;
};

/** Eje Y de soles: abrevia los miles para que las marcas no se solapen */
const formatSolesTick = (value: number) =>
  Math.abs(value) >= 1000 ? `S/${Math.round(value / 1000)}k` : `S/${value}`;

const ACTIVITY_COLORS = {
  sold:      '#0F766E',
  collected: '#10b981',
  scheduled: '#3b82f6',
  attended:  '#8b5cf6',
};

interface AdminDashboardProps {
  data: AdminDashboardData | null;
  isLoading: boolean;
}

const computeRevenueTrend = (monthly: Array<{ month: string; amount: number }>) => {
  if (!monthly || monthly.length < 2) return undefined;
  const sorted = [...monthly].sort((a, b) => a.month.localeCompare(b.month));
  const current  = sorted[sorted.length - 1].amount;
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

  // Puede faltar si el backend aún no expone la sección de ritmo
  const activity = data.activity;

  // Pie: citas por estado (orden fijo)
  const appointmentStatusPieData = STATUS_ORDER
    .map((status, i) => {
      const found = data.appointments.byStatus.find((s) => s.status === status);
      return found
        ? { name: STATUS_LABELS[status] ?? status, value: found.count, color: STATUS_COLORS[i] }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null && x.value > 0);

  // Pie: top servicios por revenue
  const topServicesPieData = data.sales.topServices.map((s) => ({
    name: s.name,
    value: s.revenue,
  }));

  // Pie: ingresos por método de pago
  const paymentMethodPieData = (data.financials.paymentsByMethod ?? []).map((p) => ({
    name: PAYMENT_METHOD_LABELS[p.method] ?? p.method,
    value: p.amount,
  }));

  return (
    <div className="admin-dashboard">

      {/* ── Finanzas ── */}
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

        {/* Tendencia ingresos + Métodos de pago */}
        <div className={`dashboard__charts-row${paymentMethodPieData.length === 0 ? ' dashboard__charts-row--full' : ''}`}>
          <RevenueChart
            data={data.financials.monthlyRevenue}
            title="Tendencia de Ingresos"
            color="#0F766E"
            height={260}
          />
          {paymentMethodPieData.length > 0 && (
            <div className="dashboard__card dashboard__card--no-margin">
              <PieChartWidget
                data={paymentMethodPieData}
                title="Ingresos por Método de Pago"
                colors={PAYMENT_COLORS}
                formatter={formatCurrency}
                height={220}
              />
            </div>
          )}
        </div>
      </section>

      {/* ── Ritmo diario y semanal ── */}
      {activity && (
        <section className="dashboard__section">
          <h2 className="dashboard__section-title">Ritmo Diario y Semanal</h2>

          <div className="stats-grid stats-grid--4">
            <StatCard
              title="Ventas de Hoy"
              value={formatCurrency(activity.summary.todaySold)}
              subtitle={`Cobrado hoy: ${formatCurrency(activity.summary.todayCollected)}`}
              icon={<Activity size={20} />}
              color="success"
              variant="solid"
            />
            <StatCard
              title="Ventas de la Semana"
              value={formatCurrency(activity.summary.weekSold)}
              subtitle={`Cobrado: ${formatCurrency(activity.summary.weekCollected)}`}
              icon={<CalendarRange size={20} />}
              color="primary"
              variant="soft"
            />
            <StatCard
              title="Promedio Diario"
              value={formatCurrency(activity.summary.avgDailySold)}
              subtitle={`Últimos ${activity.summary.periodDays} días`}
              icon={<BarChart2 size={20} />}
              color="info"
              variant="soft"
            />
            <StatCard
              title="Tasa de Asistencia"
              value={`${activity.summary.attendanceRate}%`}
              subtitle={`${activity.summary.avgDailyAttended} citas atendidas/día`}
              icon={<Gauge size={20} />}
              color="warning"
              variant="soft"
            />
          </div>

          <div className="dashboard__card dashboard__card--no-margin">
            <ActivityChart
              data={activity.daily}
              xKey="date"
              title="Ventas por Día"
              subtitle={`Servicios vendidos vs. dinero cobrado — últimos ${activity.summary.dailyRangeDays} días`}
              series={[
                { key: 'sold',      name: 'Vendido', color: ACTIVITY_COLORS.sold },
                { key: 'collected', name: 'Cobrado', color: ACTIVITY_COLORS.collected },
              ]}
              xTickFormatter={formatDayTick}
              xLabelFormatter={formatDayLabel}
              formatLeft={formatCurrency}
              tickFormatLeft={formatSolesTick}
              height={260}
            />
          </div>

          <div className="dashboard__card">
            <ActivityChart
              data={activity.weekly}
              xKey="weekStart"
              title="Ventas por Semana"
              subtitle="Semanas de lunes a domingo"
              series={[
                { key: 'sold',      name: 'Vendido', color: ACTIVITY_COLORS.sold },
                { key: 'collected', name: 'Cobrado', color: ACTIVITY_COLORS.collected },
              ]}
              xTickFormatter={formatWeekTick}
              xLabelFormatter={formatWeekLabel}
              formatLeft={formatCurrency}
              tickFormatLeft={formatSolesTick}
              height={240}
            />
          </div>

          <div className="dashboard__card">
            <ActivityChart
              data={activity.daily}
              xKey="date"
              title="Citas por Día: Agendadas vs. Atendidas"
              subtitle={`Hoy: ${activity.summary.todayScheduled} agendadas, ${activity.summary.todayAttended} atendidas — no incluye canceladas`}
              series={[
                { key: 'scheduled', name: 'Agendadas', color: ACTIVITY_COLORS.scheduled },
                { key: 'attended',  name: 'Atendidas', color: ACTIVITY_COLORS.attended },
              ]}
              xTickFormatter={formatDayTick}
              xLabelFormatter={formatDayLabel}
              height={240}
            />
          </div>

          <div className="dashboard__card">
            <ActivityChart
              data={activity.byWeekday}
              xKey="label"
              title="Patrón por Día de la Semana"
              subtitle={
                activity.summary.bestWeekday
                  ? `Promedio por día en los últimos ${activity.summary.periodDays} días — mejor día de venta: ${activity.summary.bestWeekday}`
                  : `Promedio por día en los últimos ${activity.summary.periodDays} días`
              }
              series={[
                { key: 'avgScheduled', name: 'Citas agendadas (prom.)', color: ACTIVITY_COLORS.scheduled },
                { key: 'avgAttended',  name: 'Citas atendidas (prom.)', color: ACTIVITY_COLORS.attended },
                { key: 'avgSold',      name: 'Venta (prom.)', color: ACTIVITY_COLORS.sold, type: 'line', axis: 'right' },
              ]}
              formatRight={formatCurrency}
              tickFormatRight={formatSolesTick}
              height={260}
            />
          </div>
        </section>
      )}

      {/* ── Citas ── */}
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

        {appointmentStatusPieData.length > 0 && (
          <div className="dashboard__card dashboard__card--centered dashboard__card--no-margin">
            <PieChartWidget
              data={appointmentStatusPieData}
              title="Distribución de Citas por Estado"
              colors={appointmentStatusPieData.map((d) => d.color)}
              donut
              height={280}
            />
          </div>
        )}
      </section>

      {/* ── Pacientes ── */}
      <section className="dashboard__section">
        <h2 className="dashboard__section-title">Pacientes</h2>
        {/* NewPatientsChart ya tiene estilos de card y KPI header integrados */}
        <NewPatientsChart
          data={data.patients?.byPeriod ?? []}
          granularity={data.patients?.granularity ?? 'day'}
          total={data.patients?.total ?? 0}
          color="#6366f1"
          height={240}
        />
      </section>

      {/* ── Ventas ── */}
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

        {topServicesPieData.length > 0 && (
          <div className="dashboard__card dashboard__card--centered dashboard__card--no-margin">
            <PieChartWidget
              data={topServicesPieData}
              title="Servicios Más Vendidos"
              colors={SERVICE_COLORS}
              formatter={formatCurrency}
              height={280}
            />
          </div>
        )}
      </section>

      {/* ── Comisiones ── */}
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
            value={data.commissions.pending}
            icon={<Clock size={20} />}
            color="warning"
            variant="soft"
          />
          <StatCard
            title="Aprobadas"
            value={data.commissions.approved}
            icon={<Users size={20} />}
            color="info"
            variant="soft"
          />
          <StatCard
            title="Pagadas"
            value={data.commissions.paid}
            icon={<CreditCard size={20} />}
            color="success"
            variant="soft"
          />
        </div>
      </section>
    </div>
  );
};

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Tenant, TenantMetrics } from '../../services/platformAdminApi';

interface Row { tenant: Tenant; metrics: TenantMetrics | null; }
interface Props { rows: Row[]; }

export function TenantMetricsChart({ rows }: Props) {
  const data = rows.map(({ tenant, metrics }) => ({
    name: tenant.name,
    Pacientes: metrics?.totalPatients ?? 0,
    'Citas (mes)': metrics?.totalAppointmentsMonth ?? 0,
    'Usuarios activos': metrics?.activeUsers ?? 0,
  }));

  if (data.length === 0) return null;

  return (
    <div className="superadmin-panel" style={{ padding: 'var(--spacing-lg)' }}>
      <div className="superadmin-panel__header" style={{ border: 'none', padding: '0 0 var(--spacing-md)' }}>
        <h2>Comparativa entre clínicas</h2>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-secondary)" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
          <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border-secondary)',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Bar dataKey="Pacientes" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Citas (mes)" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Usuarios activos" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

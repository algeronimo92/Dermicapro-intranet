import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getPlatformApiError, platformAdminApi, Tenant, TenantMetrics } from '../../services/platformAdminApi';
import { TenantMetricsChart } from '../../components/superadmin/TenantMetricsChart';

const formatNumber = (value: number) => new Intl.NumberFormat('es-PE').format(value);

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'Sin registro';
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
};

export const SuperAdminDashboardPage: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [metricsByTenant, setMetricsByTenant] = useState<Record<string, TenantMetrics | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const tenantList = await platformAdminApi.listTenants();
      setTenants(tenantList);
      const entries = await Promise.all(
        tenantList.map(async (tenant) => {
          let metrics = await platformAdminApi.getTenantMetrics(tenant.slug);
          if (!metrics) {
            metrics = await platformAdminApi.refreshTenantMetrics(tenant.slug).catch(() => null);
          }
          return [tenant.slug, metrics] as const;
        }),
      );
      setMetricsByTenant(Object.fromEntries(entries));
    } catch (err) {
      setError(getPlatformApiError(err, 'No se pudo cargar el dashboard'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const summary = useMemo(() => {
    const metrics = Object.values(metricsByTenant).filter(Boolean) as TenantMetrics[];
    const lastAccess = metrics
      .map((m) => m.lastAccess)
      .filter(Boolean)
      .sort((a, b) => new Date(b as string).getTime() - new Date(a as string).getTime())[0];
    return {
      activeTenants: tenants.filter((t) => t.isActive).length,
      totalPatients: metrics.reduce((s, m) => s + m.totalPatients, 0),
      appointmentsMonth: metrics.reduce((s, m) => s + m.totalAppointmentsMonth, 0),
      lastAccess,
    };
  }, [tenants, metricsByTenant]);

  const rows = useMemo(
    () => tenants.map((t) => ({ tenant: t, metrics: metricsByTenant[t.slug] ?? null })),
    [tenants, metricsByTenant],
  );

  return (
    <div className="superadmin-page">
      <header className="superadmin-page__header">
        <div>
          <h1>Dashboard</h1>
          <p>Métricas globales de clínicas, pacientes y actividad reciente.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={load} disabled={isLoading}>
          <RefreshCw size={17} />
          Actualizar
        </button>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <section className="superadmin-grid">
        <article className="superadmin-card">
          <p className="superadmin-card__label">Clínicas activas</p>
          <div className="superadmin-card__value">{formatNumber(summary.activeTenants)}</div>
        </article>
        <article className="superadmin-card">
          <p className="superadmin-card__label">Total pacientes</p>
          <div className="superadmin-card__value">{formatNumber(summary.totalPatients)}</div>
        </article>
        <article className="superadmin-card">
          <p className="superadmin-card__label">Citas este mes</p>
          <div className="superadmin-card__value">{formatNumber(summary.appointmentsMonth)}</div>
        </article>
        <article className="superadmin-card">
          <p className="superadmin-card__label">Último acceso</p>
          <div className="superadmin-card__value" style={{ fontSize: 'var(--font-size-lg)' }}>{formatDate(summary.lastAccess)}</div>
        </article>
      </section>

      <section className="superadmin-panel">
        <div className="superadmin-panel__header">
          <h2>Resumen de clínicas</h2>
        </div>
        {isLoading ? (
          <div className="superadmin-loading">
            <div className="loading-spinner" />
            Cargando métricas...
          </div>
        ) : (
          <div className="table-container" style={{ borderRadius: 0, border: 'none', boxShadow: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Slug</th>
                  <th>Estado</th>
                  <th>Pacientes</th>
                  <th>Citas/mes</th>
                  <th>Último acceso</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => {
                  const metrics = metricsByTenant[tenant.slug];
                  return (
                    <tr key={tenant.id}>
                      <td>
                        <Link to={`/superadmin/tenants/${tenant.slug}`} style={{ color: 'var(--color-primary)', fontWeight: 'var(--font-weight-semibold)', textDecoration: 'none' }}>
                          {tenant.name}
                        </Link>
                      </td>
                      <td style={{ fontFamily: 'var(--font-family-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>{tenant.slug}</td>
                      <td>
                        <span className={`badge ${tenant.isActive ? 'badge-success' : 'badge-error'}`}>
                          {tenant.isActive ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td>{metrics ? formatNumber(metrics.totalPatients) : '—'}</td>
                      <td>{metrics ? formatNumber(metrics.totalAppointmentsMonth) : '—'}</td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{formatDate(metrics?.lastAccess)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {!isLoading && rows.length > 1 && <TenantMetricsChart rows={rows} />}
    </div>
  );
};

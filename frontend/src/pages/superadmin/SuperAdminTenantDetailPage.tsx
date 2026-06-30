import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Power, RefreshCw } from 'lucide-react';
import { getPlatformApiError, platformAdminApi, Tenant, TenantMetrics, TenantMigration } from '../../services/platformAdminApi';

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'Sin registro';
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
};

const formatNumber = (value: number | undefined) =>
  new Intl.NumberFormat('es-PE').format(value ?? 0);

export const SuperAdminTenantDetailPage: React.FC = () => {
  const { slug = '' } = useParams();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [metrics, setMetrics] = useState<TenantMetrics | null>(null);
  const [migrations, setMigrations] = useState<TenantMigration[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'migrations'>('info');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingMetrics, setIsRefreshingMetrics] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [tenantData, metricsData, migrationsData] = await Promise.all([
        platformAdminApi.getTenant(slug),
        platformAdminApi.refreshTenantMetrics(slug).catch(() => null),
        platformAdminApi.getTenantMigrations(slug),
      ]);
      setTenant(tenantData);
      setMetrics(metricsData);
      setMigrations(migrationsData);
    } catch (err) {
      setError(getPlatformApiError(err, 'No se pudo cargar el detalle de la clínica'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [slug]);

  const refreshMetrics = async () => {
    setIsRefreshingMetrics(true);
    setError('');
    try {
      setMetrics(await platformAdminApi.refreshTenantMetrics(slug));
    } catch (err) {
      setError(getPlatformApiError(err, 'No se pudieron refrescar las métricas'));
    } finally {
      setIsRefreshingMetrics(false);
    }
  };

  const toggleActive = async () => {
    if (!tenant) return;
    const action = tenant.isActive ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Deseas ${action} ${tenant.name}?`)) return;
    setIsToggling(true);
    setError('');
    try {
      const updated = tenant.isActive
        ? await platformAdminApi.deactivateTenant(tenant.slug)
        : await platformAdminApi.activateTenant(tenant.slug);
      setTenant(updated);
    } catch (err) {
      setError(getPlatformApiError(err, `No se pudo ${action} la clínica`));
    } finally {
      setIsToggling(false);
    }
  };

  const handleImpersonate = async () => {
    if (!tenant) return;
    setIsImpersonating(true);
    try {
      const { loginUrl } = await platformAdminApi.impersonateTenant(tenant.slug);
      window.open(loginUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(getPlatformApiError(err, 'No se pudo generar sesion de impersonacion'));
    } finally {
      setIsImpersonating(false);
    }
  };

  const failedMigrations = migrations.filter((m) => m.status === 'failed');

  if (isLoading) {
    return (
      <div className="superadmin-loading">
        <div className="loading-spinner" />
        Cargando detalle...
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="superadmin-page">
        {error && <div className="alert alert-error">{error}</div>}
        <Link to="/superadmin/tenants" className="btn btn-secondary">
          <ArrowLeft size={17} /> Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="superadmin-page">
      <header className="superadmin-page__header">
        <div>
          <Link to="/superadmin/tenants" className="btn btn-secondary btn-sm" style={{ marginBottom: 'var(--spacing-md)', display: 'inline-flex' }}>
            <ArrowLeft size={16} /> Clínicas
          </Link>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
            {tenant.name}
            <span className={`badge ${tenant.isActive ? 'badge-success' : 'badge-error'}`}>
              {tenant.isActive ? 'Activa' : 'Inactiva'}
            </span>
          </h1>
          <p style={{ fontFamily: 'var(--font-family-mono)', fontSize: 'var(--font-size-sm)' }}>{tenant.slug}</p>
        </div>
        <div className="superadmin-actions">
          <button type="button" className="btn btn-secondary" onClick={handleImpersonate} disabled={isImpersonating || !tenant?.isActive}>
            <ExternalLink size={17} />
            {isImpersonating ? 'Abriendo...' : 'Acceder como admin'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={toggleActive} disabled={isToggling}>
            <Power size={17} />
            {tenant.isActive ? 'Desactivar' : 'Activar'}
          </button>
          <button type="button" className="btn btn-primary" onClick={refreshMetrics} disabled={isRefreshingMetrics}>
            <RefreshCw size={17} />
            Refrescar métricas
          </button>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <section className="superadmin-panel">
        <div className="superadmin-tabs">
          <button type="button" className={`superadmin-tab ${activeTab === 'info' ? 'superadmin-tab--active' : ''}`} onClick={() => setActiveTab('info')}>
            Información
          </button>
          <button type="button" className={`superadmin-tab ${activeTab === 'migrations' ? 'superadmin-tab--active' : ''}`} onClick={() => setActiveTab('migrations')}>
            Migraciones
            {failedMigrations.length > 0 && (
              <span className="badge badge-error" style={{ marginLeft: 'var(--spacing-xs)' }}>
                {failedMigrations.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'info' && (
          <>
            <div className="superadmin-detail-grid">
              <div className="superadmin-detail-item">
                <span>Estado</span>
                <strong>{tenant.isActive ? 'Activa' : 'Inactiva'}</strong>
              </div>
              <div className="superadmin-detail-item">
                <span>Email contacto</span>
                <strong>{tenant.contactEmail || '—'}</strong>
              </div>
              <div className="superadmin-detail-item">
                <span>Teléfono</span>
                <strong>{tenant.contactPhone || '—'}</strong>
              </div>
              <div className="superadmin-detail-item">
                <span>Fecha creación</span>
                <strong>{formatDate(tenant.createdAt)}</strong>
              </div>
            </div>
            <div className="superadmin-grid" style={{ padding: 'var(--spacing-lg) var(--spacing-xl)' }}>
              <article className="superadmin-card">
                <p className="superadmin-card__label">Pacientes</p>
                <div className="superadmin-card__value">{formatNumber(metrics?.totalPatients)}</div>
              </article>
              <article className="superadmin-card">
                <p className="superadmin-card__label">Citas del mes</p>
                <div className="superadmin-card__value">{formatNumber(metrics?.totalAppointmentsMonth)}</div>
              </article>
              <article className="superadmin-card">
                <p className="superadmin-card__label">Usuarios activos</p>
                <div className="superadmin-card__value">{formatNumber(metrics?.activeUsers)}</div>
              </article>
              <article className="superadmin-card">
                <p className="superadmin-card__label">Último acceso</p>
                <div className="superadmin-card__value" style={{ fontSize: 'var(--font-size-lg)' }}>
                  {formatDate(metrics?.lastAccess)}
                </div>
              </article>
            </div>
          </>
        )}

        {activeTab === 'migrations' && (
          <>
            {failedMigrations.length > 0 && (
              <div className="alert alert-error" style={{ margin: 'var(--spacing-lg) var(--spacing-xl)', marginBottom: 0 }}>
                Hay {failedMigrations.length} migración(es) fallida(s). Re-aplicar requiere ejecutar el flujo operativo definido para el backend.
              </div>
            )}
            <div className="table-container" style={{ borderRadius: 0, border: 'none', boxShadow: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Migración</th>
                    <th>Estado</th>
                    <th>Fecha aplicada</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {migrations.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="table-empty">No hay migraciones registradas.</td>
                    </tr>
                  ) : (
                    migrations.map((migration) => (
                      <tr key={migration.id}>
                        <td style={{ fontFamily: 'var(--font-family-mono)', fontSize: 'var(--font-size-xs)' }}>
                          {migration.migrationName}
                        </td>
                        <td>
                          <span className={`badge ${migration.status === 'success' ? 'badge-success' : 'badge-error'}`}>
                            {migration.status === 'success' ? 'Exitosa' : 'Fallida'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--color-text-secondary)' }}>{formatDate(migration.appliedAt)}</td>
                        <td style={{ color: 'var(--color-text-secondary)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {migration.error || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

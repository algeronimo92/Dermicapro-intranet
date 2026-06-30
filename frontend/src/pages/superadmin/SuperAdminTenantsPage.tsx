import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Plus, Power, X } from 'lucide-react';
import { CreateTenantDto, getPlatformApiError, platformAdminApi, Tenant } from '../../services/platformAdminApi';

const initialForm: CreateTenantDto = {
  name: '',
  slug: '',
  contactEmail: '',
  contactPhone: '',
  adminEmail: '',
  adminPassword: '',
  adminFirstName: '',
  adminLastName: '',
};

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 63);
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(value));

export const SuperAdminTenantsPage: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CreateTenantDto>(initialForm);
  const [isCreating, setIsCreating] = useState(false);
  const [isSlugEdited, setIsSlugEdited] = useState(false);
  const [actionSlug, setActionSlug] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const loadTenants = async () => {
    setIsLoading(true);
    setError('');
    try {
      setTenants(await platformAdminApi.listTenants());
    } catch (err) {
      setError(getPlatformApiError(err, 'No se pudo cargar la lista de clínicas'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadTenants(); }, []);

  const filteredTenants = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...tenants]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .filter((t) => {
        const matchesSearch = !q || t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q);
        const matchesStatus =
          filterStatus === 'all' ||
          (filterStatus === 'active' && t.isActive) ||
          (filterStatus === 'inactive' && !t.isActive);
        return matchesSearch && matchesStatus;
      });
  }, [tenants, search, filterStatus]);

  const updateName = (name: string) => {
    setForm((current) => ({
      ...current,
      name,
      slug: isSlugEdited ? current.slug : slugify(name),
    }));
  };

  const updateSlug = (slug: string) => {
    setIsSlugEdited(true);
    setForm((current) => ({ ...current, slug: slug.replace(/[^a-z0-9_]/g, '').slice(0, 63) }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setIsCreating(true);
    try {
      const payload: CreateTenantDto = {
        ...form,
        contactEmail: form.contactEmail || undefined,
        contactPhone: form.contactPhone || undefined,
        adminFirstName: form.adminFirstName || undefined,
        adminLastName: form.adminLastName || undefined,
      };
      await platformAdminApi.createTenant(payload);
      setShowModal(false);
      setForm(initialForm);
      setIsSlugEdited(false);
      await loadTenants();
    } catch (err) {
      setError(getPlatformApiError(err, 'No se pudo crear la clínica'));
    } finally {
      setIsCreating(false);
    }
  };

  const toggleTenant = async (tenant: Tenant) => {
    const action = tenant.isActive ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Deseas ${action} ${tenant.name}?`)) return;
    setActionSlug(tenant.slug);
    setError('');
    try {
      const updated = tenant.isActive
        ? await platformAdminApi.deactivateTenant(tenant.slug)
        : await platformAdminApi.activateTenant(tenant.slug);
      setTenants((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(getPlatformApiError(err, `No se pudo ${action} la clínica`));
    } finally {
      setActionSlug(null);
    }
  };

  return (
    <div className="superadmin-page">
      <header className="superadmin-page__header">
        <div>
          <h1>Clínicas</h1>
          <p>Gestiona tenants, estado operativo y provisión inicial.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={17} />
          Nueva clínica
        </button>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
        <input
          type="search"
          className="form-input"
          placeholder="Buscar por nombre o slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: '1 1 240px' }}
        />
        <select
          className="form-input"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
          style={{ width: 160 }}
        >
          <option value="all">Todas</option>
          <option value="active">Activas</option>
          <option value="inactive">Inactivas</option>
        </select>
      </div>

      <section className="superadmin-panel">
        <div className="superadmin-panel__header">
          <h2>Tenants registrados</h2>
          <button type="button" className="btn btn-secondary btn-sm" onClick={loadTenants} disabled={isLoading}>
            Actualizar
          </button>
        </div>
        {isLoading ? (
          <div className="superadmin-loading">
            <div className="loading-spinner" />
            Cargando clínicas...
          </div>
        ) : filteredTenants.length === 0 ? (
          <p className="table-empty">No hay clínicas registradas.</p>
        ) : (
          <div className="table-container" style={{ borderRadius: 0, border: 'none', boxShadow: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Slug</th>
                  <th>Estado</th>
                  <th>Email contacto</th>
                  <th>Fecha creación</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td style={{ fontWeight: 'var(--font-weight-semibold)' }}>{tenant.name}</td>
                    <td style={{ fontFamily: 'var(--font-family-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>{tenant.slug}</td>
                    <td>
                      <span className={`badge ${tenant.isActive ? 'badge-success' : 'badge-error'}`}>
                        {tenant.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{tenant.contactEmail || '—'}</td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{formatDate(tenant.createdAt)}</td>
                    <td>
                      <div className="table-actions">
                        <Link className="superadmin-icon-button" to={`/superadmin/tenants/${tenant.slug}`} title="Ver detalle" aria-label="Ver detalle">
                          <Eye size={17} />
                        </Link>
                        <button
                          type="button"
                          className="superadmin-icon-button"
                          onClick={() => toggleTenant(tenant)}
                          disabled={actionSlug === tenant.slug}
                          title={tenant.isActive ? 'Desactivar' : 'Activar'}
                          aria-label={tenant.isActive ? 'Desactivar' : 'Activar'}
                        >
                          <Power size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showModal && (
        <div className="modal-overlay" role="presentation">
          <section className="modal-content" style={{ maxWidth: 580 }} role="dialog" aria-modal="true" aria-labelledby="create-tenant-title">
            <div className="modal-header">
              <div>
                <h2 className="modal-title" id="create-tenant-title">Nueva clínica</h2>
                <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                  La provisión puede tardar mientras se aplican migraciones.
                </p>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowModal(false)} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submit}>
              <div className="modal-body">
                <div className="superadmin-form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="tenant-name">Nombre de la clínica</label>
                    <input id="tenant-name" className="form-input" value={form.name} onChange={(e) => updateName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="tenant-slug">Slug</label>
                    <input id="tenant-slug" className="form-input" value={form.slug} onChange={(e) => updateSlug(e.target.value)} pattern="[a-z0-9_]{1,63}" required />
                  </div>
                </div>
                <div className="superadmin-form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="tenant-contact-email">Email de contacto</label>
                    <input id="tenant-contact-email" type="email" className="form-input" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="tenant-contact-phone">Teléfono</label>
                    <input id="tenant-contact-phone" className="form-input" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
                  </div>
                </div>
                <div className="superadmin-form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="tenant-admin-email">Email admin inicial <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <input id="tenant-admin-email" type="email" className="form-input" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="tenant-admin-password">Contraseña temporal <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <input id="tenant-admin-password" type="password" className="form-input" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} required />
                  </div>
                </div>
                <div className="superadmin-form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="tenant-admin-first-name">Nombre admin</label>
                    <input id="tenant-admin-first-name" className="form-input" value={form.adminFirstName} onChange={(e) => setForm({ ...form, adminFirstName: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="tenant-admin-last-name">Apellido admin</label>
                    <input id="tenant-admin-last-name" className="form-input" value={form.adminLastName} onChange={(e) => setForm({ ...form, adminLastName: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={isCreating}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isCreating}>
                  {isCreating ? 'Aplicando migraciones...' : 'Crear clínica'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};

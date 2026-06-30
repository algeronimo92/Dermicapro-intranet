import React, { FormEvent, useEffect, useState } from 'react';
import { Plus, UserX, X } from 'lucide-react';
import { getPlatformApiError, platformAdminApi, PlatformAdmin, CreatePlatformAdminDto } from '../../services/platformAdminApi';
import { usePlatformAuth } from '../../contexts/PlatformAuthContext';

const emptyForm: CreatePlatformAdminDto = { email: '', password: '', firstName: '', lastName: '' };
const formatDate = (v: string) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(v));

export const SuperAdminAdminsPage: React.FC = () => {
  const { platformAdmin: me } = usePlatformAuth();
  const [admins, setAdmins] = useState<PlatformAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CreatePlatformAdminDto>(emptyForm);
  const [isCreating, setIsCreating] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    try { setAdmins(await platformAdminApi.listPlatformAdmins()); }
    catch (err) { setError(getPlatformApiError(err, 'Error al cargar administradores')); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError('');
    try {
      const created = await platformAdminApi.createPlatformAdmin(form);
      setAdmins((prev) => [created, ...prev]);
      setShowModal(false);
      setForm(emptyForm);
    } catch (err) { setError(getPlatformApiError(err, 'Error al crear administrador')); }
    finally { setIsCreating(false); }
  };

  const deactivate = async (admin: PlatformAdmin) => {
    if (!window.confirm(`¿Desactivar a ${admin.firstName} ${admin.lastName}?`)) return;
    setDeactivatingId(admin.id);
    setError('');
    try {
      await platformAdminApi.deactivatePlatformAdmin(admin.id);
      setAdmins((prev) => prev.map((a) => a.id === admin.id ? { ...a, isActive: false } : a));
    } catch (err) { setError(getPlatformApiError(err, 'Error al desactivar administrador')); }
    finally { setDeactivatingId(null); }
  };

  return (
    <div className="superadmin-page">
      <header className="superadmin-page__header">
        <div>
          <h1>Administradores</h1>
          <p>Gestiona las cuentas de superadmin de la plataforma.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={17} />Nuevo admin
        </button>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <section className="superadmin-panel">
        <div className="superadmin-panel__header"><h2>Cuentas de plataforma</h2></div>
        {isLoading ? (
          <div className="superadmin-loading"><div className="loading-spinner" />Cargando...</div>
        ) : (
          <div className="table-container" style={{ borderRadius: 0, border: 'none', boxShadow: 'none' }}>
            <table className="table">
              <thead><tr><th>Nombre</th><th>Email</th><th>Estado</th><th>Creado</th><th>Acciones</th></tr></thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id}>
                    <td style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                      {admin.firstName} {admin.lastName}
                      {admin.id === me?.id && <span className="badge badge-info" style={{ marginLeft: 'var(--spacing-xs)' }}>Tú</span>}
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{admin.email}</td>
                    <td><span className={`badge ${admin.isActive ? 'badge-success' : 'badge-error'}`}>{admin.isActive ? 'Activo' : 'Inactivo'}</span></td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{formatDate(admin.createdAt)}</td>
                    <td>
                      {admin.id !== me?.id && admin.isActive && (
                        <button type="button" className="superadmin-icon-button" onClick={() => deactivate(admin)} disabled={deactivatingId === admin.id} title="Desactivar">
                          <UserX size={17} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showModal && (
        <div className="modal-overlay">
          <section className="modal-content" role="dialog" aria-modal="true" aria-labelledby="create-admin-title">
            <div className="modal-header">
              <h2 className="modal-title" id="create-admin-title">Nuevo administrador</h2>
              <button type="button" className="modal-close" onClick={() => setShowModal(false)} aria-label="Cerrar"><X size={18} /></button>
            </div>
            <form onSubmit={submit}>
              <div className="modal-body">
                <div className="superadmin-form-grid">
                  <div className="form-group"><label className="form-label">Nombre</label><input className="form-input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">Apellido</label><input className="form-input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></div>
                </div>
                <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">Contraseña inicial</label><input type="password" className="form-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required autoComplete="new-password" /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={isCreating}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isCreating}>{isCreating ? 'Creando...' : 'Crear admin'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};

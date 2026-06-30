import React, { FormEvent, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { getPlatformApiError, platformAdminApi, PlatformSettings } from '../../services/platformAdminApi';

const empty: PlatformSettings = {
  smtpHost: null,
  smtpPort: null,
  smtpUser: null,
  smtpPassword: null,
  smtpFrom: null,
  platformDomain: null,
  maxTenants: null,
};

export const SuperAdminSettingsPage: React.FC = () => {
  const [form, setForm] = useState<PlatformSettings>(empty);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    platformAdminApi
      .getSettings()
      .then((s) => setForm(s))
      .catch((err) => setError(getPlatformApiError(err, 'Error al cargar configuracion')))
      .finally(() => setIsLoading(false));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess(false);
    try {
      const saved = await platformAdminApi.updateSettings(form);
      setForm(saved);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(getPlatformApiError(err, 'Error al guardar configuracion'));
    } finally {
      setIsSaving(false);
    }
  };

  const field = (label: string, key: keyof PlatformSettings, type = 'text', hint?: string) => (
    <div className="form-group" key={key}>
      <label className="form-label">{label}</label>
      <input
        type={type}
        className="form-input"
        value={(form[key] as string | number | null) ?? ''}
        onChange={(e) => setForm({ ...form, [key]: e.target.value || null })}
        placeholder={hint}
        autoComplete={type === 'password' ? 'new-password' : undefined}
      />
    </div>
  );

  return (
    <div className="superadmin-page">
      <header className="superadmin-page__header">
        <div>
          <h1>Configuración</h1>
          <p>Ajustes globales de la plataforma.</p>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">Configuracion guardada correctamente.</div>}

      {isLoading ? (
        <div className="superadmin-loading">
          <div className="loading-spinner" />
          Cargando...
        </div>
      ) : (
        <form onSubmit={submit}>
          <section className="superadmin-panel" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <div className="superadmin-panel__header">
              <h2>SMTP — Correo electronico</h2>
            </div>
            <div style={{ padding: 'var(--spacing-lg) var(--spacing-xl)' }}>
              <div className="superadmin-form-grid">
                {field('Servidor SMTP', 'smtpHost', 'text', 'smtp.ejemplo.com')}
                {field('Puerto', 'smtpPort', 'number', '587')}
              </div>
              <div className="superadmin-form-grid">
                {field('Usuario', 'smtpUser', 'text', 'usuario@ejemplo.com')}
                {field('Contraseña', 'smtpPassword', 'password')}
              </div>
              {field('Dirección remitente', 'smtpFrom', 'email', 'noreply@plataforma.com')}
            </div>
          </section>

          <section className="superadmin-panel" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <div className="superadmin-panel__header">
              <h2>Plataforma</h2>
            </div>
            <div style={{ padding: 'var(--spacing-lg) var(--spacing-xl)' }}>
              <div className="superadmin-form-grid">
                {field('Dominio base', 'platformDomain', 'text', 'plataforma.com')}
                {field('Máximo de clínicas', 'maxTenants', 'number', '100')}
              </div>
            </div>
          </section>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              <Save size={17} />
              {isSaving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

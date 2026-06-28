import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Copy, Check, Building2, User, Eye, EyeOff } from 'lucide-react';
import { onboardingService, RegisterTenantResult } from '../services/onboarding.service';

const VALID_SLUG = /^[a-z0-9_]{1,63}$/;

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s_]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 63);
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 'var(--radius-lg)',
  border: '1.5px solid var(--color-border-primary)',
  background: 'var(--color-bg-primary)',
  color: 'var(--color-text-primary)',
  fontSize: 'var(--font-size-base)',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 'var(--font-size-sm)',
  fontWeight: 'var(--font-weight-medium)' as any,
  color: 'var(--color-text-secondary)',
  marginBottom: 6,
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-sm)',
  fontWeight: 'var(--font-weight-semibold)' as any,
  color: 'var(--color-text-secondary)',
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--spacing-xs)',
  paddingBottom: 'var(--spacing-xs)',
  borderBottom: '1px solid var(--color-border-secondary)',
};

export function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    slug: '',
    contactEmail: '',
    contactPhone: '',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
  });
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugError, setSlugError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<RegisterTenantResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setForm((f) => ({ ...f, name, slug: slugEdited ? f.slug : generateSlug(name) }));
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugEdited(true);
    const slug = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setForm((f) => ({ ...f, slug }));
    setSlugError(slug && !VALID_SLUG.test(slug) ? 'Solo letras minúsculas, números y guión bajo (_), máximo 63 caracteres' : '');
  };

  const handleField = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!VALID_SLUG.test(form.slug)) {
      setSlugError('Slug inválido');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const res = await onboardingService.registerTenant({
        name: form.name,
        slug: form.slug,
        contactEmail: form.contactEmail || undefined,
        contactPhone: form.contactPhone || undefined,
        adminFirstName: form.adminFirstName,
        adminLastName: form.adminLastName,
        adminEmail: form.adminEmail,
      });
      setResult(res);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al registrar la clínica. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (result) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-secondary)', padding: 'var(--spacing-xl)' }}>
        <div style={{ background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-2xl)', padding: 'var(--spacing-3xl)', maxWidth: 480, width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
            <CheckCircle size={48} color="var(--color-success)" style={{ marginBottom: 'var(--spacing-md)' }} />
            <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' as any, color: 'var(--color-text-primary)', margin: 0 }}>
              ¡Clínica registrada!
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-sm)', marginBottom: 0 }}>
              <strong>{result.tenant.name}</strong> ya está lista en DermicaPro.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-md)' }}>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>URL de acceso</div>
              <a href={result.loginUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)', fontWeight: 'var(--font-weight-medium)' as any, wordBreak: 'break-all', fontSize: 'var(--font-size-sm)' }}>
                {result.loginUrl}
              </a>
            </div>

            <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-md)' }}>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Email del administrador</div>
              <span style={{ fontWeight: 'var(--font-weight-medium)' as any }}>{result.adminEmail}</span>
            </div>

            <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Contraseña temporal</div>
                  <span style={{ fontFamily: 'monospace', fontWeight: 'var(--font-weight-semibold)' as any, letterSpacing: 2 }}>
                    {showPassword ? result.tempPassword : '••••••••••••••••'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={() => setShowPassword((v) => !v)}
                    title={showPassword ? 'Ocultar' : 'Mostrar'}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4, borderRadius: 'var(--radius-sm)' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    onClick={handleCopy}
                    title="Copiar contraseña"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--color-success)' : 'var(--color-text-secondary)', padding: 4, borderRadius: 'var(--radius-sm)' }}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ background: '#fff8e1', border: '1px solid #f59e0b', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: 'var(--font-size-sm)', color: '#92400e' }}>
              ⚠️ Guarda estas credenciales ahora. La contraseña no se mostrará de nuevo. Cámbiala en el primer inicio de sesión.
            </div>
          </div>

          <Link
            to="/login"
            style={{ display: 'block', marginTop: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--color-primary)', fontWeight: 'var(--font-weight-medium)' as any, textDecoration: 'none' }}
          >
            Ir al inicio de sesión →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-secondary)', padding: 'var(--spacing-xl)' }}>
      <div style={{ background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-2xl)', padding: 'var(--spacing-3xl)', maxWidth: 520, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' as any, color: 'var(--color-text-primary)', margin: 0 }}>
            Registra tu clínica
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-xs)', marginBottom: 0 }}>
            Comienza a usar DermicaPro en minutos
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {/* Clinic section */}
          <div style={sectionLabelStyle}>
            <Building2 size={14} /> Datos de la clínica
          </div>

          <div>
            <label style={labelStyle}>Nombre de la clínica *</label>
            <input type="text" required value={form.name} onChange={handleNameChange} placeholder="Clínica Dermicapro Trujillo" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>
              Identificador (slug) *
              <span style={{ fontWeight: 'normal', marginLeft: 8, color: 'var(--color-text-tertiary)' }}>letras minúsculas, números y _</span>
            </label>
            <input type="text" required value={form.slug} onChange={handleSlugChange} placeholder="mi_clinica" style={{ ...inputStyle, borderColor: slugError ? 'var(--color-error)' : undefined }} />
            {slugError && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-error)', marginTop: 4 }}>{slugError}</div>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
            <div>
              <label style={labelStyle}>Email de contacto</label>
              <input type="email" value={form.contactEmail} onChange={handleField('contactEmail')} placeholder="info@clinica.com" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Teléfono</label>
              <input type="tel" value={form.contactPhone} onChange={handleField('contactPhone')} placeholder="+51 999 000 000" style={inputStyle} />
            </div>
          </div>

          {/* Admin section */}
          <div style={{ ...sectionLabelStyle, marginTop: 'var(--spacing-xs)' }}>
            <User size={14} /> Administrador de la clínica
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
            <div>
              <label style={labelStyle}>Nombre *</label>
              <input type="text" required value={form.adminFirstName} onChange={handleField('adminFirstName')} placeholder="Ana" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Apellido *</label>
              <input type="text" required value={form.adminLastName} onChange={handleField('adminLastName')} placeholder="López" style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>
              Email del administrador *
              <span style={{ fontWeight: 'normal', marginLeft: 8, color: 'var(--color-text-tertiary)' }}>para acceder al sistema</span>
            </label>
            <input type="email" required value={form.adminEmail} onChange={handleField('adminEmail')} placeholder="admin@clinica.com" style={inputStyle} />
          </div>

          {error && (
            <div style={{ background: '#fff5f5', border: '1px solid var(--color-error)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: 'var(--font-size-sm)', color: 'var(--color-error)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !!slugError}
            style={{ marginTop: 'var(--spacing-xs)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-lg)', border: 'none', background: isLoading || slugError ? 'var(--color-bg-tertiary)' : 'var(--color-primary)', color: isLoading || slugError ? 'var(--color-text-tertiary)' : '#fff', fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)' as any, cursor: isLoading || slugError ? 'not-allowed' : 'pointer' }}
          >
            {isLoading ? 'Registrando clínica...' : 'Registrar clínica'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 'var(--spacing-lg)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 'var(--font-weight-medium)' as any }}>
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

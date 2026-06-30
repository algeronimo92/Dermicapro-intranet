import { Link } from 'react-router-dom';
import { ShieldCheck, Building2 } from 'lucide-react';

export function PlatformLandingPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg-secondary)',
      padding: 'var(--spacing-xl)',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 'var(--radius-xl)',
          background: 'var(--color-primary)',
          display: 'grid',
          placeItems: 'center',
          margin: '0 auto var(--spacing-lg)',
          color: '#fff',
        }}>
          <ShieldCheck size={32} />
        </div>

        <h1 style={{
          fontSize: 'var(--font-size-3xl)',
          fontWeight: 'var(--font-weight-bold)',
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--spacing-sm)',
        }}>
          DermicaPro
        </h1>

        <p style={{
          fontSize: 'var(--font-size-md)',
          color: 'var(--color-text-secondary)',
          marginBottom: 'var(--spacing-2xl)',
        }}>
          Plataforma de gestion para clinicas de dermatologia y estetica.
        </p>

        <div style={{
          background: 'var(--color-bg-primary)',
          border: '1px solid var(--color-border-secondary)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--spacing-xl)',
          marginBottom: 'var(--spacing-lg)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)', justifyContent: 'center' }}>
            <Building2 size={18} color="var(--color-text-secondary)" />
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
              Accede a tu clinica
            </span>
          </div>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
            Ingresa usando el subdominio de tu clinica:
          </p>
          <code style={{
            display: 'block',
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-secondary)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--spacing-sm) var(--spacing-md)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-primary)',
            fontFamily: 'monospace',
          }}>
            tu-clinica.{window.location.host}
          </code>
        </div>

        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
          Administrador de plataforma?{' '}
          <Link
            to="/superadmin/login"
            style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 'var(--font-weight-medium)' }}
          >
            Ingresar al panel
          </Link>
        </p>
      </div>
    </div>
  );
}

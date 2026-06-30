import React, { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { usePlatformAuth } from '../../contexts/PlatformAuthContext';
import { getPlatformApiError } from '../../services/platformAdminApi';

export const SuperAdminLoginPage: React.FC = () => {
  const { isAuthenticated, login } = usePlatformAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/superadmin/dashboard" replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(from || '/superadmin/dashboard', { replace: true });
    } catch (err) {
      setError(getPlatformApiError(err, 'No se pudo iniciar sesión'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="superadmin-login">
      <div className="superadmin-login__panel">
        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
            <div className="superadmin-brand__mark" style={{ margin: '0 auto var(--spacing-md)' }}>
              <ShieldCheck size={22} />
            </div>
            <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', margin: '0 0 var(--spacing-xs)' }}>
              Superadmin
            </h1>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
              Acceso al panel de gestión de plataforma.
            </p>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: 'var(--spacing-lg)' }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="platform-email">Email</label>
              <input
                id="platform-email"
                type="email"
                className="form-input"
                value={email}
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="platform-password">Contraseña</label>
              <input
                id="platform-password"
                type="password"
                className="form-input"
                value={password}
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={isSubmitting}>
              <LockKeyhole size={17} />
              {isSubmitting ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

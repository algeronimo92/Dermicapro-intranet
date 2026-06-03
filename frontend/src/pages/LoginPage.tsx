import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { APP_VERSION } from '../config/version';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Credenciales incorrectas. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* ── Panel de marca (izquierda) ── */}
      <div className="login-brand-panel">
        <div className="login-brand-blobs">
          <div className="login-blob login-blob-1" />
          <div className="login-blob login-blob-2" />
          <div className="login-blob login-blob-3" />
        </div>

        <div className="login-brand-content">
          <div className="login-brand-logo">
            <Sparkles className="login-brand-icon" size={32} />
            <span className="login-brand-name">DermicaPro</span>
          </div>
          <p className="login-brand-tagline">
            Gestión integral para tu clínica de estética y dermatología
          </p>
          <ul className="login-brand-features">
            <li><span className="login-feature-dot" />Historial clínico y seguimiento de pacientes</li>
            <li><span className="login-feature-dot" />Agenda y gestión de citas en tiempo real</li>
            <li><span className="login-feature-dot" />Facturación y comisiones automáticas</li>
            <li><span className="login-feature-dot" />Analíticas y reportes ejecutivos</li>
          </ul>
        </div>

        <div className="login-brand-footer">
          <span>DermicaPro v{APP_VERSION}</span>
          <span>Trujillo, Perú</span>
        </div>
      </div>

      {/* ── Panel de formulario (derecha) ── */}
      <div className="login-form-panel">
        <div className="login-form-container">
          <div className="login-mobile-logo">
            <Sparkles size={20} />
            <span>DermicaPro</span>
          </div>

          <div className="login-form-header">
            <h1 className="login-welcome">Bienvenido de vuelta</h1>
            <p className="login-subtitle">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-form-group">
              <label className="login-form-label">Correo electrónico</label>
              <div className="login-input-wrapper">
                <Mail className="login-input-icon" size={16} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="login-form-input login-input-with-icon"
                  placeholder="usuario@dermicapro.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="login-form-group">
              <label className="login-form-label">Contraseña</label>
              <div className="login-input-wrapper">
                <Lock className="login-input-icon" size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="login-form-input login-input-with-icon login-input-with-toggle"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error" role="alert">
                <span className="login-error-icon">⚠</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="login-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="login-spinner" />
                  Ingresando...
                </>
              ) : (
                'Ingresar al sistema'
              )}
            </button>
          </form>

          <div className="login-form-version">v{APP_VERSION}</div>
        </div>
      </div>
    </div>
  );
}

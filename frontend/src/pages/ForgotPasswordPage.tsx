import { AxiosError } from 'axios';
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, Mail, MailCheck } from 'lucide-react';
import { authService } from '../services/auth.service';
import { AuthLayout } from '../components/AuthLayout';

export function ForgotPasswordPage() {
  const location = useLocation();
  const [email, setEmail] = useState<string>((location.state as { email?: string } | null)?.email ?? '');
  const [sentMessage, setSentMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      setSentMessage(await authService.forgotPassword(email.trim()));
    } catch (caught) {
      const err = caught as AxiosError<{ error?: string; message?: string }>;
      const status = err.response?.status;
      if (!err.response) {
        setError('No se pudo conectar con el servidor. Verifica tu conexión.');
      } else if (status === 429) {
        setError(err.response.data?.message || 'Pediste demasiados enlaces. Intenta más tarde.');
      } else {
        setError(err.response.data?.error || 'No se pudo enviar el correo. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Link to="/login" className="login-back-btn">
        <ChevronLeft size={16} />
        Volver al inicio de sesión
      </Link>

      {sentMessage ? (
        <div className="login-form">
          <div className="login-form-header">
            <div className="login-status-icon" aria-hidden="true"><MailCheck size={28} /></div>
            <h1 className="login-welcome">Revisa tu correo</h1>
            <p className="login-subtitle">{sentMessage}</p>
          </div>
          <p className="login-help-text">El enlace vence en 30 minutos y sirve una sola vez.</p>
          <button type="button" className="login-pin-fallback-btn" onClick={() => setSentMessage('')}>
            ¿No llegó? Enviar otra vez
          </button>
        </div>
      ) : (
        <>
          <div className="login-form-header">
            <h1 className="login-welcome">¿Olvidaste tu contraseña?</h1>
            <p className="login-subtitle">Escribe tu correo y te enviaremos un enlace para crear una nueva.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-form-group">
              <label className="login-form-label" htmlFor="forgot-email">Correo electrónico</label>
              <div className="login-input-wrapper">
                <Mail className="login-input-icon" size={16} />
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="login-form-input login-input-with-icon"
                  placeholder="usuario@dermicapro.com"
                  autoComplete="email"
                />
              </div>
            </div>

            {error && (
              <div className="login-error" role="alert">
                <span className="login-error-icon">⚠</span>
                {error}
              </div>
            )}

            <button type="submit" className="login-submit-btn" disabled={isLoading}>
              {isLoading ? <><span className="login-spinner" />Enviando...</> : 'Enviar enlace'}
            </button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}

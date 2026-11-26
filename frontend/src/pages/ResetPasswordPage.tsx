import { AxiosError } from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Eye, EyeOff, Lock, ShieldAlert, ShieldCheck } from 'lucide-react';
import { authService } from '../services/auth.service';
import { AuthLayout } from '../components/AuthLayout';
import { getPasswordStrength, passwordRequirements } from '../utils/passwordStrength';
import '../components/FirstLoginModal.css';

type Status = 'checking' | 'invalid' | 'form' | 'done';

/** El token llega en el fragmento (#) del enlace del correo, que el navegador no manda al servidor. */
const readTokenFromHash = (): string => window.location.hash.replace(/^#/, '');

export function ResetPasswordPage() {
  const [token] = useState(readTokenFromHash);

  // Se quita de la barra de direcciones para que no quede a la vista ni en el historial.
  useEffect(() => {
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
  }, []);
  const [status, setStatus] = useState<Status>(token ? 'checking' : 'invalid');
  const [firstName, setFirstName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    authService.checkResetToken(token)
      .then((r) => { setFirstName(r.firstName); setStatus('form'); })
      .catch((err: AxiosError) => {
        if (err.response?.status === 400) {
          setStatus('invalid');
        } else {
          setStatus('form');
          setError('No se pudo verificar el enlace. Puedes intentar guardar igual.');
        }
      });
  }, [token]);

  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);
  const reqs = passwordRequirements(newPassword);
  const allReqsMet = reqs.every((r) => r.met);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const canSubmit = allReqsMet && passwordsMatch && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!canSubmit) return;
    setIsLoading(true);
    try {
      await authService.resetPassword(token, newPassword);
      // Las sesiones guardadas en este navegador ya no valen.
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setStatus('done');
    } catch (caught) {
      const err = caught as AxiosError<{ error?: string }>;
      const msg = err.response?.data?.error;
      if (err.response?.status === 400 && msg && /enlace/i.test(msg)) setStatus('invalid');
      else setError(msg || 'No se pudo cambiar la contraseña. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      {status === 'checking' && (
        <div className="pin-loading"><span className="login-spinner" />Verificando enlace...</div>
      )}

      {status === 'invalid' && (
        <div className="login-form">
          <div className="login-form-header">
            <div className="login-status-icon login-status-icon--error" aria-hidden="true"><ShieldAlert size={28} /></div>
            <h1 className="login-welcome">El enlace ya no sirve</h1>
            <p className="login-subtitle">Venció, ya se usó o se pidió uno más nuevo. Pide otro enlace para continuar.</p>
          </div>
          <Link to="/forgot-password" className="login-submit-btn login-submit-link">Pedir otro enlace</Link>
          <Link to="/login" className="login-pin-fallback-btn">Volver al inicio de sesión</Link>
        </div>
      )}

      {status === 'done' && (
        <div className="login-form">
          <div className="login-form-header">
            <div className="login-status-icon" aria-hidden="true"><ShieldCheck size={28} /></div>
            <h1 className="login-welcome">Contraseña actualizada</h1>
            <p className="login-subtitle">Cerramos las sesiones que tenías abiertas. Ingresa con tu nueva contraseña.</p>
          </div>
          <Link to="/login" className="login-submit-btn login-submit-link">Ir al inicio de sesión</Link>
        </div>
      )}

      {status === 'form' && (
        <>
          <Link to="/login" className="login-back-btn">
            <ChevronLeft size={16} />
            Volver al inicio de sesión
          </Link>

          <div className="login-form-header">
            <h1 className="login-welcome">Crea tu nueva contraseña</h1>
            <p className="login-subtitle">
              {firstName ? <>Hola, <strong>{firstName}</strong>. </> : null}
              Elige una contraseña que no hayas usado antes.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-form-group">
              <label className="login-form-label" htmlFor="reset-new">Nueva contraseña</label>
              <div className="login-input-wrapper">
                <Lock className="login-input-icon" size={16} />
                <input
                  id="reset-new"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoFocus
                  className="login-form-input login-input-with-icon login-input-with-toggle"
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowNew(!showNew)}
                  onMouseDown={(e) => e.preventDefault()}
                  aria-label={showNew ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {newPassword.length > 0 && (
                <div className="flm-strength">
                  <div className="flm-strength-bar">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={`flm-strength-seg${i <= strength.score ? ` active-${strength.level}` : ''}`} />
                    ))}
                  </div>
                  <span className={`flm-strength-label ${strength.level}`}>{strength.label}</span>
                </div>
              )}
            </div>

            <div className="flm-reqs">
              <p className="flm-reqs-title">Requisitos</p>
              {reqs.map((r) => (
                <div key={r.label} className={`flm-req-item${r.met ? ' met' : ''}`}>
                  <span className="flm-req-dot" />
                  {r.label}
                </div>
              ))}
            </div>

            <div className="login-form-group">
              <label className="login-form-label" htmlFor="reset-confirm">Confirmar contraseña</label>
              <div className="login-input-wrapper">
                <Lock className="login-input-icon" size={16} />
                <input
                  id="reset-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="login-form-input login-input-with-icon login-input-with-toggle"
                  placeholder="Repite la contraseña"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowConfirm(!showConfirm)}
                  onMouseDown={(e) => e.preventDefault()}
                  aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="login-help-text login-help-text--error">Las contraseñas no coinciden.</p>
              )}
            </div>

            {error && (
              <div className="login-error" role="alert">
                <span className="login-error-icon">⚠</span>
                {error}
              </div>
            )}

            <button type="submit" className="login-submit-btn" disabled={!canSubmit}>
              {isLoading ? <><span className="login-spinner" />Guardando...</> : 'Guardar contraseña'}
            </button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}

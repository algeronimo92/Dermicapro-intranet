import React, { useState, useMemo } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { authService } from '../services/auth.service';
import { useAuth } from '../contexts/AuthContext';
import './FirstLoginModal.css';

type Strength = 'weak' | 'fair' | 'good' | 'strong';

function getStrength(password: string): { level: Strength; score: number; label: string } {
  if (!password) return { level: 'weak', score: 0, label: '' };
  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 'weak',   score: 1, label: 'Débil' };
  if (score === 2) return { level: 'fair',   score: 2, label: 'Regular' };
  if (score === 3) return { level: 'good',   score: 3, label: 'Buena' };
  return              { level: 'strong', score: 4, label: 'Fuerte' };
}

export function FirstLoginModal() {
  const { clearMustChangePassword, updateUser, user } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const strength = useMemo(() => getStrength(newPassword), [newPassword]);

  const reqs = [
    { label: 'Al menos 8 caracteres',         met: newPassword.length >= 8 },
    { label: 'Letras mayúsculas y minúsculas', met: /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) },
    { label: 'Al menos un número',             met: /\d/.test(newPassword) },
    { label: 'Al menos un carácter especial',  met: /[^A-Za-z0-9]/.test(newPassword) },
  ];

  const allReqsMet = reqs.every((r) => r.met);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const canSubmit = allReqsMet && passwordsMatch && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!allReqsMet) {
      setError('La contraseña no cumple todos los requisitos.');
      return;
    }
    if (!passwordsMatch) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.changePassword('1234567890', newPassword);
      if (user) updateUser({ ...user, mustChangePassword: false });
      clearMustChangePassword();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cambiar la contraseña. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const firstName = user?.firstName ?? 'usuario';

  return (
    <div className="flm-backdrop">
      <div className="flm-card">

        {/* ── Header ── */}
        <div className="flm-header">
          <div className="flm-icon-wrap">
            <ShieldCheck size={28} strokeWidth={1.8} />
          </div>
          <h2 className="flm-title">Primer inicio de sesión</h2>
          <p className="flm-subtitle">
            Hola, <strong>{firstName}</strong>. Por seguridad crea tu contraseña
            personal antes de continuar.
          </p>
        </div>

        {/* ── Form ── */}
        <form className="flm-form" onSubmit={handleSubmit}>

          {/* Nueva contraseña */}
          <div className="flm-field">
            <label className="flm-label">Nueva contraseña</label>
            <div className="flm-input-wrap">
              <Lock size={16} className="flm-input-icon" />
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Mínimo 8 caracteres"
                className={`flm-input${error && newPassword.length < 8 ? ' error' : ''}`}
                autoComplete="new-password"
                autoFocus
              />
              <button type="button" className="flm-eye-btn" onClick={() => setShowNew(!showNew)} tabIndex={-1}>
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Medidor de fuerza */}
            {newPassword.length > 0 && (
              <div className="flm-strength">
                <div className="flm-strength-bar">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`flm-strength-seg${i <= strength.score ? ` active-${strength.level}` : ''}`}
                    />
                  ))}
                </div>
                <span className={`flm-strength-label ${strength.level}`}>{strength.label}</span>
              </div>
            )}
          </div>

          {/* Requisitos */}
          <div className="flm-reqs">
            <p className="flm-reqs-title">Requisitos</p>
            {reqs.map((r) => (
              <div key={r.label} className={`flm-req-item${r.met ? ' met' : ''}`}>
                <span className="flm-req-dot" />
                {r.label}
              </div>
            ))}
          </div>

          {/* Confirmar contraseña */}
          <div className="flm-field">
            <label className="flm-label">Confirmar contraseña</label>
            <div className="flm-input-wrap">
              <Lock size={16} className="flm-input-icon" />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Repite la contraseña"
                className={`flm-input${confirmPassword.length > 0 && !passwordsMatch ? ' error' : ''}`}
                autoComplete="new-password"
              />
              <button type="button" className="flm-eye-btn" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}>
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flm-error">
              <span>⚠</span>
              {error}
            </div>
          )}

          {/* Submit */}
          <button type="submit" className="flm-submit-btn" disabled={!canSubmit}>
            {isLoading ? (
              <><span className="flm-spinner" />Guardando...</>
            ) : (
              'Guardar contraseña y continuar'
            )}
          </button>
        </form>

        {/* Nota de seguridad */}
        <p className="flm-security-note">
          <ShieldCheck size={12} />
          Tu contraseña se almacena de forma segura y cifrada
        </p>

      </div>
    </div>
  );
}

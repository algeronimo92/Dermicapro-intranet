import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { authService } from '../services/auth.service';
import { useAuth } from '../contexts/AuthContext';

export function FirstLoginModal() {
  const { clearMustChangePassword, updateUser, user } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
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

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'var(--color-surface, #fff)',
        borderRadius: '16px',
        padding: '40px 36px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64,
            borderRadius: '50%',
            background: 'var(--color-primary-alpha, rgba(99,102,241,0.12))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <ShieldCheck size={32} color="var(--color-primary, #6366f1)" />
          </div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-text-primary, #111)' }}>
            Primer inicio de sesión
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: 'var(--color-text-secondary, #666)', lineHeight: 1.5 }}>
            Por seguridad, debes crear una contraseña personal antes de continuar.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary, #111)' }}>
              Nueva contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary, #888)', pointerEvents: 'none' }} />
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Mínimo 8 caracteres"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '10px 40px 10px 38px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--color-border, #e0e0e0)',
                  fontSize: '0.95rem',
                  background: 'var(--color-input-bg, #fafafa)',
                  color: 'var(--color-text-primary, #111)',
                  outline: 'none',
                }}
              />
              <button type="button" onClick={() => setShowNew(!showNew)} tabIndex={-1}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary, #888)', padding: 0 }}>
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary, #111)' }}>
              Confirmar contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary, #888)', pointerEvents: 'none' }} />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Repite la contraseña"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '10px 40px 10px 38px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--color-border, #e0e0e0)',
                  fontSize: '0.95rem',
                  background: 'var(--color-input-bg, #fafafa)',
                  color: 'var(--color-text-primary, #111)',
                  outline: 'none',
                }}
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary, #888)', padding: 0 }}>
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'var(--color-error-alpha, rgba(239,68,68,0.1))',
              color: 'var(--color-error, #ef4444)',
              fontSize: '0.875rem',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span>⚠</span> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--color-primary, #6366f1)',
              color: '#fff',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {isLoading ? 'Guardando...' : 'Guardar contraseña y continuar'}
          </button>
        </form>
      </div>
    </div>
  );
}

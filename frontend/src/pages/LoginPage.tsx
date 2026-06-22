import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Sparkles, ChevronLeft, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getRememberedUsers, removeRememberedUser, RememberedUser } from '../contexts/AuthContext';
import { Role } from '../types';
import { APP_VERSION } from '../config/version';
import { PinInput } from '../components/PinInput';

type LoginView = 'cards' | 'quick' | 'full';

export function LoginPage() {
  const { login, loginWithPin, isAuthenticated } = useAuth();
  const [view, setView] = useState<LoginView>('full');
  const [remembered, setRemembered] = useState<RememberedUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<RememberedUser | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [usePasswordFallback, setUsePasswordFallback] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const users = getRememberedUsers();
    setRemembered(users);
    setView(users.length > 0 ? 'cards' : 'full');
  }, []);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const loginEmail = view === 'quick' && selectedUser ? selectedUser.email : email;
      await login(loginEmail, password);
    } catch (err: any) {
      const status = err.response?.status;
      if (!err.response || status === 0) {
        setError('No se pudo conectar con el servidor. Verifica tu conexión.');
      } else if (status === 404 || status >= 500) {
        setError('El servicio no está disponible en este momento. Intenta más tarde.');
      } else {
        setError(err.response?.data?.error || 'Credenciales incorrectas. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinComplete = async (pinValue: string) => {
    if (!selectedUser) return;
    setError('');
    setIsLoading(true);
    try {
      await loginWithPin(selectedUser.id, pinValue);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 423) {
        setError(err.response?.data?.error || 'Tu PIN ha sido bloqueado. Ingresa tu contraseña para reactivarlo.');
        setUsePasswordFallback(true);
      } else if (!err.response || status === 0) {
        setError('No se pudo conectar con el servidor. Verifica tu conexión.');
      } else if (status === 404 || status >= 500) {
        setError('El servicio no está disponible en este momento. Intenta más tarde.');
      } else {
        setError(err.response?.data?.error || 'PIN incorrecto. Intenta de nuevo.');
      }
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectUser = (user: RememberedUser) => {
    setSelectedUser(user);
    setPassword('');
    setPin('');
    setUsePasswordFallback(false);
    setError('');
    setView('quick');
  };

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeRememberedUser(id);
    const updated = getRememberedUsers();
    setRemembered(updated);
    if (updated.length === 0) setView('full');
  };

  const handleBack = () => {
    setError('');
    setPassword('');
    setPin('');
    setUsePasswordFallback(false);
    setView(remembered.length > 0 ? 'cards' : 'full');
  };

  const getInitials = (u: RememberedUser) =>
    `${u.firstName[0] ?? ''}${u.lastName[0] ?? ''}`.toUpperCase();

  const getRoleColor = (roleKey: string) => {
    switch (roleKey as Role) {
      case Role.admin:         return 'remembered-role-admin';
      case Role.medical_staff: return 'remembered-role-medical';
      case Role.assistant:     return 'remembered-role-assistant';
      case Role.sales:         return 'remembered-role-sales';
      default:                 return 'remembered-role-default';
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
            <li><span className="login-feature-dot" />Órdenes de pago y comisiones automáticas</li>
            <li><span className="login-feature-dot" />Analíticas y reportes ejecutivos</li>
          </ul>
        </div>

        <div className="login-brand-footer">
          <span>DermicaPro v{APP_VERSION}</span>
          <span>Trujillo, Perú</span>
        </div>
      </div>

      {/* ── Panel derecho ── */}
      <div className="login-form-panel">
        <div className="login-form-container">
          <div className="login-mobile-logo">
            <Sparkles size={20} />
            <span>DermicaPro</span>
          </div>

          {/* ── VISTA: cards de usuarios recordados ── */}
          {view === 'cards' && (
            <>
              <div className="login-form-header">
                <h1 className="login-welcome">Bienvenido de vuelta!!</h1>
                <p className="login-subtitle">Selecciona tu cuenta para continuar</p>
              </div>

              <div className="remembered-grid">
                {remembered.map((u) => (
                  <div
                    key={u.id}
                    className="remembered-card"
                    onClick={() => handleSelectUser(u)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectUser(u);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <button
                      className="remembered-card-remove"
                      onClick={(e) => handleRemove(e, u.id)}
                      type="button"
                      aria-label="Olvidar cuenta"
                      title="Olvidar esta cuenta"
                    >
                      <X size={12} />
                    </button>
                    <div className="remembered-avatar">
                      {u.photoUrl
                        ? <img src={u.photoUrl} alt={u.firstName} className="remembered-avatar-img" />
                        : getInitials(u)}
                    </div>
                    <div className="remembered-info">
                      <span className="remembered-name">{u.firstName} {u.lastName}</span>
                      <span className="remembered-email">{u.email}</span>
                      <span className={`remembered-role ${getRoleColor(u.roleKey)}`}>
                        {u.roleName}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="remembered-other-account"
                onClick={() => { setEmail(''); setError(''); setView('full'); }}
              >
                Usar otra cuenta
              </button>
            </>
          )}

          {/* ── VISTA: contraseña rápida ── */}
          {view === 'quick' && selectedUser && (
            <>
              <button type="button" className="login-back-btn" onClick={handleBack}>
                <ChevronLeft size={16} />
                Volver
              </button>

              <div className="login-form-header">
                <div className="quick-user-hero">
                  <div className="quick-user-avatar">
                  {selectedUser.photoUrl
                    ? <img src={selectedUser.photoUrl} alt={selectedUser.firstName} className="remembered-avatar-img" />
                    : getInitials(selectedUser)}
                </div>
                  <div>
                    <p className="quick-user-name">{selectedUser.firstName} {selectedUser.lastName}</p>
                    <p className="quick-user-email">{selectedUser.email}</p>
                  </div>
                </div>
              </div>

              {selectedUser.hasPin && !usePasswordFallback ? (
                <div className="login-form">
                  <div className="login-form-group">
                    <label className="login-form-label pin-form-label">PIN de acceso</label>
                    <PinInput
                      value={pin}
                      onChange={setPin}
                      onComplete={handlePinComplete}
                      autoFocus
                      error={!!error}
                      disabled={isLoading}
                    />
                  </div>

                  {error && (
                    <div className="login-error" role="alert">
                      <span className="login-error-icon">⚠</span>
                      {error}
                    </div>
                  )}

                  {isLoading && (
                    <div className="pin-loading">
                      <span className="login-spinner" />
                      Ingresando...
                    </div>
                  )}

                  <button
                    type="button"
                    className="login-pin-fallback-btn"
                    onClick={() => { setError(''); setPin(''); setUsePasswordFallback(true); }}
                  >
                    ¿Olvidaste tu PIN? Usa tu contraseña
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="login-form">
                  <div className="login-form-group">
                    <label className="login-form-label">Contraseña</label>
                    <div className="login-input-wrapper">
                      <Lock className="login-input-icon" size={16} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoFocus
                        className="login-form-input login-input-with-icon login-input-with-toggle"
                        placeholder="••••••••"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="login-password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        onMouseDown={(e) => e.preventDefault()}
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

                  <button type="submit" className="login-submit-btn" disabled={isLoading}>
                    {isLoading ? (
                      <><span className="login-spinner" />Ingresando...</>
                    ) : (
                      'Ingresar al sistema'
                    )}
                  </button>

                  {selectedUser.hasPin && usePasswordFallback && (
                    <button
                      type="button"
                      className="login-pin-fallback-btn"
                      onClick={() => { setError(''); setPassword(''); setUsePasswordFallback(false); }}
                    >
                      Usar PIN
                    </button>
                  )}
                </form>
              )}
            </>
          )}

          {/* ── VISTA: formulario completo ── */}
          {view === 'full' && (
            <>
              {remembered.length > 0 && (
                <button type="button" className="login-back-btn" onClick={() => setView('cards')}>
                  <ChevronLeft size={16} />
                  Volver a cuentas
                </button>
              )}

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
                      onMouseDown={(e) => e.preventDefault()}
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

                <button type="submit" className="login-submit-btn" disabled={isLoading}>
                  {isLoading ? (
                    <><span className="login-spinner" />Ingresando...</>
                  ) : (
                    'Ingresar al sistema'
                  )}
                </button>
              </form>
            </>
          )}

          <div className="login-form-version">v{APP_VERSION}</div>
        </div>
      </div>
    </div>
  );
}

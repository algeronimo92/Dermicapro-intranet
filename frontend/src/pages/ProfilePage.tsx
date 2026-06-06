import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth.service';
import { usersService } from '../services/users.service';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { CameraCapture } from '../components/CameraCapture';
import './ProfilePage.css';

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: 'Muy débil', color: 'var(--color-error)' };
  if (score === 2) return { score, label: 'Débil', color: 'var(--color-warning)' };
  if (score === 3) return { score, label: 'Regular', color: 'var(--color-warning-light)' };
  if (score === 4) return { score, label: 'Fuerte', color: 'var(--color-success)' };
  return { score, label: 'Muy fuerte', color: 'var(--color-success-dark)' };
}

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();

  const roleName = typeof user?.role === 'string' ? user.role : user?.role?.displayName ?? '';
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  // ── Photo ──
  const [showCamera, setShowCamera] = useState(false);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPhotoMenu) return;
    const handler = (e: MouseEvent) => {
      if (photoMenuRef.current && !photoMenuRef.current.contains(e.target as Node)) {
        setShowPhotoMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPhotoMenu]);

  const handlePhotoFile = async (file: File) => {
    if (!user) return;
    setPhotoLoading(true);
    setPhotoError('');
    try {
      const updated = await usersService.uploadPhoto(user.id, file);
      updateUser({ ...user, photoUrl: updated.photoUrl });
    } catch (err: any) {
      setPhotoError(err.response?.data?.error || 'No se pudo subir la foto. Intenta de nuevo.');
    } finally {
      setPhotoLoading(false);
      setShowCamera(false);
      setShowPhotoMenu(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePhotoFile(file);
    e.target.value = '';
  };

  // ── Info form ──
  const [infoForm, setInfoForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    sex: (user?.sex ?? '') as '' | 'M' | 'F' | 'Other',
  });
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoSuccess, setInfoSuccess] = useState('');
  const [infoError, setInfoError] = useState('');

  const handleInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setInfoForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setInfoSuccess('');
    setInfoError('');
  };

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!infoForm.firstName.trim() || !infoForm.lastName.trim() || !infoForm.email.trim()) {
      setInfoError('Nombre, apellido y correo son obligatorios');
      return;
    }
    try {
      setInfoLoading(true);
      setInfoError('');
      const updated = await authService.updateMe({
        firstName: infoForm.firstName,
        lastName: infoForm.lastName,
        email: infoForm.email,
        sex: infoForm.sex || undefined,
      });
      if (user) updateUser({ ...user, ...updated });
      setInfoSuccess('Datos actualizados correctamente');
    } catch (err: any) {
      setInfoError(err.response?.data?.error ?? 'Error al actualizar los datos');
    } finally {
      setInfoLoading(false);
    }
  };

  // ── Password form ──
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');

  const handlePwChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPwForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setPwSuccess('');
    setPwError('');
  };

  const handlePwSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword) {
      setPwError('Completa todos los campos');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('Las contraseñas no coinciden');
      return;
    }
    try {
      setPwLoading(true);
      setPwError('');
      await authService.changePassword(pwForm.currentPassword, pwForm.newPassword);
      setPwSuccess('Contraseña actualizada correctamente');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setPwError(err.response?.data?.error ?? 'Error al cambiar la contraseña');
    } finally {
      setPwLoading(false);
    }
  };

  const strength = pwForm.newPassword ? getPasswordStrength(pwForm.newPassword) : null;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Mi Perfil</h1>
      </div>

      {/* ── Avatar hero ── */}
      <div className="profile-hero">
        <div className="profile-avatar-area" ref={photoMenuRef}>
          <div className={`profile-avatar${photoLoading ? ' profile-avatar--loading' : ''}`}>
            {user?.photoUrl
              ? <img src={user.photoUrl} alt={user.firstName} className="profile-avatar-img" />
              : <span className="profile-avatar-initials">{initials}</span>}
            {photoLoading && <div className="profile-avatar-spinner" />}
          </div>

          <button
            className="profile-avatar-edit"
            onClick={() => setShowPhotoMenu(p => !p)}
            title="Cambiar foto"
            aria-label="Cambiar foto de perfil"
          >
            <Camera size={15} />
          </button>

          {showPhotoMenu && (
            <div className="profile-photo-menu">
              <button className="profile-photo-menu-item" onClick={() => { setShowCamera(true); setShowPhotoMenu(false); }}>
                <Camera size={15} />
                Tomar foto
              </button>
              <button className="profile-photo-menu-item" onClick={() => { fileInputRef.current?.click(); setShowPhotoMenu(false); }}>
                <Upload size={15} />
                Subir imagen
              </button>
            </div>
          )}
        </div>

        <div className="profile-hero-meta">
          <h2 className="profile-hero-name">{user?.firstName} {user?.lastName}</h2>
          <span className="profile-hero-role">{roleName}</span>
          <span className="profile-hero-email">{user?.email}</span>
        </div>

        {photoError && (
          <p className="profile-photo-error">
            <AlertCircle size={14} /> {photoError}
          </p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
      </div>

      {/* ── Cards ── */}
      <div className="profile-cards">

        {/* Información personal */}
        <div className="card">
          <div className="card-header">
            <h2 className="profile-card-title">Información Personal</h2>
          </div>
          <div className="profile-card-body">
            <form onSubmit={handleInfoSubmit} className="profile-form">
              <div className="profile-form-row">
                <Input label="Nombres *" name="firstName" value={infoForm.firstName} onChange={handleInfoChange} />
                <Input label="Apellidos *" name="lastName" value={infoForm.lastName} onChange={handleInfoChange} />
              </div>
              <Input label="Correo Electrónico *" type="email" name="email" value={infoForm.email} onChange={handleInfoChange} />
              <Select
                label="Sexo"
                name="sex"
                value={infoForm.sex}
                onChange={handleInfoChange}
                options={[
                  { value: 'M', label: 'Masculino' },
                  { value: 'F', label: 'Femenino' },
                  { value: 'Other', label: 'Otro' },
                ]}
              />

              {infoError && (
                <div className="profile-alert profile-alert--error">
                  <AlertCircle size={15} /> {infoError}
                </div>
              )}
              {infoSuccess && (
                <div className="profile-alert profile-alert--success">
                  <CheckCircle size={15} /> {infoSuccess}
                </div>
              )}

              <Button type="submit" variant="primary" disabled={infoLoading}>
                {infoLoading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </form>
          </div>
        </div>

        {/* Cambiar contraseña */}
        <div className="card">
          <div className="card-header">
            <h2 className="profile-card-title">Cambiar Contraseña</h2>
          </div>
          <div className="profile-card-body">
            <form onSubmit={handlePwSubmit} className="profile-form">

              {/* Contraseña actual */}
              <div className="profile-pw-field">
                <Input
                  label="Contraseña Actual *"
                  type={showPw.current ? 'text' : 'password'}
                  name="currentPassword"
                  value={pwForm.currentPassword}
                  onChange={handlePwChange}
                  placeholder="••••••••"
                />
                <button type="button" className="profile-pw-toggle" onClick={() => setShowPw(p => ({ ...p, current: !p.current }))}>
                  {showPw.current ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Nueva contraseña */}
              <div className="profile-pw-field">
                <Input
                  label="Nueva Contraseña *"
                  type={showPw.new ? 'text' : 'password'}
                  name="newPassword"
                  value={pwForm.newPassword}
                  onChange={handlePwChange}
                  placeholder="Mínimo 6 caracteres"
                />
                <button type="button" className="profile-pw-toggle" onClick={() => setShowPw(p => ({ ...p, new: !p.new }))}>
                  {showPw.new ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Indicador de fortaleza */}
              {strength && (
                <div className="profile-strength">
                  <div className="profile-strength-bar">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div
                        key={i}
                        className="profile-strength-segment"
                        style={{ background: i <= strength.score ? strength.color : 'var(--color-border-primary)' }}
                      />
                    ))}
                  </div>
                  <span className="profile-strength-label" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
              )}

              {/* Confirmar contraseña */}
              <div className="profile-pw-field">
                <Input
                  label="Confirmar Nueva Contraseña *"
                  type={showPw.confirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={pwForm.confirmPassword}
                  onChange={handlePwChange}
                  placeholder="••••••••"
                />
                <button type="button" className="profile-pw-toggle" onClick={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))}>
                  {showPw.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {pwError && (
                <div className="profile-alert profile-alert--error">
                  <AlertCircle size={15} /> {pwError}
                </div>
              )}
              {pwSuccess && (
                <div className="profile-alert profile-alert--success">
                  <CheckCircle size={15} /> {pwSuccess}
                </div>
              )}

              <Button type="submit" variant="primary" disabled={pwLoading}>
                {pwLoading ? 'Actualizando...' : 'Cambiar Contraseña'}
              </Button>
            </form>
          </div>
        </div>

      </div>

      {showCamera && (
        <CameraCapture
          onCapture={handlePhotoFile}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth.service';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Button } from '../components/Button';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  const roleName = typeof user?.role === 'string' ? user.role : user?.role?.displayName ?? '';

  const [infoForm, setInfoForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    sex: (user?.sex ?? '') as '' | 'M' | 'F' | 'Other',
  });
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoSuccess, setInfoSuccess] = useState('');
  const [infoError, setInfoError] = useState('');

  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');

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
      await authService.updateMe({
        firstName: infoForm.firstName,
        lastName: infoForm.lastName,
        email: infoForm.email,
        sex: infoForm.sex || undefined,
      });
      setInfoSuccess('Datos actualizados correctamente');
    } catch (err: any) {
      setInfoError(err.response?.data?.error ?? 'Error al actualizar los datos');
    } finally {
      setInfoLoading(false);
    }
  };

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

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Mi Perfil</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-xl)', alignItems: 'start' }}>

        {/* ─── Información personal ─── */}
        <div className="card">
          <div className="card-header">
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', margin: 0 }}>
              Información Personal
            </h2>
          </div>

          <div style={{ padding: 'var(--spacing-lg)' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)',
              marginBottom: 'var(--spacing-lg)',
              padding: 'var(--spacing-md)',
              backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: 'var(--radius-md)',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                backgroundColor: 'var(--color-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem', fontWeight: 'var(--font-weight-bold)', color: 'white',
                flexShrink: 0,
              }}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div>
                <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
                  {user?.firstName} {user?.lastName}
                </div>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                  {roleName}
                </div>
              </div>
            </div>

            <form onSubmit={handleInfoSubmit} style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
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

              {infoError && <p style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-sm)', margin: 0 }}>{infoError}</p>}
              {infoSuccess && <p style={{ color: 'var(--color-success)', fontSize: 'var(--font-size-sm)', margin: 0 }}>{infoSuccess}</p>}

              <Button type="submit" variant="primary" disabled={infoLoading}>
                {infoLoading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </form>
          </div>
        </div>

        {/* ─── Cambiar contraseña ─── */}
        <div className="card">
          <div className="card-header">
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', margin: 0 }}>
              Cambiar Contraseña
            </h2>
          </div>

          <div style={{ padding: 'var(--spacing-lg)' }}>
            <form onSubmit={handlePwSubmit} style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
              <Input
                label="Contraseña Actual *"
                type="password"
                name="currentPassword"
                value={pwForm.currentPassword}
                onChange={handlePwChange}
                placeholder="••••••••"
              />
              <Input
                label="Nueva Contraseña *"
                type="password"
                name="newPassword"
                value={pwForm.newPassword}
                onChange={handlePwChange}
                placeholder="Mínimo 6 caracteres"
              />
              <Input
                label="Confirmar Nueva Contraseña *"
                type="password"
                name="confirmPassword"
                value={pwForm.confirmPassword}
                onChange={handlePwChange}
                placeholder="••••••••"
              />

              {pwError && <p style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-sm)', margin: 0 }}>{pwError}</p>}
              {pwSuccess && <p style={{ color: 'var(--color-success)', fontSize: 'var(--font-size-sm)', margin: 0 }}>{pwSuccess}</p>}

              <Button type="submit" variant="primary" disabled={pwLoading}>
                {pwLoading ? 'Actualizando...' : 'Cambiar Contraseña'}
              </Button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

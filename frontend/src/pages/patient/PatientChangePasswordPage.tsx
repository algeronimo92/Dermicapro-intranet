import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatientAuth } from '../../contexts/PatientAuthContext';
import './PatientChangePasswordPage.css';

const PatientChangePasswordPage: React.FC = () => {
  const { changePassword } = usePatientAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validaciones de contraseña
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword === confirmNewPassword && newPassword !== '';

  const isValidPassword = hasMinLength && hasUppercase && hasLowercase && hasNumber && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isValidPassword) {
      setError('La contraseña no cumple con los requisitos');
      return;
    }

    setIsSubmitting(true);

    try {
      await changePassword({
        currentPassword,
        newPassword,
        confirmNewPassword,
      });
      setSuccess('Contraseña actualizada correctamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');

      // Redirigir al dashboard después de 2 segundos
      setTimeout(() => {
        navigate('/patient/dashboard');
      }, 2000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Error al cambiar la contraseña';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="patient-change-password-page">
      <div className="patient-change-password-container">
        <button
          type="button"
          className="patient-change-password-back"
          onClick={() => navigate('/patient/dashboard')}
        >
          Volver al Dashboard
        </button>

        <h1 className="patient-change-password-title">Cambiar Contraseña</h1>
        <p className="patient-change-password-subtitle">
          Ingresa tu contraseña actual y define una nueva contraseña segura.
        </p>

        <form onSubmit={handleSubmit} className="patient-change-password-form">
          <div className="patient-change-password-form-group">
            <label className="patient-change-password-label">
              Contraseña Actual
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="patient-change-password-input"
              placeholder="Ingresa tu contraseña actual"
            />
          </div>

          <div className="patient-change-password-form-group">
            <label className="patient-change-password-label">
              Nueva Contraseña
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="patient-change-password-input"
              placeholder="Ingresa tu nueva contraseña"
            />
          </div>

          <div className="patient-change-password-form-group">
            <label className="patient-change-password-label">
              Confirmar Nueva Contraseña
            </label>
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
              className="patient-change-password-input"
              placeholder="Confirma tu nueva contraseña"
            />
          </div>

          <div className="patient-change-password-requirements">
            <p className="patient-change-password-requirements-title">
              Requisitos de la contraseña:
            </p>
            <ul className="patient-change-password-requirements-list">
              <li className={hasMinLength ? 'valid' : ''}>
                {hasMinLength ? '✓' : '○'} Mínimo 8 caracteres
              </li>
              <li className={hasUppercase ? 'valid' : ''}>
                {hasUppercase ? '✓' : '○'} Al menos una mayúscula
              </li>
              <li className={hasLowercase ? 'valid' : ''}>
                {hasLowercase ? '✓' : '○'} Al menos una minúscula
              </li>
              <li className={hasNumber ? 'valid' : ''}>
                {hasNumber ? '✓' : '○'} Al menos un número
              </li>
              <li className={passwordsMatch ? 'valid' : ''}>
                {passwordsMatch ? '✓' : '○'} Las contraseñas coinciden
              </li>
            </ul>
          </div>

          {error && (
            <div className="patient-change-password-error">
              {error}
            </div>
          )}

          {success && (
            <div className="patient-change-password-success">
              {success}
            </div>
          )}

          <button
            type="submit"
            className="patient-change-password-submit-btn"
            disabled={isSubmitting || !isValidPassword}
          >
            {isSubmitting ? 'Cambiando...' : 'Cambiar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PatientChangePasswordPage;

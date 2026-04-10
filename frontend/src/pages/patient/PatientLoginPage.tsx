import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { usePatientAuth } from '../../contexts/PatientAuthContext';
import './PatientLoginPage.css';

const PatientLoginPage: React.FC = () => {
  const { login, isAuthenticated, isLoading } = usePatientAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirigir si ya está autenticado
  if (isAuthenticated) {
    return <Navigate to="/patient/dashboard" replace />;
  }

  // Mostrar loading mientras se verifica autenticación
  if (isLoading) {
    return (
      <div className="patient-login-page">
        <div className="patient-login-container">
          <div className="patient-login-loading">Cargando...</div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/patient/dashboard');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Error al iniciar sesión';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="patient-login-page">
      <div className="patient-login-container">
        <div className="patient-login-header">
          <h1 className="patient-login-logo">DermicaPro</h1>
          <h2 className="patient-login-title">Portal del Paciente</h2>
          <p className="patient-login-subtitle">
            Accede a tu historial médico, citas y pagos
          </p>
        </div>

        <form onSubmit={handleSubmit} className="patient-login-form">
          <div className="patient-login-form-group">
            <label className="patient-login-form-label">
              Usuario (DNI)
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="patient-login-form-input"
              placeholder="Ingresa tu DNI"
              autoComplete="username"
            />
          </div>

          <div className="patient-login-form-group">
            <label className="patient-login-form-label">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="patient-login-form-input"
              placeholder="Ingresa tu contraseña"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="patient-login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="patient-login-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div className="patient-login-info">
          <p>
            Si no tienes acceso o olvidaste tu contraseña, contacta a la clínica.
          </p>
          <p className="patient-login-hint">
            Tu usuario y contraseña inicial es tu número de DNI.
          </p>
        </div>

        <div className="patient-login-footer">
          <a href="/login" className="patient-login-staff-link">
            Acceso para personal
          </a>
        </div>
      </div>
    </div>
  );
};

export default PatientLoginPage;

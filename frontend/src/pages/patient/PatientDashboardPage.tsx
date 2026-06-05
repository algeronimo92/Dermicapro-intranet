import React, { useState } from 'react';
import { usePatientAuth } from '../../contexts/PatientAuthContext';
import { useNavigate } from 'react-router-dom';
import './PatientDashboardPage.css';

const PatientDashboardPage: React.FC = () => {
  const { patient, logout } = usePatientAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/patient/login');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // Get initials for avatar
  const getInitials = () => {
    if (!patient) return '?';
    const first = patient.firstName?.[0] || '';
    const last = patient.lastName?.[0] || '';
    return (first + last).toUpperCase();
  };

  return (
    <div className="patient-dashboard">
      {/* Mobile Header */}
      <header className="patient-dashboard-mobile-header">
        <button
          className="patient-dashboard-mobile-menu-btn"
          onClick={toggleSidebar}
          aria-label="Abrir menu"
        >
          ☰
        </button>
        <span className="patient-dashboard-mobile-logo">DermicaPro</span>
        <div className="patient-dashboard-mobile-user">
          {getInitials()}
        </div>
      </header>

      {/* Mobile Overlay */}
      <div
        className={`patient-dashboard-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <aside className={`patient-dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="patient-dashboard-sidebar-header">
          <h1 className="patient-dashboard-logo">DermicaPro</h1>
          <span className="patient-dashboard-portal-tag">Portal del Paciente</span>
        </div>

        <div className="patient-dashboard-user-section">
          <div className="patient-dashboard-user-avatar">
            {getInitials()}
          </div>
          <p className="patient-dashboard-user-name">
            {patient?.firstName} {patient?.lastName}
          </p>
          <p className="patient-dashboard-user-dni">DNI: {patient?.dni}</p>
        </div>

        <nav className="patient-dashboard-nav">
          <button className="patient-dashboard-nav-item active" onClick={closeSidebar}>
            <span className="patient-dashboard-nav-item-icon">🏠</span>
            Inicio
          </button>
          <button className="patient-dashboard-nav-item disabled">
            <span className="patient-dashboard-nav-item-icon">📅</span>
            Mis Citas
            <span className="patient-dashboard-nav-item-badge">Pronto</span>
          </button>
          <button className="patient-dashboard-nav-item disabled">
            <span className="patient-dashboard-nav-item-icon">💉</span>
            Mis Tratamientos
            <span className="patient-dashboard-nav-item-badge">Pronto</span>
          </button>
          <button className="patient-dashboard-nav-item disabled">
            <span className="patient-dashboard-nav-item-icon">📋</span>
            Historial Medico
            <span className="patient-dashboard-nav-item-badge">Pronto</span>
          </button>
          <button className="patient-dashboard-nav-item disabled">
            <span className="patient-dashboard-nav-item-icon">💰</span>
            Órdenes de Pago
            <span className="patient-dashboard-nav-item-badge">Pronto</span>
          </button>
          <button
            className="patient-dashboard-nav-item"
            onClick={() => {
              closeSidebar();
              navigate('/patient/change-password');
            }}
          >
            <span className="patient-dashboard-nav-item-icon">🔐</span>
            Cambiar Contrasena
          </button>
        </nav>

        <div className="patient-dashboard-sidebar-footer">
          <button onClick={handleLogout} className="patient-dashboard-logout-btn">
            <span>🚪</span>
            Cerrar Sesion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="patient-dashboard-main">
        {/* Welcome Section */}
        <section className="patient-dashboard-welcome">
          <h1>Bienvenido(a), {patient?.firstName}!</h1>
          <p>Desde aqui puedes ver tu historial medico, citas, tratamientos y pagos.</p>
        </section>

        {/* Stats Cards */}
        <section className="patient-dashboard-stats">
          <div className="patient-dashboard-stat-card">
            <div className="patient-dashboard-stat-icon purple">📅</div>
            <div className="patient-dashboard-stat-content">
              <h3>Proxima Cita</h3>
              <p className="value">--</p>
              <p className="subtext">Sin citas programadas</p>
            </div>
          </div>

          <div className="patient-dashboard-stat-card">
            <div className="patient-dashboard-stat-icon blue">💉</div>
            <div className="patient-dashboard-stat-content">
              <h3>Sesiones Pendientes</h3>
              <p className="value">0</p>
              <p className="subtext">Tratamientos activos</p>
            </div>
          </div>

          <div className="patient-dashboard-stat-card">
            <div className="patient-dashboard-stat-icon orange">💰</div>
            <div className="patient-dashboard-stat-content">
              <h3>Saldo Pendiente</h3>
              <p className="value">S/ 0.00</p>
              <p className="subtext">Al dia</p>
            </div>
          </div>

          <div className="patient-dashboard-stat-card">
            <div className="patient-dashboard-stat-icon green">✓</div>
            <div className="patient-dashboard-stat-content">
              <h3>Ultima Visita</h3>
              <p className="value">--</p>
              <p className="subtext">Sin visitas registradas</p>
            </div>
          </div>
        </section>

        {/* Content Grid */}
        <section className="patient-dashboard-content">
          {/* Left Column - Actions & Appointments */}
          <div>
            {/* Quick Actions Card */}
            <div className="patient-dashboard-card">
              <div className="patient-dashboard-card-header">
                <h2>⚡ Acciones Rapidas</h2>
              </div>
              <div className="patient-dashboard-card-body">
                <div className="patient-dashboard-actions">
                  <button className="patient-dashboard-action-btn disabled">
                    <span className="patient-dashboard-action-icon">📅</span>
                    <div className="patient-dashboard-action-text">
                      <h4>Ver Citas</h4>
                      <p>Proximamente</p>
                    </div>
                  </button>
                  <button className="patient-dashboard-action-btn disabled">
                    <span className="patient-dashboard-action-icon">💉</span>
                    <div className="patient-dashboard-action-text">
                      <h4>Mis Tratamientos</h4>
                      <p>Proximamente</p>
                    </div>
                  </button>
                  <button className="patient-dashboard-action-btn disabled">
                    <span className="patient-dashboard-action-icon">📋</span>
                    <div className="patient-dashboard-action-text">
                      <h4>Historial Medico</h4>
                      <p>Proximamente</p>
                    </div>
                  </button>
                  <button className="patient-dashboard-action-btn disabled">
                    <span className="patient-dashboard-action-icon">💰</span>
                    <div className="patient-dashboard-action-text">
                      <h4>Ver Pagos</h4>
                      <p>Proximamente</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Appointments Card */}
            <div className="patient-dashboard-card" style={{ marginTop: '1.5rem' }}>
              <div className="patient-dashboard-card-header">
                <h2>📅 Proximas Citas</h2>
                <button className="patient-dashboard-card-link" disabled>
                  Ver todas
                </button>
              </div>
              <div className="patient-dashboard-card-body">
                <div className="patient-dashboard-empty-state">
                  <div className="patient-dashboard-empty-state-icon">📅</div>
                  <p>No tienes citas programadas</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Profile */}
          <div>
            {/* Profile Card */}
            <div className="patient-dashboard-card">
              <div className="patient-dashboard-card-header">
                <h2>👤 Mi Perfil</h2>
              </div>
              <div className="patient-dashboard-card-body">
                <div className="patient-dashboard-profile-info">
                  <div className="patient-dashboard-profile-row">
                    <span className="patient-dashboard-profile-icon">🪪</span>
                    <span className="patient-dashboard-profile-label">DNI</span>
                    <span className="patient-dashboard-profile-value">{patient?.dni}</span>
                  </div>
                  <div className="patient-dashboard-profile-row">
                    <span className="patient-dashboard-profile-icon">✉️</span>
                    <span className="patient-dashboard-profile-label">Email</span>
                    <span className="patient-dashboard-profile-value">{patient?.email}</span>
                  </div>
                  <div className="patient-dashboard-profile-row">
                    <span className="patient-dashboard-profile-icon">📞</span>
                    <span className="patient-dashboard-profile-label">Telefono</span>
                    <span className="patient-dashboard-profile-value">
                      {patient?.phone || 'No registrado'}
                    </span>
                  </div>
                </div>
                <button
                  className="patient-dashboard-change-password-btn"
                  onClick={() => navigate('/patient/change-password')}
                >
                  🔐 Cambiar Contrasena
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default PatientDashboardPage;

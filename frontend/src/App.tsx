import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { PatientsPage } from './pages/PatientsPage';
import { PatientFormPage } from './pages/PatientFormPage';
import { PatientDetailPage } from './pages/PatientDetailPage';
import { PatientHistoryPage } from './pages/PatientHistoryPage';
import { PatientInvoicesPage } from './pages/PatientInvoicesPage';
import CreateInvoicePage from './pages/CreateInvoicePage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { AppointmentFormPage } from './pages/AppointmentFormPage';
import { AppointmentDetailPage } from './pages/AppointmentDetailPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { EmployeeFormPage } from './pages/EmployeeFormPage';
import { EmployeeDetailPage } from './pages/EmployeeDetailPage';
import { ServicesPage } from './pages/ServicesPage';
import { ServiceFormPage } from './pages/ServiceFormPage';
import { RolesPage } from './pages/RolesPage';
import { RoleFormPage } from './pages/RoleFormPage';
import { RoleDetailPage } from './pages/RoleDetailPage';
import SettingsPage from './pages/SettingsPage';
import './styles/design-tokens.css';
import './styles/auth.css';
import './styles/dashboard.css';
import './styles/settings.css';
import './styles/roles.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="login-loading">Cargando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1 className="login-logo">DermicaPro</h1>
          <h2 className="login-title">Iniciar Sesión</h2>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-form-group">
            <label className="login-form-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="login-form-input"
              placeholder="usuario@dermicapro.com"
            />
          </div>

          <div className="login-form-group">
            <label className="login-form-label">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="login-form-input"
              placeholder="••••••••"
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-submit-btn">
            Ingresar
          </button>
        </form>

        <div className="login-footer">
          <div className="login-demo-info">
            <p><strong>Usuarios de prueba:</strong></p>
            <p>Admin: admin@dermicapro.com / admin123</p>
            <p>Enfermera: enfermera@dermicapro.com / nurse123</p>
            <p>Ventas: ventas@dermicapro.com / sales123</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardLayout() {
  const { user, logout } = useAuth();

  // Helper para verificar el nombre del rol (soporta tanto string como objeto)
  const hasRole = (roleName: string) => {
    if (!user?.role) return false;
    return typeof user.role === 'string'
      ? user.role === roleName
      : user.role.name === roleName;
  };

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-logo">DermicaPro</h1>
        </div>

        <div className="sidebar-user">
          <p className="sidebar-user-name">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="sidebar-user-role">
            {typeof user?.role === 'string' ? user.role : user?.role?.displayName}
          </p>
        </div>

        <nav className="sidebar-nav">
          <ul className="sidebar-nav-list">
            <li className="sidebar-nav-item">
              <NavLink to="/" end className="sidebar-nav-link">
                <span className="sidebar-nav-icon">🏠</span>
                Dashboard
              </NavLink>
            </li>
            <li className="sidebar-nav-item">
              <NavLink to="/patients" className="sidebar-nav-link">
                <span className="sidebar-nav-icon">👥</span>
                Pacientes
              </NavLink>
            </li>
            <li className="sidebar-nav-item">
              <NavLink to="/appointments" className="sidebar-nav-link">
                <span className="sidebar-nav-icon">📅</span>
                Citas
              </NavLink>
            </li>
            {hasRole('admin') && (
              <>
                <li className="sidebar-nav-item">
                  <NavLink to="/services" className="sidebar-nav-link">
                    <span className="sidebar-nav-icon">💉</span>
                    Servicios
                  </NavLink>
                </li>
                <li className="sidebar-nav-item">
                  <NavLink to="/employees" className="sidebar-nav-link">
                    <span className="sidebar-nav-icon">👨‍⚕️</span>
                    Recursos Humanos
                  </NavLink>
                </li>
                <li className="sidebar-nav-item">
                  <NavLink to="/roles" className="sidebar-nav-link">
                    <span className="sidebar-nav-icon">🔐</span>
                    Roles y Permisos
                  </NavLink>
                </li>
                <li className="sidebar-nav-item">
                  <NavLink to="/analytics" className="sidebar-nav-link">
                    <span className="sidebar-nav-icon">📊</span>
                    Analíticas
                  </NavLink>
                </li>
              </>
            )}
            <li className="sidebar-nav-item">
              <NavLink to="/settings" className="sidebar-nav-link">
                <span className="sidebar-nav-icon">⚙️</span>
                Configuración
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button onClick={logout} className="sidebar-logout-btn">
            <span>🚪</span>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <div className="dashboard-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/patients/new" element={<PatientFormPage />} />
            <Route path="/patients/:id" element={<PatientDetailPage />} />
            <Route path="/patients/:id/edit" element={<PatientFormPage />} />
            <Route path="/patients/:id/history" element={<PatientHistoryPage />} />
            <Route path="/patients/:id/invoices" element={<PatientInvoicesPage />} />
            <Route path="/patients/:id/create-invoice" element={<CreateInvoicePage />} />
            <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="/appointments" element={<AppointmentsPage />} />
            <Route path="/appointments/new" element={<AppointmentFormPage />} />
            <Route path="/appointments/:id" element={<AppointmentDetailPage />} />
            <Route path="/appointments/:id/edit" element={<AppointmentFormPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/services/new" element={<ServiceFormPage />} />
            <Route path="/services/:id/edit" element={<ServiceFormPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/employees/new" element={<EmployeeFormPage />} />
            <Route path="/employees/:id" element={<EmployeeDetailPage />} />
            <Route path="/employees/:id/edit" element={<EmployeeFormPage />} />
            <Route path="/roles" element={<RolesPage />} />
            <Route path="/roles/new" element={<RoleFormPage />} />
            <Route path="/roles/:id" element={<RoleDetailPage />} />
            <Route path="/roles/:id/edit" element={<RoleFormPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/analytics" element={<div>Analíticas</div>} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="dashboard-home">
      <div className="dashboard-welcome">
        <h1 className="dashboard-welcome-title">
          Bienvenido, {user?.firstName}
        </h1>
        <p className="dashboard-welcome-subtitle">
          Sistema de gestión de DermicaPro - {new Date().toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
      </div>

      <div className="dashboard-stats">
        <div className="dashboard-stat-card">
          <p className="dashboard-stat-label">Citas de hoy</p>
          <p className="dashboard-stat-value">0</p>
        </div>
        <div className="dashboard-stat-card">
          <p className="dashboard-stat-label">Pacientes activos</p>
          <p className="dashboard-stat-value">0</p>
        </div>
        <div className="dashboard-stat-card">
          <p className="dashboard-stat-label">Servicios</p>
          <p className="dashboard-stat-value">0</p>
        </div>
      </div>

      <div className="dashboard-quick-actions">
        <a href="/appointments/new" className="dashboard-action-btn">
          <span>📅</span>
          Nueva Cita
        </a>
        <a href="/patients/new" className="dashboard-action-btn">
          <span>👤</span>
          Nuevo Paciente
        </a>
        <a href="/appointments" className="dashboard-action-btn">
          <span>📋</span>
          Ver Calendario
        </a>
      </div>
    </div>
  );
}

export default App;

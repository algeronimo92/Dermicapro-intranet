import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { NAV_ITEMS, canAccessNav } from './config/navigation.config';
import { Sidebar } from './components/Sidebar';
import { useIdleTimeout } from './hooks/useIdleTimeout';
import { Timer } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PatientAuthProvider, usePatientAuth } from './contexts/PatientAuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SystemSettingsProvider, useSystemSettings } from './contexts/SystemSettingsContext';
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
import { EmployeeDetailPage } from './pages/EmployeeDetailPage';
import { ServicesPage } from './pages/ServicesPage';
import CommissionsPage from './pages/CommissionsPage';
import SettingsPage from './pages/SettingsPage';
import { StyleGuidePage } from './pages/StyleGuidePage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { AnalyticsPage } from './pages/analytics/AnalyticsPage';
import { LoginPage } from './pages/LoginPage';
import { FirstLoginModal } from './components/FirstLoginModal';
// Portal de Pacientes
import { PatientLoginPage, PatientDashboardPage, PatientChangePasswordPage } from './pages/patient';
import './styles/design-tokens.css';
import './styles/auth.css';
import './styles/dashboard.css';
import './styles/settings.css';
import './styles/commissions-page.css';

// Wrapper interno para SystemSettingsProvider (necesita acceso a useAuth)
function SystemSettingsWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return (
    <SystemSettingsProvider isAuthenticated={isAuthenticated}>
      {children}
    </SystemSettingsProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PatientAuthProvider>
          <SystemSettingsWrapper>
            <Router>
              <Routes>
                {/* Rutas del Portal de Pacientes */}
                <Route path="/patient/login" element={<PatientLoginPage />} />
                <Route
                  path="/patient/*"
                  element={
                    <ProtectedPatientRoute>
                      <PatientPortalRoutes />
                    </ProtectedPatientRoute>
                  }
                />

                {/* Rutas del Sistema de Staff */}
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
          </SystemSettingsWrapper>
        </PatientAuthProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

// Rutas protegidas del Portal de Pacientes
function ProtectedPatientRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = usePatientAuth();

  if (isLoading) {
    return <div className="login-loading">Cargando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/patient/login" replace />;
  }

  return <>{children}</>;
}

// Rutas del Portal de Pacientes
function PatientPortalRoutes() {
  return (
    <Routes>
      <Route path="dashboard" element={<PatientDashboardPage />} />
      <Route path="change-password" element={<PatientChangePasswordPage />} />
      <Route path="*" element={<Navigate to="/patient/dashboard" replace />} />
    </Routes>
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


const IDLE_WARNING_MS = 60 * 1000; // advertencia 1 min antes (fijo)

function DashboardLayout() {
  const { user, logout, mustChangePassword } = useAuth();
  const { sessionTimeoutMs } = useSystemSettings();

  const roleName    = typeof user?.role === 'string' ? user.role : (user?.role?.name ?? '');
  const roleDisplay = typeof user?.role === 'string' ? user.role : (user?.role?.displayName ?? '');
  const isAdmin     = roleName === 'admin';

  const { showWarning, secondsLeft, percentageRemaining, msRemaining, extendSession } = useIdleTimeout({
    timeout:       sessionTimeoutMs,
    warningBefore: IDLE_WARNING_MS,
    onTimeout:     logout,
  });

  // Anillo de cuenta regresiva del modal
  const warningTotal  = Math.floor(IDLE_WARNING_MS / 1000); // 60 s
  const pct           = secondsLeft / warningTotal;
  const isCritical    = secondsLeft <= 15;
  const ringColor     = isCritical ? 'var(--color-error)' : 'var(--color-warning)';
  const r    = 28;
  const circ = 2 * Math.PI * r;

  const fmtCountdown = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <>
      {mustChangePassword && <FirstLoginModal />}
      <div className="dashboard-layout">
        <Sidebar
          user={{ firstName: user?.firstName, lastName: user?.lastName, roleDisplay }}
          navItems={NAV_ITEMS.filter(item => canAccessNav(item, roleName))}
          onLogout={logout}
          idleInfo={isAdmin ? { percentage: percentageRemaining, msRemaining } : undefined}
        />
        <main className="dashboard-main">
          <div className="dashboard-content">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/patients" element={<PatientsPage />} />
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
              <Route path="/employees" element={<EmployeesPage />} />
              <Route path="/employees/:id" element={<EmployeeDetailPage />} />
              <Route path="/commissions" element={<CommissionsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/styleguide" element={<StyleGuidePage />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* Modal de inactividad */}
      {showWarning && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'var(--color-bg-overlay)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 'var(--z-modal-backdrop)' as any,
            padding: 'var(--spacing-md)',
          }}
        >
          <div style={{
            background: 'var(--color-bg-primary)',
            borderRadius: 'var(--radius-2xl)',
            boxShadow: 'var(--shadow-2xl)',
            border: '1px solid var(--color-border-secondary)',
            width: '100%', maxWidth: 360,
            overflow: 'hidden',
            padding: 'var(--spacing-xl)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 'var(--spacing-md)', textAlign: 'center',
          }}>
            {/* Anillo de cuenta regresiva */}
            <div style={{ position: 'relative', width: 80, height: 80 }}>
              <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="40" cy="40" r={r} fill="none"
                  stroke="var(--color-border-secondary)" strokeWidth="5" />
                <circle cx="40" cy="40" r={r} fill="none"
                  stroke={ringColor}
                  strokeWidth="5"
                  strokeDasharray={circ}
                  strokeDashoffset={circ * (1 - pct)}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
                />
              </svg>
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Timer size={22} strokeWidth={1.75} color={ringColor} />
              </div>
            </div>

            <div>
              <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: 6 }}>
                ¿Sigues ahí?
              </div>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 'var(--line-height-normal)' }}>
                La sesión cerrará en{' '}
                <strong style={{ color: ringColor }}>
                  {fmtCountdown(secondsLeft)}
                </strong>{' '}
                por inactividad.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', width: '100%' }}>
              <button
                onClick={logout}
                style={{
                  flex: 1, padding: '10px var(--spacing-md)',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--color-border-primary)',
                  background: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)',
                  cursor: 'pointer',
                }}
              >
                Cerrar sesión
              </button>
              <button
                autoFocus
                onClick={extendSession}
                style={{
                  flex: 2, padding: '10px var(--spacing-md)',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)',
                  cursor: 'pointer',
                }}
              >
                Continuar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;

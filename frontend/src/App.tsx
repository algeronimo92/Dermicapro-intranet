import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { hasTenantSubdomain } from './utils/tenantSubdomain';
import { PlatformLandingPage } from './pages/PlatformLandingPage';
import { NAV_ITEMS, canAccessNav } from './config/navigation.config';
import { Sidebar } from './components/Sidebar';
import { useIdleTimeout } from './hooks/useIdleTimeout';
import { Timer } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PatientAuthProvider, usePatientAuth } from './contexts/PatientAuthContext';
import { PlatformAuthProvider } from './contexts/PlatformAuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SystemSettingsProvider, useSystemSettings } from './contexts/SystemSettingsContext';
import { PatientsPage } from './pages/PatientsPage';
import { PatientFormPage } from './pages/PatientFormPage';
import { PatientDetailPage } from './pages/PatientDetailPage';
import { PatientHistoryPage } from './pages/PatientHistoryPage';
import { PatientPaymentOrdersPage } from './pages/PatientPaymentOrdersPage';
import CreatePaymentOrderPage from './pages/CreatePaymentOrderPage';
import PaymentOrderDetailPage from './pages/PaymentOrderDetailPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { AppointmentFormPage } from './pages/AppointmentFormPage';
import { AppointmentDetailPage } from './pages/AppointmentDetailPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { EmployeeDetailPage } from './pages/EmployeeDetailPage';
import { ServicesPage } from './pages/ServicesPage';
import CommissionsPage from './pages/CommissionsPage';
import { PaymentsAdminPage } from './pages/PaymentsAdminPage';
import SettingsPage from './pages/SettingsPage';
import { StyleGuidePage } from './pages/StyleGuidePage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { AnalyticsPage } from './pages/analytics/AnalyticsPage';
import { ImpersonatePage } from './pages/ImpersonatePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { FirstLoginModal } from './components/FirstLoginModal';
// Portal de Pacientes
import { PatientLoginPage, PatientDashboardPage, PatientChangePasswordPage } from './pages/patient';
import './styles/design-tokens.css';
import './styles/auth.css';
import './styles/dashboard.css';
import './styles/settings.css';
import './styles/commissions-page.css';
import './styles/superadmin.css';

const SuperAdminLoginPage = lazy(() => import('./pages/superadmin/SuperAdminLoginPage').then((module) => ({ default: module.SuperAdminLoginPage })));
const SuperAdminDashboardPage = lazy(() => import('./pages/superadmin/SuperAdminDashboardPage').then((module) => ({ default: module.SuperAdminDashboardPage })));
const SuperAdminTenantsPage = lazy(() => import('./pages/superadmin/SuperAdminTenantsPage').then((module) => ({ default: module.SuperAdminTenantsPage })));
const SuperAdminTenantDetailPage = lazy(() => import('./pages/superadmin/SuperAdminTenantDetailPage').then((module) => ({ default: module.SuperAdminTenantDetailPage })));
const SuperAdminAdminsPage = lazy(() => import('./pages/superadmin/SuperAdminAdminsPage').then((module) => ({ default: module.SuperAdminAdminsPage })));
const SuperAdminSettingsPage = lazy(() => import('./pages/superadmin/SuperAdminSettingsPage').then((module) => ({ default: module.SuperAdminSettingsPage })));
const SuperAdminLayout = lazy(() => import('./components/superadmin/SuperAdminLayout').then((module) => ({ default: module.SuperAdminLayout })));
const RequirePlatformAuth = lazy(() => import('./components/superadmin/RequirePlatformAuth').then((module) => ({ default: module.RequirePlatformAuth })));

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
          <PlatformAuthProvider>
            <SystemSettingsWrapper>
              <Router>
                <Suspense fallback={<div className="login-loading">Cargando...</div>}>
                  <Routes>
                    {/* Rutas de Superadmin */}
                    <Route path="/superadmin/login" element={<SuperAdminLoginPage />} />
                    <Route
                      path="/superadmin/*"
                      element={
                        <RequirePlatformAuth>
                          <SuperAdminLayout />
                        </RequirePlatformAuth>
                      }
                    >
                      <Route index element={<Navigate to="/superadmin/dashboard" replace />} />
                      <Route path="dashboard" element={<SuperAdminDashboardPage />} />
                      <Route path="tenants" element={<SuperAdminTenantsPage />} />
                      <Route path="tenants/:slug" element={<SuperAdminTenantDetailPage />} />
                      <Route path="admins" element={<SuperAdminAdminsPage />} />
                      <Route path="settings" element={<SuperAdminSettingsPage />} />
                    </Route>

                    {/* Ruta de impersonacion (tenant app) */}
                    <Route path="/impersonate" element={<ImpersonatePage />} />

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

                    {/* Rutas del Sistema de Staff — solo disponibles con subdominio de clínica */}
                    <Route path="/register" element={<RegisterPage />} />
                    <Route
                      path="/login"
                      element={hasTenantSubdomain() ? <LoginPage /> : <PlatformLandingPage />}
                    />
                    <Route
                      path="/*"
                      element={
                        hasTenantSubdomain()
                          ? <ProtectedRoute><DashboardLayout /></ProtectedRoute>
                          : <PlatformLandingPage />
                      }
                    />
                  </Routes>
                </Suspense>
              </Router>
            </SystemSettingsWrapper>
          </PlatformAuthProvider>
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
          user={{ firstName: user?.firstName, lastName: user?.lastName, roleDisplay, photoUrl: user?.photoUrl }}
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
              <Route path="/patients/:id/payment-orders" element={<PatientPaymentOrdersPage />} />
              <Route path="/patients/:id/create-payment-order" element={<CreatePaymentOrderPage />} />
              <Route path="/payment-orders/:id" element={<PaymentOrderDetailPage />} />
              <Route path="/appointments" element={<AppointmentsPage />} />
              <Route path="/appointments/new" element={<AppointmentFormPage />} />
              <Route path="/appointments/:id" element={<AppointmentDetailPage />} />
              <Route path="/appointments/:id/edit" element={<AppointmentFormPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/employees" element={<EmployeesPage />} />
              <Route path="/employees/:id" element={<EmployeeDetailPage />} />
              <Route path="/commissions" element={<CommissionsPage />} />
              <Route path="/payments" element={<PaymentsAdminPage />} />
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

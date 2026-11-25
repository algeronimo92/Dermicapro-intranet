import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { NAV_ITEMS, canAccessNav } from './config/navigation.config';
import { Sidebar } from './components/Sidebar';
import { useIdleTimeout } from './hooks/useIdleTimeout';
import { authService } from './services/auth.service';
import { IdleWarningModal } from './components/IdleWarningModal';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PatientAuthProvider, usePatientAuth } from './contexts/PatientAuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
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
import { InvoicesPage } from './pages/InvoicesPage';
import { InventoryPage } from './pages/InventoryPage';
import { InventoryMovementsPage } from './pages/InventoryMovementsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { DbPrivilegesPage } from './pages/DbPrivilegesPage';
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
import './styles/sidebar.css';
import './styles/controls.css';
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
  const { user, logout, mustChangePassword, updateUser, modules } = useAuth();
  const { sessionTimeoutMs } = useSystemSettings();
  const { resolvedTheme, setMode } = useTheme();

  // El tema vive en el perfil (themeMode): si solo se cambiara localmente,
  // el próximo login volvería a aplicar el guardado.
  const handleToggleTheme = async () => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    setMode(next);
    try {
      updateUser(await authService.updateMe({ themeMode: next }));
    } catch {
      // el cambio visual ya se aplicó; se reintenta la próxima vez
    }
  };

  const roleName    = typeof user?.role === 'string' ? user.role : (user?.role?.name ?? '');
  const roleDisplay = typeof user?.role === 'string' ? user.role : (user?.role?.displayName ?? '');
  const isAdmin     = roleName === 'admin';
  // Contador e inventario sólo usan los módulos que les asigna Empleados -> Privilegios.
  const isLimitedRole = roleName === 'accountant' || roleName === 'inventory';
  const limitedHome = modules.invoices.view ? '/invoices' : modules.inventory.view ? '/inventory' : null;

  const { showWarning, getMsRemaining, extendSession } = useIdleTimeout({
    timeout:       sessionTimeoutMs,
    warningBefore: IDLE_WARNING_MS,
    onTimeout:     logout,
  });

  return (
    <>
      {mustChangePassword && <FirstLoginModal />}
      <div className="dashboard-layout">
        <Sidebar
          user={{ firstName: user?.firstName, lastName: user?.lastName, roleDisplay, photoUrl: user?.photoUrl }}
          navItems={NAV_ITEMS.filter(item => canAccessNav(item, roleName, modules))}
          onLogout={logout}
          onToggleTheme={handleToggleTheme}
          idle={isAdmin ? { getMsRemaining, timeout: sessionTimeoutMs } : undefined}
        />
        <main className="dashboard-main">
          <div className="dashboard-content">
            <Routes>
              <Route path="/invoices/*" element={modules.invoices.view ? <InvoicesPage /> : <Navigate to="/" replace />} />
              <Route path="/inventory" element={modules.inventory.view ? <InventoryPage /> : <Navigate to="/" replace />} />
              <Route path="/inventory/movements" element={modules.inventory.move ? <InventoryMovementsPage /> : <Navigate to="/inventory" replace />} />
              <Route path="/inventory/:id" element={modules.inventory.view ? <ProductDetailPage /> : <Navigate to="/" replace />} />
              {isLimitedRole ? (
                <Route
                  path="*"
                  element={limitedHome ? <Navigate to={limitedHome} replace /> : (
                    <div className="alert alert-info">
                      Tu rol todavía no tiene módulos asignados. Pide al administrador que te los otorgue en Empleados → Privilegios.
                    </div>
                  )}
                />
              ) : (
                <>
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
                  <Route path="/employees/privileges" element={isAdmin ? <DbPrivilegesPage /> : <Navigate to="/" replace />} />
                  <Route path="/employees/:id" element={<EmployeeDetailPage />} />
                  <Route path="/commissions" element={<CommissionsPage />} />
                  <Route path="/payments" element={<PaymentsAdminPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/styleguide" element={<StyleGuidePage />} />
                </>
              )}
            </Routes>
          </div>
        </main>
      </div>

      {showWarning && (
        <IdleWarningModal
          getMsRemaining={getMsRemaining}
          warningMs={IDLE_WARNING_MS}
          onLogout={logout}
          onContinue={extendSession}
        />
      )}

    </>
  );
}

export default App;

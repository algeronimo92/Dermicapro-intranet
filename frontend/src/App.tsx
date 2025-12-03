import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PatientsPage } from './pages/PatientsPage';
import { PatientFormPage } from './pages/PatientFormPage';
import { PatientDetailPage } from './pages/PatientDetailPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { AppointmentFormPage } from './pages/AppointmentFormPage';
import { AppointmentDetailPage } from './pages/AppointmentDetailPage';

function App() {
  return (
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
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Cargando...</div>;
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
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px' }}>
      <h1>DermicaPro</h1>
      <h2>Iniciar Sesión</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Contraseña:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
        <button type="submit" style={{ width: '100%', padding: '10px' }}>
          Ingresar
        </button>
      </form>
      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p>Usuarios de prueba:</p>
        <p>Admin: admin@dermicapro.com / admin123</p>
        <p>Enfermera: enfermera@dermicapro.com / nurse123</p>
        <p>Ventas: ventas@dermicapro.com / sales123</p>
      </div>
    </div>
  );
}

function DashboardLayout() {
  const { user, logout } = useAuth();

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <nav style={{ width: '250px', background: '#2c3e50', color: 'white', padding: '20px' }}>
        <h2>DermicaPro</h2>
        <div style={{ marginTop: '20px' }}>
          <p>
            {user?.firstName} {user?.lastName}
          </p>
          <p style={{ fontSize: '14px', opacity: 0.8 }}>{user?.role}</p>
        </div>
        <ul style={{ listStyle: 'none', padding: 0, marginTop: '30px' }}>
          <li style={{ marginBottom: '10px' }}>
            <a href="/" style={{ color: 'white', textDecoration: 'none' }}>
              Dashboard
            </a>
          </li>
          <li style={{ marginBottom: '10px' }}>
            <a href="/patients" style={{ color: 'white', textDecoration: 'none' }}>
              Pacientes
            </a>
          </li>
          <li style={{ marginBottom: '10px' }}>
            <a href="/appointments" style={{ color: 'white', textDecoration: 'none' }}>
              Citas
            </a>
          </li>
          {user?.role === 'admin' && (
            <li style={{ marginBottom: '10px' }}>
              <a href="/analytics" style={{ color: 'white', textDecoration: 'none' }}>
                Analíticas
              </a>
            </li>
          )}
        </ul>
        <button
          onClick={logout}
          style={{
            marginTop: '50px',
            padding: '10px',
            width: '100%',
            background: '#e74c3c',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Cerrar Sesión
        </button>
      </nav>
      <main style={{ flex: 1, padding: '20px', overflow: 'auto' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/patients/new" element={<PatientFormPage />} />
          <Route path="/patients/:id" element={<PatientDetailPage />} />
          <Route path="/patients/:id/edit" element={<PatientFormPage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/appointments/new" element={<AppointmentFormPage />} />
          <Route path="/appointments/:id" element={<AppointmentDetailPage />} />
          <Route path="/appointments/:id/edit" element={<AppointmentFormPage />} />
          <Route path="/analytics" element={<div>Analíticas</div>} />
        </Routes>
      </main>
    </div>
  );
}

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Bienvenido al sistema de gestión de DermicaPro</p>
    </div>
  );
}

export default App;

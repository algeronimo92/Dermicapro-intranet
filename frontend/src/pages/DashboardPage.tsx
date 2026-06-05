import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Role } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useDashboard } from '../hooks/useDashboard';
import { AdminDashboard } from '../components/dashboard/AdminDashboard';
import { MedicalDashboard } from '../components/dashboard/MedicalDashboard';
import { AssistantDashboard } from '../components/dashboard/AssistantDashboard';
import { SalesDashboard } from '../components/dashboard/SalesDashboard';
import {
  AdminDashboardData,
  MedicalDashboardData,
  AssistantDashboardData,
  SalesDashboardData,
} from '../types/dashboard.types';
import '../styles/dashboard.css';
import '../styles/dashboard-widgets.css';

const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

const getFormattedDate = (): string => {
  const raw = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const { data, isLoading, error, refresh } = useDashboard(period);

  if (!user) {
    return (
      <div className="dashboard-error">
        <p>Usuario no autenticado</p>
      </div>
    );
  }

  const roleName = typeof user.role === 'string' ? user.role : (user.role?.name || '');
  const firstName = user.firstName || (user as any).name || '';

  return (
    <div className="dashboard-page">

      {/* Hero header — greeting + period selector */}
      <div className="dashboard-hero">
        <div className="dashboard-hero__text">
          <h1 className="dashboard-hero__greeting">
            {getGreeting()}{firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <p className="dashboard-hero__date">{getFormattedDate()}</p>
        </div>
        <div className="dashboard-hero__controls">
          <div className="period-selector">
            {(['today', 'week', 'month', 'year'] as const).map((p) => (
              <button
                key={p}
                className={`period-btn ${period === p ? 'period-btn--active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {{ today: 'Hoy', week: 'Semana', month: 'Mes', year: 'Año' }[p]}
              </button>
            ))}
          </div>
          <button
            className="refresh-btn"
            onClick={refresh}
            disabled={isLoading}
            title="Actualizar datos"
          >
            <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="dashboard-error">
          <p>{error}</p>
          <button onClick={refresh}>Reintentar</button>
        </div>
      )}

      {/* Role-based Dashboard */}
      {!error && (
        <>
          {roleName === Role.admin && (
            <AdminDashboard data={data as AdminDashboardData | null} isLoading={isLoading} />
          )}
          {roleName === Role.medical_staff && (
            <MedicalDashboard data={data as MedicalDashboardData | null} isLoading={isLoading} />
          )}
          {roleName === 'assistant' && (
            <AssistantDashboard data={data as AssistantDashboardData | null} isLoading={isLoading} />
          )}
          {roleName === Role.sales && (
            <SalesDashboard data={data as SalesDashboardData | null} isLoading={isLoading} />
          )}
          {!(Object.values(Role) as string[]).includes(roleName) && roleName !== 'assistant' && !isLoading && (
            <div className="dashboard-error">
              <p>Dashboard no disponible para el rol: {roleName}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

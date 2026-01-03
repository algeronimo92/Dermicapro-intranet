import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDashboard } from '../hooks/useDashboard';
import { AdminDashboard } from '../components/dashboard/AdminDashboard';
import { NurseDashboard } from '../components/dashboard/NurseDashboard';
import { SalesDashboard } from '../components/dashboard/SalesDashboard';
import { AdminDashboardData, NurseDashboardData, SalesDashboardData } from '../types/dashboard.types';
import '../styles/dashboard.css';
import '../styles/dashboard-widgets.css';

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

  const roleName = user.role?.name || '';

  const handlePeriodChange = (newPeriod: 'today' | 'week' | 'month' | 'year') => {
    setPeriod(newPeriod);
  };

  return (
    <div className="dashboard-page">
      {/* Period Selector */}
      <div className="dashboard-controls">
        <div className="period-selector">
          <button
            className={`period-btn ${period === 'today' ? 'period-btn--active' : ''}`}
            onClick={() => handlePeriodChange('today')}
          >
            Hoy
          </button>
          <button
            className={`period-btn ${period === 'week' ? 'period-btn--active' : ''}`}
            onClick={() => handlePeriodChange('week')}
          >
            Semana
          </button>
          <button
            className={`period-btn ${period === 'month' ? 'period-btn--active' : ''}`}
            onClick={() => handlePeriodChange('month')}
          >
            Mes
          </button>
          <button
            className={`period-btn ${period === 'year' ? 'period-btn--active' : ''}`}
            onClick={() => handlePeriodChange('year')}
          >
            Año
          </button>
        </div>

        <button className="refresh-btn" onClick={refresh} disabled={isLoading}>
          🔄 Actualizar
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="dashboard-error">
          <p>{error}</p>
          <button onClick={refresh}>Reintentar</button>
        </div>
      )}

      {/* Role-based Dashboard Rendering */}
      {!error && (
        <>
          {roleName === 'admin' && (
            <AdminDashboard
              data={data as AdminDashboardData | null}
              isLoading={isLoading}
            />
          )}

          {roleName === 'nurse' && (
            <NurseDashboard
              data={data as NurseDashboardData | null}
              isLoading={isLoading}
            />
          )}

          {roleName === 'sales' && (
            <SalesDashboard
              data={data as SalesDashboardData | null}
              isLoading={isLoading}
            />
          )}

          {!['admin', 'nurse', 'sales'].includes(roleName) && !isLoading && (
            <div className="dashboard-error">
              <p>Dashboard no disponible para el rol: {roleName}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

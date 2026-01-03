import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ExecutiveSummary } from './ExecutiveSummary';
import './AnalyticsPage.css';

type TabType = 'executive' | 'financial' | 'operations' | 'sales' | 'customers' | 'services';

export const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('executive');
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month');

  // Check if user is admin
  const isAdmin = user?.roleName === 'admin';

  if (!isAdmin) {
    return (
      <div className="page-container">
        <div className="access-denied">
          <h2>Acceso Denegado</h2>
          <p>Solo los administradores pueden acceder a Analytics.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'executive' as TabType, label: 'Resumen Ejecutivo' },
    { id: 'financial' as TabType, label: 'Finanzas' },
    { id: 'operations' as TabType, label: 'Operaciones' },
    { id: 'sales' as TabType, label: 'Ventas' },
    { id: 'customers' as TabType, label: 'Clientes' },
    { id: 'services' as TabType, label: 'Servicios' },
  ];

  const filters = { period };

  return (
    <div className="page-container analytics-page">
      <div className="page-header">
        <h1>Analytics</h1>
        <div className="period-selector">
          {['today', 'week', 'month', 'year'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p as any)}
              className={`period-button ${period === p ? 'active' : ''}`}
            >
              {p === 'today' ? 'Hoy' : p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : 'Año'}
            </button>
          ))}
        </div>
      </div>

      <div className="analytics-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="analytics-content">
        {activeTab === 'executive' && <ExecutiveSummary filters={filters} />}
        {activeTab === 'financial' && (
          <div className="placeholder-content">
            <p>Finanzas - Coming soon</p>
          </div>
        )}
        {activeTab === 'operations' && (
          <div className="placeholder-content">
            <p>Operaciones - Coming soon</p>
          </div>
        )}
        {activeTab === 'sales' && (
          <div className="placeholder-content">
            <p>Ventas - Coming soon</p>
          </div>
        )}
        {activeTab === 'customers' && (
          <div className="placeholder-content">
            <p>Clientes - Coming soon</p>
          </div>
        )}
        {activeTab === 'services' && (
          <div className="placeholder-content">
            <p>Servicios - Coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
};

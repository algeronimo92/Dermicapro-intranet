import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ExecutiveSummary } from './ExecutiveSummary';
import { FinancialAnalytics } from './FinancialAnalytics';
import { OperationsAnalytics } from './OperationsAnalytics';
import { SalesAnalytics } from './SalesAnalytics';
import { CustomerAnalytics } from './CustomerAnalytics';
import { ServiceAnalytics } from './ServiceAnalytics';
import './AnalyticsPage.css';

type TabType = 'executive' | 'financial' | 'operations' | 'sales' | 'customers' | 'services';
type PeriodType = 'today' | 'week' | 'month' | 'year' | 'custom';

export const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Leer valores iniciales de la URL
  const tabFromUrl = (searchParams.get('tab') as TabType) || 'executive';
  const periodFromUrl = (searchParams.get('period') as PeriodType) || 'month';
  const startDateFromUrl = searchParams.get('startDate') || '';
  const endDateFromUrl = searchParams.get('endDate') || '';

  const [activeTab, setActiveTab] = useState<TabType>(tabFromUrl);
  const [period, setPeriod] = useState<PeriodType>(periodFromUrl);
  const [startDate, setStartDate] = useState<string>(startDateFromUrl);
  const [endDate, setEndDate] = useState<string>(endDateFromUrl);

  // Actualizar URL cuando cambian los estados
  useEffect(() => {
    const params: Record<string, string> = {
      tab: activeTab,
      period: period,
    };

    if (period === 'custom' && startDate && endDate) {
      params.startDate = startDate;
      params.endDate = endDate;
    }

    setSearchParams(params, { replace: true });
  }, [activeTab, period, startDate, endDate, setSearchParams]);

  // Check if user is admin
  const isAdmin = user?.role
    ? (typeof user.role === 'string' ? user.role === 'admin' : user.role.name === 'admin')
    : false;

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

  const filters = useMemo(() => ({
    period,
    ...(period === 'custom' && startDate && endDate && {
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    })
  }), [period, startDate, endDate]);

  return (
    <div className="page-container analytics-page">
      <div className="page-header">
        <h1>Analytics</h1>
        <div className="period-selector">
          {['today', 'week', 'month', 'year', 'custom'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p as any)}
              className={`period-button ${period === p ? 'active' : ''}`}
            >
              {p === 'today' ? 'Hoy' : p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : p === 'year' ? 'Año' : 'Personalizado'}
            </button>
          ))}
        </div>
      </div>

      {period === 'custom' && (
        <div className="custom-date-range">
          <div className="date-input-group">
            <label htmlFor="start-date">Fecha Inicio:</label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="date-input"
            />
          </div>
          <div className="date-input-group">
            <label htmlFor="end-date">Fecha Fin:</label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="date-input"
            />
          </div>
        </div>
      )}

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
        {activeTab === 'financial' && <FinancialAnalytics filters={filters} />}
        {activeTab === 'operations' && <OperationsAnalytics filters={filters} />}
        {activeTab === 'sales' && <SalesAnalytics filters={filters} />}
        {activeTab === 'customers' && <CustomerAnalytics filters={filters} />}
        {activeTab === 'services' && <ServiceAnalytics filters={filters} />}
      </div>
    </div>
  );
};

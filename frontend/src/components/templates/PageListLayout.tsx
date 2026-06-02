import React from 'react';
import { Loading } from '../Loading';

interface PageListLayoutProps {
  title: string;
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  total?: number;
  totalLabel?: string;
  isLoading: boolean;
  loadingText?: string;
  error?: string | null;
  children: React.ReactNode;
}

export const PageListLayout: React.FC<PageListLayoutProps> = ({
  title,
  actions,
  filters,
  total,
  totalLabel = 'registros',
  isLoading,
  loadingText,
  error,
  children,
}) => (
  <div className="page-container">
    <div className="page-header">
      <h1>{title}</h1>
      {actions && <div className="header-actions">{actions}</div>}
    </div>

    {filters && (
      <div className="filters-container">
        <div className="filters-row">{filters}</div>
      </div>
    )}

    {error && <div className="error-banner">{error}</div>}

    {total !== undefined && (
      <div className="results-info-modern">
        <div className="results-count">
          <span className="count-number">{total}</span>
          <span className="count-label">{totalLabel}</span>
        </div>
      </div>
    )}

    {isLoading ? <Loading text={loadingText} /> : children}
  </div>
);

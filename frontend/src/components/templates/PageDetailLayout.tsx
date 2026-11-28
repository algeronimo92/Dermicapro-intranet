import React from 'react';
import { DetailSkeleton } from '../ui/Skeleton';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../Button';

interface PageDetailLayoutProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  actions?: React.ReactNode;
  isLoading: boolean;
  loadingText?: string;
  error?: string | null;
  notFoundMessage?: string;
  children: React.ReactNode;
}

export const PageDetailLayout: React.FC<PageDetailLayoutProps> = ({
  title,
  subtitle,
  onBack,
  backLabel = 'Volver',
  actions,
  isLoading,
  error,
  notFoundMessage = 'Registro no encontrado',
  children,
}) => {
  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-banner">{error || notFoundMessage}</div>
        {onBack && (
          <Button variant="secondary" onClick={onBack} style={{ marginTop: 16 }}>
            <ArrowLeft size={16} aria-hidden /> Volver a {backLabel}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header page-header--detail">
        <div className="page-header__text">
          {onBack && (
            <button type="button" className="page-back" onClick={onBack}>
              <ArrowLeft size={16} aria-hidden />
              <span>{backLabel}</span>
            </button>
          )}
          <h1>{title}</h1>
          {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="header-actions">{actions}</div>}
      </div>

      {children}
    </div>
  );
};

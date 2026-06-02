import React from 'react';
import { Loading } from '../Loading';
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
  loadingText,
  error,
  notFoundMessage = 'Registro no encontrado',
  children,
}) => {
  if (isLoading) {
    return <Loading text={loadingText} />;
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-banner">{error || notFoundMessage}</div>
        {onBack && (
          <Button variant="secondary" onClick={onBack} style={{ marginTop: 16 }}>
            ← {backLabel}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-tertiary)',
                fontSize: 'var(--font-size-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: 0,
                marginBottom: 4,
              }}
            >
              ← {backLabel}
            </button>
          )}
          <h1 style={{ margin: 0 }}>{title}</h1>
          {subtitle && (
            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="header-actions">{actions}</div>}
      </div>

      {children}
    </div>
  );
};

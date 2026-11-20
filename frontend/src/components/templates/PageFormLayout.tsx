import React from 'react';
import { DetailSkeleton } from '../ui/Skeleton';

interface PageFormLayoutProps {
  title: string;
  isLoading?: boolean;
  loadingText?: string;
  error?: string | null;
  onSubmit: (e: React.FormEvent) => void;
  formActions: React.ReactNode;
  children: React.ReactNode;
}

export const PageFormLayout: React.FC<PageFormLayoutProps> = ({
  title,
  isLoading,
  error,
  onSubmit,
  formActions,
  children,
}) => {
  if (isLoading) {
    return <DetailSkeleton cards={2} />;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{title}</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={onSubmit} className="form-container">
        {children}
        <div className="form-actions">{formActions}</div>
      </form>
    </div>
  );
};

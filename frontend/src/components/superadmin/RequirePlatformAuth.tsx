import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePlatformAuth } from '../../contexts/PlatformAuthContext';

export const RequirePlatformAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = usePlatformAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="superadmin-loading">Cargando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/superadmin/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

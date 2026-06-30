import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  PLATFORM_ADMIN_TOKEN_KEY,
  PLATFORM_ADMIN_USER_KEY,
  PlatformAdminUser,
  platformAdminApi,
} from '../services/platformAdminApi';

interface PlatformAuthContextType {
  platformAdmin: PlatformAdminUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const PlatformAuthContext = createContext<PlatformAuthContextType | undefined>(undefined);

function readStoredAdmin(): PlatformAdminUser | null {
  try {
    const raw = localStorage.getItem(PLATFORM_ADMIN_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const PlatformAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [platformAdmin, setPlatformAdmin] = useState<PlatformAdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setToken(localStorage.getItem(PLATFORM_ADMIN_TOKEN_KEY));
    setPlatformAdmin(readStoredAdmin());
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const result = await platformAdminApi.login(email, password);
    localStorage.setItem(PLATFORM_ADMIN_TOKEN_KEY, result.token);
    localStorage.setItem(PLATFORM_ADMIN_USER_KEY, JSON.stringify(result.admin));
    setToken(result.token);
    setPlatformAdmin(result.admin);
  };

  const logout = () => {
    localStorage.removeItem(PLATFORM_ADMIN_TOKEN_KEY);
    localStorage.removeItem(PLATFORM_ADMIN_USER_KEY);
    setToken(null);
    setPlatformAdmin(null);
    window.location.href = '/superadmin/login';
  };

  const value = useMemo(
    () => ({
      platformAdmin,
      token,
      isLoading,
      isAuthenticated: Boolean(token),
      login,
      logout,
    }),
    [platformAdmin, token, isLoading],
  );

  return <PlatformAuthContext.Provider value={value}>{children}</PlatformAuthContext.Provider>;
};

export const usePlatformAuth = () => {
  const context = useContext(PlatformAuthContext);
  if (!context) {
    throw new Error('usePlatformAuth must be used within a PlatformAuthProvider');
  }
  return context;
};

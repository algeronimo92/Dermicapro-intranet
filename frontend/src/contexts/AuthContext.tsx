import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../services/auth.service';
import { useTheme, ThemeMode } from './ThemeContext';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  mustChangePassword: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  updateUser: (updated: User) => void;
  clearMustChangePassword: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const { setMode } = useTheme();

  const applyUserTheme = (userData: User) => {
    if (userData.themeMode) {
      setMode(userData.themeMode as ThemeMode);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const userData = await authService.getMe();
          setUser(userData);
          applyUserTheme(userData);
          if (userData.mustChangePassword) setMustChangePassword(true);
        } catch (error) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const { accessToken, refreshToken, mustChangePassword: mcp, user: userData } = await authService.login(email, password);
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(userData);
    applyUserTheme(userData);
    if (mcp) setMustChangePassword(true);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setMustChangePassword(false);
  };

  const updateUser = (updated: User) => {
    setUser(updated);
    if (!updated.mustChangePassword) setMustChangePassword(false);
  };

  const clearMustChangePassword = () => setMustChangePassword(false);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        mustChangePassword,
        login,
        logout,
        isAuthenticated: !!user,
        updateUser,
        clearMustChangePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

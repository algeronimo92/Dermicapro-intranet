import React, { createContext, useContext, useState, useEffect } from 'react';
import { patientAuthService, PatientProfile, ChangePasswordData } from '../services/patientAuth.service';

interface PatientAuthContextType {
  patient: PatientProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (data: ChangePasswordData) => Promise<void>;
}

const PatientAuthContext = createContext<PatientAuthContextType | undefined>(undefined);

export const PatientAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('patientAccessToken');
      if (token) {
        try {
          const patientData = await patientAuthService.getMe();
          setPatient(patientData);
        } catch (error) {
          localStorage.removeItem('patientAccessToken');
          localStorage.removeItem('patientRefreshToken');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const { accessToken, refreshToken, patient: patientData } = await patientAuthService.login(email, password);
    localStorage.setItem('patientAccessToken', accessToken);
    localStorage.setItem('patientRefreshToken', refreshToken);

    // Obtener perfil completo después del login
    const fullProfile = await patientAuthService.getMe();
    setPatient(fullProfile);
  };

  const logout = async () => {
    await patientAuthService.logout();
    setPatient(null);
  };

  const changePassword = async (data: ChangePasswordData) => {
    await patientAuthService.changePassword(data);
  };

  return (
    <PatientAuthContext.Provider
      value={{
        patient,
        isLoading,
        isAuthenticated: !!patient,
        login,
        logout,
        changePassword,
      }}
    >
      {children}
    </PatientAuthContext.Provider>
  );
};

export const usePatientAuth = () => {
  const context = useContext(PatientAuthContext);
  if (context === undefined) {
    throw new Error('usePatientAuth must be used within a PatientAuthProvider');
  }
  return context;
};

import patientApi from './patientApi';

export interface PatientLoginResponse {
  accessToken: string;
  refreshToken: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    dni: string;
    hasPortalAccess: boolean;
  };
}

export interface PatientProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  dni: string;
  dateOfBirth: string;
  sex: string;
  phone: string | null;
  address: string | null;
  hasPortalAccess: boolean;
  lastLogin: string | null;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export const patientAuthService = {
  /**
   * Login de paciente
   */
  login: async (email: string, password: string): Promise<PatientLoginResponse> => {
    const response = await patientApi.post('/patient-auth/login', { email, password });
    return response.data;
  },

  /**
   * Obtener información del paciente autenticado
   */
  getMe: async (): Promise<PatientProfile> => {
    const response = await patientApi.get('/patient-auth/me');
    return response.data;
  },

  /**
   * Logout del paciente
   */
  logout: async (): Promise<void> => {
    try {
      await patientApi.post('/patient-auth/logout');
    } finally {
      localStorage.removeItem('patientAccessToken');
      localStorage.removeItem('patientRefreshToken');
    }
  },

  /**
   * Cambiar contraseña del paciente
   */
  changePassword: async (data: ChangePasswordData): Promise<{ message: string }> => {
    const response = await patientApi.post('/patient-auth/change-password', data);
    return response.data;
  },

  /**
   * Refrescar token
   */
  refresh: async (refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> => {
    const response = await patientApi.post('/patient-auth/refresh', { refreshToken });
    return response.data;
  },
};

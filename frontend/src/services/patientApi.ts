import axios from 'axios';

/**
 * API instance para el portal de pacientes
 * Usa tokens separados (patientAccessToken) del staff
 */
const patientApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token de paciente a cada request
patientApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('patientAccessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar refresh token automático
patientApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('patientRefreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(
          `${import.meta.env.VITE_API_URL || '/api'}/patient-auth/refresh`,
          { refreshToken }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        localStorage.setItem('patientAccessToken', accessToken);
        localStorage.setItem('patientRefreshToken', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return patientApi(originalRequest);
      } catch (err) {
        // Limpiar tokens y redirigir al login de pacientes
        localStorage.removeItem('patientAccessToken');
        localStorage.removeItem('patientRefreshToken');
        window.location.href = '/patient/login';
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default patientApi;

import api from './api';
import { AuthResponse, User } from '../types';

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', { email, password });
    return response.data;
  },

  async loginWithPin(userId: string, pin: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login-pin', { userId, pin });
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  async getMe(): Promise<User> {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/refresh', { refreshToken });
    return response.data;
  },

  async updateMe(data: { firstName?: string; lastName?: string; email?: string; sex?: string; themeMode?: 'light' | 'dark' | 'auto' }): Promise<User> {
    const response = await api.put<User>('/auth/me', data);
    return response.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.put('/auth/me/password', { currentPassword, newPassword });
  },

  async setPin(currentPassword: string, pin: string): Promise<void> {
    await api.put('/auth/me/pin', { currentPassword, pin });
  },

  async removePin(): Promise<void> {
    await api.delete('/auth/me/pin');
  },
};

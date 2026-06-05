import api from './api';
import { User, PaginatedResponse, RoleInfo } from '../types';

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleId: string;
  sex?: 'M' | 'F' | 'Other';
  dateOfBirth?: string;
}

export interface UpdateUserDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  roleId?: string;
  sex?: 'M' | 'F' | 'Other';
  dateOfBirth?: string;
  isActive?: boolean;
  password?: string;
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  roleId?: string;
  roleName?: string;
  isActive?: boolean | string;
}

export interface UserStats {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    role: RoleInfo | null;
  };
  counts: {
    patientsCreated: number;
    appointmentsCreated: number;
    appointmentsAttended: number;
    patientRecords: number;
    commissions: number;
  };
  totalCommissions?: number;
  paidCommissions?: number;
  commissionCount?: number;
  appointmentsLast30Days?: number;
}

export const usersService = {
  async getUsers(params?: GetUsersParams): Promise<PaginatedResponse<User>> {
    const response = await api.get<PaginatedResponse<User>>('/users', { params });
    return response.data;
  },

  async getAllUsers(params?: GetUsersParams): Promise<User[]> {
    const response = await api.get<PaginatedResponse<User>>('/users', {
      params: { ...params, limit: 1000 }
    });
    return response.data.data;
  },

  async getUser(id: string): Promise<User> {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  },

  async createUser(data: CreateUserDto): Promise<User> {
    const response = await api.post<User>('/users', data);
    return response.data;
  },

  async updateUser(id: string, data: UpdateUserDto): Promise<User> {
    const response = await api.put<User>(`/users/${id}`, data);
    return response.data;
  },

  async deactivateUser(id: string): Promise<void> {
    await api.post(`/users/${id}/deactivate`);
  },

  async activateUser(id: string): Promise<void> {
    await api.post(`/users/${id}/activate`);
  },

  async getUserStats(id: string): Promise<UserStats> {
    const response = await api.get<UserStats>(`/users/${id}/stats`);
    return response.data;
  },

  async uploadPhoto(id: string, file: File): Promise<User> {
    const formData = new FormData();
    formData.append('photo', file);
    const response = await api.post<User>(`/users/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

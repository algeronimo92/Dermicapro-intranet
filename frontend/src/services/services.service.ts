import api from './api';
import { Service } from '../types';

export const servicesService = {
  async getServices(includeDeleted = false): Promise<Service[]> {
    const response = await api.get<Service[]>('/services', {
      params: { includeDeleted }
    });
    return response.data;
  },

  async getActiveServices(): Promise<Service[]> {
    const response = await api.get<Service[]>('/services/active');
    return response.data;
  },

  async getService(id: string): Promise<Service> {
    const response = await api.get<Service>(`/services/${id}`);
    return response.data;
  },

  async createService(data: {
    name: string;
    description?: string;
    basePrice: number;
    defaultSessions?: number;
    isActive?: boolean;
  }): Promise<Service> {
    const response = await api.post<Service>('/services', data);
    return response.data;
  },

  async updateService(
    id: string,
    data: {
      name?: string;
      description?: string;
      basePrice?: number;
      defaultSessions?: number;
      isActive?: boolean;
    }
  ): Promise<Service> {
    const response = await api.put<Service>(`/services/${id}`, data);
    return response.data;
  },

  async deleteService(id: string): Promise<void> {
    await api.delete(`/services/${id}`);
  },

  async restoreService(id: string): Promise<Service> {
    const response = await api.post<Service>(`/services/${id}/restore`);
    return response.data;
  },
};

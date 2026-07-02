import api from './api';
import { Service, ServicePackage } from '../types';

export interface ServiceFormData {
  name: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
  commissionType?: 'percentage' | 'fixed';
  commissionRate?: number | null;
  commissionFixedAmount?: number | null;
  commissionNotes?: string;
}

export interface ServicePackageFormData {
  sessions: number;
  price: number;
  label?: string;
  isActive?: boolean;
  commissionType?: 'percentage' | 'fixed' | null;
  commissionRate?: number | null;
  commissionFixedAmount?: number | null;
}

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

  async createService(data: ServiceFormData): Promise<Service> {
    const response = await api.post<Service>('/services', data);
    return response.data;
  },

  async updateService(id: string, data: Partial<ServiceFormData>): Promise<Service> {
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

  async getPackages(serviceId: string, includeDeleted = false): Promise<ServicePackage[]> {
    const response = await api.get<ServicePackage[]>(`/services/${serviceId}/packages`, {
      params: { includeDeleted }
    });
    return response.data;
  },

  async createPackage(serviceId: string, data: ServicePackageFormData): Promise<ServicePackage> {
    const response = await api.post<ServicePackage>(`/services/${serviceId}/packages`, data);
    return response.data;
  },

  async updatePackage(id: string, data: Partial<ServicePackageFormData>): Promise<ServicePackage> {
    const response = await api.put<ServicePackage>(`/services/packages/${id}`, data);
    return response.data;
  },

  async deletePackage(id: string): Promise<void> {
    await api.delete(`/services/packages/${id}`);
  },

  async restorePackage(id: string): Promise<ServicePackage> {
    const response = await api.post<ServicePackage>(`/services/packages/${id}/restore`);
    return response.data;
  },
};

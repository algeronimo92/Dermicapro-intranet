import api from './api';
import { Service } from '../types';

export const servicesService = {
  async getServices(): Promise<Service[]> {
    const response = await api.get<Service[]>('/services');
    return response.data;
  },

  async getActiveServices(): Promise<Service[]> {
    const response = await api.get<Service[]>('/services?active=true');
    return response.data;
  },
};

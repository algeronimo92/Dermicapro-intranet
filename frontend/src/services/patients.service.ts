import api from './api';
import { Patient, PaginatedResponse } from '../types';

export interface CreatePatientDto {
  firstName: string;
  lastName: string;
  dni: string;
  dateOfBirth: string;
  sex: 'M' | 'F' | 'Other';
  phone?: string;
  email?: string;
  address?: string;
}

export interface UpdatePatientDto extends Partial<CreatePatientDto> {}

export interface GetPatientsParams {
  page?: number;
  limit?: number;
  search?: string;
  sex?: 'M' | 'F' | 'Other';
}

export const patientsService = {
  async getPatients(params?: GetPatientsParams): Promise<PaginatedResponse<Patient>> {
    const response = await api.get<PaginatedResponse<Patient>>('/patients', { params });
    return response.data;
  },

  async getPatient(id: string): Promise<Patient> {
    const response = await api.get<Patient>(`/patients/${id}`);
    return response.data;
  },

  async createPatient(data: CreatePatientDto): Promise<Patient> {
    const response = await api.post<Patient>('/patients', data);
    return response.data;
  },

  async updatePatient(id: string, data: UpdatePatientDto): Promise<Patient> {
    const response = await api.put<Patient>(`/patients/${id}`, data);
    return response.data;
  },

  async deletePatient(id: string): Promise<void> {
    await api.delete(`/patients/${id}`);
  },

  async getPatientHistory(id: string): Promise<any> {
    const response = await api.get(`/patients/${id}/history`);
    return response.data;
  },

  async getPatientWithOrders(id: string): Promise<Patient> {
    const response = await api.get<Patient>(`/patients/${id}`);
    return response.data;
  },
};

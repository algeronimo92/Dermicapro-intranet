import api from './api';
import { Appointment, PaginatedResponse, AppointmentStatus } from '../types';

export interface CreateAppointmentDto {
  patientId: string;
  serviceId: string;
  scheduledDate: string;
  durationMinutes?: number;
  reservationAmount?: number;
  notes?: string;
}

export interface UpdateAppointmentDto extends Partial<CreateAppointmentDto> {
  status?: AppointmentStatus;
}

export interface GetAppointmentsParams {
  page?: number;
  limit?: number;
  status?: AppointmentStatus;
  patientId?: string;
  serviceId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const appointmentsService = {
  async getAppointments(params?: GetAppointmentsParams): Promise<PaginatedResponse<Appointment>> {
    const response = await api.get<PaginatedResponse<Appointment>>('/appointments', { params });
    return response.data;
  },

  async getAppointment(id: string): Promise<Appointment> {
    const response = await api.get<Appointment>(`/appointments/${id}`);
    return response.data;
  },

  async createAppointment(data: CreateAppointmentDto): Promise<Appointment> {
    const response = await api.post<Appointment>('/appointments', data);
    return response.data;
  },

  async updateAppointment(id: string, data: UpdateAppointmentDto): Promise<Appointment> {
    const response = await api.put<Appointment>(`/appointments/${id}`, data);
    return response.data;
  },

  async deleteAppointment(id: string): Promise<void> {
    await api.delete(`/appointments/${id}`);
  },

  async markAsAttended(id: string): Promise<Appointment> {
    const response = await api.post<Appointment>(`/appointments/${id}/attend`);
    return response.data;
  },

  async uploadReceipt(id: string, file: File): Promise<Appointment> {
    const formData = new FormData();
    formData.append('receipt', file);
    const response = await api.post<Appointment>(`/appointments/${id}/upload-receipt`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getTodayAppointments(): Promise<Appointment[]> {
    const today = new Date().toISOString().split('T')[0];
    const response = await api.get<Appointment[]>(`/appointments/today`, {
      params: { date: today }
    });
    return response.data;
  },
};

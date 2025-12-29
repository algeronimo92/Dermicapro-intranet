import api from './api';
import { Appointment, PaginatedResponse, AppointmentStatus } from '../types';
import { getLocalDateString } from '../utils/dateUtils';

export interface AppointmentServiceDto {
  serviceId: string;
  orderId?: string;
  sessionNumber?: number;
}

export interface CreateAppointmentDto {
  patientId: string;
  serviceId?: string; // DEPRECATED: Ya no se usa, todas las sesiones van en services[]
  scheduledDate: string;
  durationMinutes?: number;
  reservationAmount?: number;
  orderId?: string; // DEPRECATED: Ya no se usa
  services?: AppointmentServiceDto[]; // Array de todas las sesiones (REQUERIDO)
}

export interface UpdateAppointmentDto extends Partial<CreateAppointmentDto> {
  status?: AppointmentStatus;
}

export interface AttendAppointmentDto {
  serviceId?: string;
  notes?: string;
  treatmentNotes?: string;
  weight?: number;
  bodyMeasurement?: Record<string, number>;
  healthNotes?: string;
  beforePhotoUrls?: string[];
  afterPhotoUrls?: string[];
}

export interface GetAppointmentsParams {
  page?: number;
  limit?: number;
  status?: AppointmentStatus;
  patientId?: string;
  serviceId?: string;
  dateFrom?: string;
  dateTo?: string;
  showCancelled?: boolean;
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

  async markAsAttended(id: string, data?: AttendAppointmentDto): Promise<Appointment> {
    const response = await api.post<Appointment>(`/appointments/${id}/attend`, data);
    return response.data;
  },

  async uploadReceipt(id: string, file: File, amount: number, paymentMethod: string = 'cash'): Promise<Appointment> {
    const formData = new FormData();
    formData.append('receipt', file);
    formData.append('amount', amount.toString());
    formData.append('paymentMethod', paymentMethod);
    const response = await api.post<Appointment>(`/appointments/${id}/upload-receipt`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async uploadTreatmentPhotos(files: File[]): Promise<{ urls: string[] }> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('photos', file);
    });
    const response = await api.post<{ urls: string[] }>('/appointments/upload-photos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getTodayAppointments(): Promise<Appointment[]> {
    // ✅ Usar dateUtils para obtener fecha local correctamente
    const today = getLocalDateString();
    const response = await api.get<Appointment[]>(`/appointments/today`, {
      params: { date: today }
    });
    return response.data;
  },

  async addPhotosToAppointment(appointmentId: string, data: { photoUrls: string[], type: 'before' | 'after' }): Promise<Appointment> {
    const response = await api.post<Appointment>(`/appointments/${appointmentId}/add-photos`, data);
    return response.data;
  },

  async createAppointmentNote(appointmentId: string, note: string): Promise<any> {
    const response = await api.post(`/appointments/${appointmentId}/notes`, { note });
    return response.data;
  },

  async updateBodyMeasurements(
    appointmentId: string,
    data: {
      weight?: number | null;
      bodyMeasurement?: any;
      healthNotes?: string;
    }
  ): Promise<Appointment> {
    const response = await api.put<Appointment>(`/appointments/${appointmentId}/body-measurements`, data);
    return response.data;
  },
};

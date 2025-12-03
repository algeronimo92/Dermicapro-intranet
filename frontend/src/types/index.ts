export enum Role {
  admin = 'admin',
  nurse = 'nurse',
  sales = 'sales',
}

export enum Sex {
  M = 'M',
  F = 'F',
  Other = 'Other',
}

export enum AppointmentStatus {
  reserved = 'reserved',
  attended = 'attended',
  cancelled = 'cancelled',
  no_show = 'no_show',
}

export enum PaymentMethod {
  cash = 'cash',
  card = 'card',
  transfer = 'transfer',
  yape = 'yape',
  plin = 'plin',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  sex?: Sex;
  dateOfBirth?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dni: string;
  dateOfBirth: string;
  sex: Sex;
  phone?: string;
  email?: string;
  address?: string;
  createdAt: string;
  createdBy?: Partial<User>;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  isActive: boolean;
}

export interface Appointment {
  id: string;
  patientId: string;
  serviceId: string;
  scheduledDate: string;
  durationMinutes: number;
  status: AppointmentStatus;
  reservationAmount?: number;
  reservationReceiptUrl?: string;
  notes?: string;
  attendedAt?: string;
  createdAt: string;
  patient?: Patient;
  service?: Service;
  createdBy?: Partial<User>;
  attendedBy?: Partial<User>;
}

export interface TreatmentSession {
  id: string;
  appointmentId: string;
  sessionNumber: number;
  totalSessions: number;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  performed: boolean;
  notes?: string;
  createdAt: string;
}

export interface PatientRecord {
  id: string;
  patientId: string;
  appointmentId: string;
  weight?: number;
  bodyMeasurement?: Record<string, number>;
  healthNotes?: string;
  beforePhotoUrls?: string[];
  afterPhotoUrls?: string[];
  createdAt: string;
  appointment?: Appointment;
  createdBy?: Partial<User>;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

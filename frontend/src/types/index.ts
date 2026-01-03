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
  in_progress = 'in_progress',
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

export enum InvoiceStatus {
  pending = 'pending',
  partial = 'partial',
  paid = 'paid',
  cancelled = 'cancelled',
}

export enum PaymentType {
  invoice_payment = 'invoice_payment',
  reservation = 'reservation',
  service_payment = 'service_payment',
  account_credit = 'account_credit',
  penalty = 'penalty',
  other = 'other',
}

export interface RoleInfo {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  isActive: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: RoleInfo | Role; // Soporta ambos: objeto completo o string legacy
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
  lastAttendedDate?: string | null;
  lastAttendedBy?: Partial<User> | null;
  orders?: Order[];
  appointments?: Appointment[]; // Historial de citas del paciente
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  defaultSessions: number;
  commissionType?: 'percentage' | 'fixed';
  commissionRate?: number;
  commissionFixedAmount?: number;
  commissionNotes?: string;
  isActive: boolean;
  deletedAt?: string | null;
}

export interface Order {
  id: string;
  patientId: string;
  serviceId: string;
  totalSessions: number;
  completedSessions: number;
  originalPrice: number;
  discount: number;
  finalPrice: number;
  notes?: string;
  createdAt: string;
  patient?: Patient;
  service?: Service;
  createdBy?: Partial<User>;
  appointmentServices?: AppointmentService[];
  invoice?: Partial<Invoice>;
}

export interface AppointmentService {
  id: string;
  appointmentId: string;
  orderId: string;
  sessionNumber?: number | null;
  createdAt: string;
  order: Partial<Order> & { service?: Service };
  appointment?: Partial<Appointment>;
}

export interface AppointmentNote {
  id: string;
  appointmentId: string;
  note: string;
  createdById: string;
  createdAt: string;
  createdBy?: Partial<User>;
}

export interface Appointment {
  id: string;
  patientId: string;
  scheduledDate: string;
  durationMinutes: number;
  status: AppointmentStatus;
  reservationAmount?: number;
  reservationReceiptUrl?: string;
  attendedAt?: string;
  createdAt: string;
  patient?: Patient;
  createdBy?: Partial<User>;
  attendedBy?: Partial<User>;
  appointmentServices?: AppointmentService[]; // TODAS las sesiones de esta cita
  patientRecords?: PatientRecord[]; // Registros médicos de esta cita
  appointmentNotes?: AppointmentNote[]; // Notas de atención
}

export interface BodyMeasurement {
  // Medidas básicas en cm
  height?: number; // Altura/Estatura

  // Medidas corporales en cm
  waist?: number; // Cintura
  chest?: number; // Pecho
  hips?: number; // Cadera
  leftArm?: number; // Brazo izquierdo
  rightArm?: number; // Brazo derecho
  leftThigh?: number; // Muslo izquierdo
  rightThigh?: number; // Muslo derecho
  leftCalf?: number; // Pantorrilla izquierda
  rightCalf?: number; // Pantorrilla derecha

  // Grosor de piel/grasa en mm
  abdomen?: number; // Abdomen
  triceps?: number; // Tríceps
  subscapular?: number; // Subescapular
  suprailiac?: number; // Suprailiaco
  thigh?: number; // Muslo

  // Otras medidas
  [key: string]: number | undefined; // Permite medidas personalizadas
}

export interface PatientRecord {
  id: string;
  patientId: string;
  appointmentId: string;
  weight?: number;
  bodyMeasurement?: BodyMeasurement;
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

export interface Invoice {
  id: string;
  patientId: string;
  totalAmount: number;
  status: InvoiceStatus;
  dueDate?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  orders?: (Order & { service?: Service })[]; // N:1 - Una factura tiene muchas órdenes
  patient?: Partial<Patient>;
  createdBy?: Partial<User>;
  payments?: Payment[];
}

export interface Payment {
  id: string;
  patientId: string;
  invoiceId?: string;
  appointmentId?: string;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  paymentDate: string;
  receiptUrl?: string;
  notes?: string;
  createdById: string;
  createdAt: string;
  patient?: Partial<Patient>;
  invoice?: Partial<Invoice>;
  appointment?: Partial<Appointment>;
  createdBy?: Partial<User>;
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

// Session Operations para integración con simulación
export interface SessionOperations {
  toDelete: string[];  // IDs de AppointmentService a eliminar (soft delete)
  toCreate: Array<{
    orderId?: string;
    serviceId: string;
    sessionNumber: number;
    tempPackageId?: string;
  }>;
  newOrders: Array<{
    serviceId: string;
    totalSessions: number;
    tempPackageId: string;
  }>;
  orderPriceUpdates?: Array<{
    orderId: string;
    finalPrice: number;
  }>;
}

export interface UpdateAppointmentDto {
  patientId?: string;
  scheduledDate?: string;
  durationMinutes?: number;
  reservationAmount?: number;
  status?: AppointmentStatus;
  sessionOperations?: SessionOperations;
}

export interface CreateAppointmentDto {
  patientId: string;
  scheduledDate: string;
  durationMinutes: number;
  reservationAmount?: number;
  services?: any[];  // Para modo create (legacy)
  sessionOperations?: SessionOperations;  // Para modo edit (nuevo)
}

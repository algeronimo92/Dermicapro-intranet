export enum Role {
  admin = 'admin',
  medical_staff = 'medical_staff',
  assistant = 'assistant',
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
  account_credit = 'account_credit',
}

export enum PaymentOrderStatus {
  pending = 'pending',
  partial = 'partial',
  paid = 'paid',
  cancelled = 'cancelled',
}

export enum PaymentType {
  payment_order_payment = 'payment_order_payment',
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
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  role: RoleInfo | Role; // Soporta ambos: objeto completo o string legacy
  sex?: Sex;
  dateOfBirth?: string;
  isActive: boolean;
  mustChangePassword?: boolean;
  themeMode?: 'light' | 'dark' | 'auto';
  hasPin?: boolean;
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
  photoUrl?: string | null;
  accountBalance?: number;
  createdAt: string;
  createdBy?: Partial<User>;
  lastAttendedDate?: string | null;
  lastAttendedBy?: Partial<User> | null;
  orders?: Order[];
  appointments?: Appointment[];
}

export interface CreditTransaction {
  id: string;
  patientId: string;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  paymentDate: string;
  notes?: string;
  receiptUrl?: string;
  receiptUrls?: string[];
  paymentOrderId?: string;
  paymentOrder?: { id: string } | null;
  createdBy?: Partial<User>;
  createdAt: string;
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
  serviceTemplateId: string;
  serviceId?: string;
  totalSessions: number;
  completedSessions: number;
  originalPrice: number;
  discount: number;
  finalPrice: number;
  notes?: string;
  concludedAt?: string | null;
  concludeReason?: string | null;
  concludedBy?: Partial<User> | null;
  createdAt: string;
  patient?: Patient;
  service?: Service;
  createdBy?: Partial<User>;
  appointmentServices?: AppointmentService[];
  paymentOrder?: Partial<PaymentOrder>;
}

export interface AppointmentService {
  id: string;
  appointmentId: string;
  serviceInstanceId: string;
  sessionNumber?: number | null;
  createdAt: string;
  serviceInstance: Partial<Order> & { service?: Service };
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

export interface AppointmentAttendee {
  id: string;
  appointmentId: string;
  userId: string;
  addedAt: string;
  addedById: string;
  user?: Partial<User>;
  addedBy?: Partial<User>;
}

export interface ReservationPayment {
  id: string;
  receiptUrl: string | null;
  receiptUrls: string[];
  amountPaid: number;
  paymentMethod: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  scheduledDate: string;
  durationMinutes: number;
  status: AppointmentStatus;
  reservationAmount?: number;
  reservationPayment?: ReservationPayment | null;
  attendedAt?: string;
  createdAt: string;
  patient?: Patient;
  createdBy?: Partial<User>;
  attendedBy?: Partial<User>;
  attendees?: AppointmentAttendee[];
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
  mustChangePassword?: boolean;
  user: User;
}

export interface PaymentOrder {
  id: string;
  patientId: string;
  totalAmount: number;
  status: PaymentOrderStatus;
  dueDate?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  orders?: (Order & { service?: Service })[]; // N:1 - Una orden de pago tiene muchas órdenes
  patient?: Partial<Patient>;
  createdBy?: Partial<User>;
  payments?: Payment[];
}

export interface Payment {
  id: string;
  patientId: string;
  paymentOrderId?: string;
  appointmentId?: string;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  paymentDate: string;
  receiptUrl?: string;
  receiptUrls?: string[];
  notes?: string;
  createdById: string;
  createdAt: string;
  voidedAt?: string | null;
  voidedById?: string | null;
  voidReason?: string | null;
  patient?: Partial<Patient>;
  paymentOrder?: Partial<PaymentOrder>;
  appointment?: Partial<Appointment>;
  createdBy?: Partial<User>;
  voidedBy?: Partial<User> | null;
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
  status?: AppointmentStatus;
  sessionOperations?: SessionOperations;
}

export interface CreateAppointmentDto {
  patientId: string;
  scheduledDate: string;
  durationMinutes: number;
  reservationAmount?: number;
  reservationPaymentMethod?: string;
  services?: any[];  // Para modo create (legacy)
  sessionOperations?: SessionOperations;  // Para modo edit (nuevo)
}

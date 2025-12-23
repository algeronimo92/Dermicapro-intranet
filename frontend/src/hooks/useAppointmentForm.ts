import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { appointmentsService } from '../services/appointments.service';
import { servicesService } from '../services/services.service';
import { patientsService } from '../services/patients.service';
import { Service, Order } from '../types';

// ============================================
// TYPES
// ============================================

export interface SessionItem {
  serviceId: string;
  orderId?: string;
  sessionNumber?: number;
  appointmentServiceId?: string;
  tempPackageId?: string;
  markedForDeletion?: boolean;
}

export interface AppointmentFormData {
  patientId: string;
  serviceId?: string;
  scheduledDate: string;
  durationMinutes?: number;
  reservationAmount?: number;
  notes: string;
  orderId?: string;
  services: SessionItem[];
}

export interface FormErrors {
  [key: string]: string;
}

// ============================================
// CUSTOM HOOK
// ============================================

export const useAppointmentForm = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  // Derived state
  const isEditMode = !!id;
  const preselectedPatientId = searchParams.get('patientId');
  const preselectedServiceId = searchParams.get('serviceId');
  const preselectedOrderId = searchParams.get('orderId');
  const scheduledDateParam = searchParams.get('scheduledDate');
  const durationMinutesParam = searchParams.get('durationMinutes');

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Data states
  const [services, setServices] = useState<Service[]>([]);
  const [patientOrders, setPatientOrders] = useState<Order[]>([]);
  const [allSessions, setAllSessions] = useState<SessionItem[]>([]);
  const [formData, setFormData] = useState<AppointmentFormData>({
    patientId: preselectedPatientId || '',
    serviceId: preselectedServiceId || '',
    scheduledDate: getDefaultScheduledDate(scheduledDateParam),
    durationMinutes: getDefaultDuration(durationMinutesParam),
    reservationAmount: undefined,
    notes: '',
    orderId: preselectedOrderId || undefined,
    services: []
  });

  // UI states
  const [errors, setErrors] = useState<FormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [selectedSessionServiceId, setSelectedSessionServiceId] = useState<string>('');
  const [selectedSessionOrderId, setSelectedSessionOrderId] = useState<string>('');
  const [tempPackageCounter, setTempPackageCounter] = useState(0);
  const [showUploadReceiptModal, setShowUploadReceiptModal] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<string | null>(null);

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (isEditMode && id) {
      loadAppointment(id);
    }
  }, [id]);

  useEffect(() => {
    if (preselectedPatientId && !preselectedOrderId) {
      loadPatientOrders(preselectedPatientId);
    }
  }, [preselectedPatientId, preselectedOrderId]);

  useEffect(() => {
    if (preselectedServiceId && preselectedOrderId && allSessions.length === 0) {
      setAllSessions([{
        serviceId: preselectedServiceId,
        orderId: preselectedOrderId,
        sessionNumber: undefined
      }]);
    }
  }, [preselectedServiceId, preselectedOrderId]);

  // ============================================
  // DATA LOADING
  // ============================================

  const loadInitialData = async () => {
    try {
      setLoadingData(true);
      const servicesData = await servicesService.getActiveServices();
      setServices(servicesData);
    } catch (err: any) {
      setError('Error al cargar datos iniciales');
    } finally {
      setLoadingData(false);
    }
  };

  const loadAppointment = async (appointmentId: string) => {
    try {
      setIsLoading(true);
      const appointment = await appointmentsService.getAppointment(appointmentId);

      const scheduledDate = new Date(appointment.scheduledDate);
      const year = scheduledDate.getFullYear();
      const month = String(scheduledDate.getMonth() + 1).padStart(2, '0');
      const day = String(scheduledDate.getDate()).padStart(2, '0');
      const hours = String(scheduledDate.getHours()).padStart(2, '0');
      const minutes = String(scheduledDate.getMinutes()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;

      setFormData({
        patientId: appointment.patientId,
        scheduledDate: formattedDate,
        durationMinutes: appointment.durationMinutes,
        reservationAmount: appointment.reservationAmount,
        notes: appointment.notes || '',
        services: []
      });

      if (appointment.reservationReceiptUrl) {
        setCurrentReceipt(appointment.reservationReceiptUrl);
      }

      if (appointment.appointmentServices && appointment.appointmentServices.length > 0) {
        const sessions = appointment.appointmentServices
          .filter(appSvc => appSvc.order?.serviceId)
          .map(appSvc => ({
            serviceId: appSvc.order!.serviceId as string,
            orderId: appSvc.order!.id as string | undefined,
            sessionNumber: appSvc.sessionNumber || undefined,
            appointmentServiceId: appSvc.id
          }));
        setAllSessions(sessions);
      }

      if (appointment.patientId) {
        await loadPatientOrders(appointment.patientId);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar cita');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPatientOrders = async (patientId: string) => {
    if (!patientId) {
      setPatientOrders([]);
      return;
    }

    try {
      setLoadingOrders(true);
      const patient = await patientsService.getPatient(patientId);

      const activeOrders = patient.orders?.filter(order => {
        const appointmentServices = order.appointmentServices || [];
        const nonCancelledAppointments = appointmentServices.filter((a: any) =>
          a.appointment?.status !== 'cancelled'
        );
        const completedSessions = nonCancelledAppointments.filter((a: any) =>
          a.appointment?.status === 'attended'
        ).length;

        return completedSessions < order.totalSessions;
      }) || [];

      setPatientOrders(activeOrders);
    } catch (err: any) {
      console.error('Error loading patient orders:', err);
      setPatientOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  // ============================================
  // RETURN
  // ============================================

  return {
    // State
    isEditMode,
    isLoading,
    isSaving,
    loadingData,
    loadingOrders,
    services,
    patientOrders,
    allSessions,
    formData,
    errors,
    error,
    selectedSessionServiceId,
    selectedSessionOrderId,
    tempPackageCounter,
    showUploadReceiptModal,
    currentReceipt,
    preselectedOrderId,

    // Setters
    setAllSessions,
    setFormData,
    setErrors,
    setError,
    setSelectedSessionServiceId,
    setSelectedSessionOrderId,
    setTempPackageCounter,
    setShowUploadReceiptModal,
    setCurrentReceipt,
    setIsSaving,

    // Methods
    loadPatientOrders,
    navigate
  };
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getDefaultScheduledDate(scheduledDateParam: string | null): string {
  if (scheduledDateParam) {
    try {
      const date = new Date(scheduledDateParam);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return '';
    }
  }
  return '';
}

function getDefaultDuration(durationMinutesParam: string | null): number {
  if (durationMinutesParam) {
    const duration = parseInt(durationMinutesParam);
    return !isNaN(duration) && duration >= 30 ? duration : 30;
  }
  return 30;
}

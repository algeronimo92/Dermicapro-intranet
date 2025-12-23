import { appointmentsService } from '../services/appointments.service';
import { sessionManager } from '../services/sessionManager.service';
import { formValidator } from '../services/formValidator.service';
import { AppointmentFormData, SessionItem, FormErrors } from './useAppointmentForm';
import { Service, Order } from '../types';

// ============================================
// APPOINTMENT FORM ACTIONS HOOK
// ============================================

interface UseAppointmentFormActionsProps {
  isEditMode: boolean;
  formData: AppointmentFormData;
  allSessions: SessionItem[];
  services: Service[];
  patientOrders: Order[];
  tempPackageCounter: number;
  selectedSessionServiceId: string;
  selectedSessionOrderId: string;
  id?: string;
  preselectedOrderId: string | null;

  // Setters
  setFormData: React.Dispatch<React.SetStateAction<AppointmentFormData>>;
  setAllSessions: React.Dispatch<React.SetStateAction<SessionItem[]>>;
  setErrors: React.Dispatch<React.SetStateAction<FormErrors>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  setTempPackageCounter: React.Dispatch<React.SetStateAction<number>>;
  setSelectedSessionServiceId: React.Dispatch<React.SetStateAction<string>>;
  setSelectedSessionOrderId: React.Dispatch<React.SetStateAction<string>>;
  setCurrentReceipt: React.Dispatch<React.SetStateAction<string | null>>;
  setShowUploadReceiptModal: React.Dispatch<React.SetStateAction<boolean>>;
  loadPatientOrders: (patientId: string) => Promise<void>;
  navigate: (path: string) => void;
}

export const useAppointmentFormActions = (props: UseAppointmentFormActionsProps) => {
  const {
    isEditMode,
    formData,
    allSessions,
    services,
    patientOrders,
    tempPackageCounter,
    selectedSessionServiceId,
    selectedSessionOrderId,
    id,
    preselectedOrderId,
    setFormData,
    setAllSessions,
    setErrors,
    setError,
    setIsSaving,
    setTempPackageCounter,
    setSelectedSessionServiceId,
    setSelectedSessionOrderId,
    setCurrentReceipt,
    setShowUploadReceiptModal,
    loadPatientOrders,
    navigate
  } = props;

  // ============================================
  // FORM HANDLERS
  // ============================================

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'reservationAmount' ? (value ? parseFloat(value) : undefined) :
              name === 'durationMinutes' ? (value ? parseInt(value) : 30) : value
    }));

    if (props.setErrors) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handlePatientChange = (patientId: string) => {
    setFormData(prev => ({
      ...prev,
      patientId,
      orderId: undefined,
      serviceId: prev.serviceId || ''
    }));

    setErrors(prev => ({ ...prev, patientId: '' }));

    if (patientId && !preselectedOrderId) {
      loadPatientOrders(patientId);
    }
  };

  // ============================================
  // SESSION HANDLERS - Delegados a SessionManager
  // ============================================

  const handleAddSession = () => {
    if (!selectedSessionServiceId) return;

    // Usar SessionManager para agregar sesión
    const result = sessionManager.addSession(
      allSessions,
      selectedSessionServiceId,
      selectedSessionOrderId || undefined,
      patientOrders,
      services,
      tempPackageCounter
    );

    setAllSessions(result.sessions);
    setTempPackageCounter(result.newCounter);

    // Reset selectors
    setSelectedSessionServiceId('');
    setSelectedSessionOrderId('');
  };

  const handleRemoveSession = (index: number) => {
    // Usar SessionManager para remover sesión
    const updatedSessions = sessionManager.removeSession(allSessions, index);
    setAllSessions(updatedSessions);
  };

  // ============================================
  // VALIDATION - Delegado a FormValidator
  // ============================================

  const validateForm = (): boolean => {
    const validationErrors = formValidator.validate(formData, allSessions);
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  // ============================================
  // SUBMIT HANDLER
  // ============================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      if (isEditMode && id) {
        // MODO EDIT: Usar SessionOperations
        const sessionOperations = sessionManager.transformToOperations(allSessions, services);

        const submissionData: import('../types').UpdateAppointmentDto = {
          patientId: formData.patientId,
          scheduledDate: formData.scheduledDate,
          durationMinutes: formData.durationMinutes || 30,
          reservationAmount: formData.reservationAmount,
          notes: formData.notes,
          sessionOperations,
        };

        await appointmentsService.updateAppointment(id, submissionData);
      } else {
        // MODO CREATE: Usar services array
        const submissionData: import('../types').CreateAppointmentDto = {
          patientId: formData.patientId,
          scheduledDate: formData.scheduledDate,
          durationMinutes: formData.durationMinutes || 30,
          reservationAmount: formData.reservationAmount,
          notes: formData.notes,
          services: allSessions,
        };

        await appointmentsService.createAppointment(submissionData);
      }

      navigate('/appointments');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar cita');
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================
  // RECEIPT HANDLER
  // ============================================

  const handleUploadReceipt = async (amount: number, file: File) => {
    if (!isEditMode || !id) {
      throw new Error('Solo se puede subir recibo en modo edición');
    }

    try {
      const result = await appointmentsService.uploadReceipt(id, file, amount);
      setCurrentReceipt(result.reservationReceiptUrl || null);
      setFormData(prev => ({ ...prev, reservationAmount: amount }));
      setShowUploadReceiptModal(false);
    } catch (error) {
      console.error('Error uploading receipt:', error);
      throw error;
    }
  };

  const handleCancel = () => {
    navigate('/appointments');
  };

  // ============================================
  // RETURN
  // ============================================

  return {
    handleChange,
    handlePatientChange,
    handleAddSession,
    handleRemoveSession,
    handleSubmit,
    handleUploadReceipt,
    handleCancel
  };
};

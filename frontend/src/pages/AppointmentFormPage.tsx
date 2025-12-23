import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { appointmentsService, CreateAppointmentDto } from '../services/appointments.service';
import { servicesService } from '../services/services.service';
import { patientsService } from '../services/patients.service';
import { Service, Order } from '../types';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Loading } from '../components/Loading';
import { PatientSelector } from '../components/PatientSelector';
import { UploadReservationModal } from '../components/UploadReservationModal';
import { PackageGroupView } from '../components/PackageGroupView';
import { DateTimePicker } from '../components/DateTimePicker';
import { packageSimulator } from '../utils/packageSimulation';
import {
  utcToLocal,
  localToUTC,
  getLocalDateTimeString,
  addMinutes,
  parseLocalDateTime,
  isDateTimeInPast
} from '../utils/dateUtils';

export const AppointmentFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEditMode = !!id;
  const preselectedPatientId = searchParams.get('patientId');
  const preselectedServiceId = searchParams.get('serviceId');
  const preselectedOrderId = searchParams.get('orderId');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listas para selects
  const [services, setServices] = useState<Service[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [patientOrders, setPatientOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Upload receipt modal
  const [showUploadReceiptModal, setShowUploadReceiptModal] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<string | null>(null);
  const [pendingReceiptFile, setPendingReceiptFile] = useState<File | null>(null);

  // Get query parameters for pre-filling form from calendar helper
  const scheduledDateParam = searchParams.get('scheduledDate');
  const durationMinutesParam = searchParams.get('durationMinutes');

  // ✅ Format scheduledDate for datetime-local input using dateUtils
  const getDefaultScheduledDate = () => {
    if (scheduledDateParam) {
      try {
        // El parámetro viene en UTC desde el calendario, convertir a local
        return utcToLocal(scheduledDateParam);
      } catch {
        return '';
      }
    }

    // Si no hay parámetro, calcular la siguiente hora disponible
    const now = new Date();
    const currentMinutes = now.getMinutes();

    // Calcular minutos hasta la siguiente media hora (00 o 30)
    let minutesToAdd;
    if (currentMinutes === 0 || currentMinutes === 30) {
      minutesToAdd = 60;
    } else if (currentMinutes < 30) {
      minutesToAdd = (30 - currentMinutes) + 60;
    } else {
      minutesToAdd = (60 - currentMinutes) + 60;
    }

    // Calcular nueva fecha usando dateUtils
    const futureDate = addMinutes(now, minutesToAdd);
    return getLocalDateTimeString(futureDate);
  };

  const getDefaultDuration = () => {
    if (durationMinutesParam) {
      const duration = parseInt(durationMinutesParam);
      return !isNaN(duration) && duration >= 30 ? duration : 30;
    }
    return 30;
  };

  const [formData, setFormData] = useState<CreateAppointmentDto>({
    patientId: preselectedPatientId || '',
    serviceId: preselectedServiceId || '',
    scheduledDate: getDefaultScheduledDate(),
    durationMinutes: getDefaultDuration(),
    reservationAmount: undefined,
    notes: '',
    orderId: preselectedOrderId || undefined,
    services: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Estado para agregar sesiones (unificado)
  const [selectedSessionServiceId, setSelectedSessionServiceId] = useState<string>('');
  const [selectedSessionOrderId, setSelectedSessionOrderId] = useState<string>('');

  // Counter para IDs temporales de paquetes nuevos
  const [tempPackageCounter, setTempPackageCounter] = useState(0);

  // Lista unificada de todas las sesiones (incluye la "primera" y las "adicionales")
  const [allSessions, setAllSessions] = useState<Array<{
    serviceId: string;
    orderId?: string;
    sessionNumber?: number;
    appointmentServiceId?: string; // ID del appointmentService si existe en BD
    tempPackageId?: string; // ID temporal para agrupar sesiones nuevas del mismo paquete
    markedForDeletion?: boolean; // Marca sesiones existentes para eliminar (solo paquetes existentes)
  }>>([]);

  // Mapa de precios personalizados para paquetes temporales: tempPackageId -> precio final
  const [packageCustomPrices, setPackageCustomPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (isEditMode && id) {
      loadAppointment(id);
    }
  }, [id]);

  useEffect(() => {
    // Load orders if patient is preselected and no order is preselected
    if (preselectedPatientId && !preselectedOrderId) {
      loadPatientOrders(preselectedPatientId);
    }
  }, [preselectedPatientId, preselectedOrderId]);

  useEffect(() => {
    // If we have preselected service and order, initialize the first session
    if (preselectedServiceId && preselectedOrderId && allSessions.length === 0) {
      setAllSessions([{
        serviceId: preselectedServiceId,
        orderId: preselectedOrderId,
        sessionNumber: undefined // Will be calculated by backend
      }]);
    }
  }, [preselectedServiceId, preselectedOrderId]);

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

      // ✅ Convertir scheduledDate de UTC a local usando dateUtils
      const formattedDate = utcToLocal(appointment.scheduledDate);

      setFormData({
        patientId: appointment.patientId,
        scheduledDate: formattedDate,
        durationMinutes: appointment.durationMinutes,
        reservationAmount: appointment.reservationAmount,
        notes: appointment.notes || '',
        services: [] // Services are managed separately in edit mode
      });

      // Load reservation receipt if exists
      if (appointment.reservationReceiptUrl) {
        setCurrentReceipt(appointment.reservationReceiptUrl);
      }

      // Load appointmentServices into allSessions for editing
      if (appointment.appointmentServices && appointment.appointmentServices.length > 0) {
        const sessions = appointment.appointmentServices
          .filter(appSvc => appSvc.order?.serviceId) // Filter out invalid entries
          .map(appSvc => ({
            serviceId: appSvc.order!.serviceId as string,
            orderId: appSvc.order!.id as string | undefined,
            sessionNumber: appSvc.sessionNumber || undefined,
            appointmentServiceId: appSvc.id // Marcar como sesión existente en BD
          }));
        setAllSessions(sessions);
      }

      // Load patient orders for editing
      if (appointment.patientId) {
        await loadPatientOrders(appointment.patientId);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar cita');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'reservationAmount' ? (value ? parseFloat(value) : undefined) :
              name === 'durationMinutes' ? (value ? parseInt(value) : 30) : value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
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

      // Filter orders that have pending sessions (not fully completed)
      const activeOrders = patient.orders?.filter(order => {
        const appointmentServices = order.appointmentServices || [];
        // Only count non-cancelled appointments
        const nonCancelledAppointments = appointmentServices.filter((a: any) => a.appointment?.status !== 'cancelled');
        const completedSessions = nonCancelledAppointments.filter((a: any) => a.appointment?.status === 'attended').length;

        // Only show orders that have pending sessions
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

  const handlePatientChange = (patientId: string) => {
    setFormData(prev => ({
      ...prev,
      patientId,
      orderId: undefined, // Reset order selection when patient changes
      serviceId: preselectedServiceId || '' // Reset service unless pre-selected
    }));
    if (errors.patientId) {
      setErrors(prev => ({ ...prev, patientId: '' }));
    }

    // Load patient's active orders
    if (patientId && !preselectedOrderId) {
      loadPatientOrders(patientId);
    }
  };

  const handleAddSession = () => {
    if (!selectedSessionServiceId) return;

    let sessionNumber: number = 1; // IMPORTANTE: Siempre inicializar con 1
    let tempPackageId: string | undefined = undefined;
    let orderId: string | undefined = undefined;

    if (selectedSessionOrderId) {
      // Verificar si es un paquete EXISTENTE (de BD) o SIMULADO (tempPackageId)
      const isSimulatedPackage = selectedSessionOrderId.startsWith('temp-');

      if (isSimulatedPackage) {
        // Asignar a paquete SIMULADO existente
        tempPackageId = selectedSessionOrderId;
        // Calcular sessionNumber para paquete simulado
        const sessionsInSimulatedPackage = allSessions.filter(s => s.tempPackageId === selectedSessionOrderId);
        sessionNumber = sessionsInSimulatedPackage.length + 1;
      } else {
        // Asignar a paquete EXISTENTE (de BD)
        orderId = selectedSessionOrderId;
        const selectedOrder = patientOrders.find(o => o.id === selectedSessionOrderId);
        if (selectedOrder) {
          // Find next available session number
          const appointmentServices = selectedOrder.appointmentServices || [];
          const nonCancelledAppointments = appointmentServices.filter((a: any) => a.appointment?.status !== 'cancelled') || [];
          const occupiedNumbers = new Set(nonCancelledAppointments.map((a: any) => a.sessionNumber).filter(Boolean));

          // IMPORTANTE: También considerar sesiones que ya están en allSessions para este paquete
          const sessionsInForm = allSessions.filter(s => s.orderId === selectedSessionOrderId);
          sessionsInForm.forEach(s => {
            if (s.sessionNumber) {
              occupiedNumbers.add(s.sessionNumber);
            }
          });

          sessionNumber = 1;
          while (occupiedNumbers.has(sessionNumber)) {
            sessionNumber++;
          }
        }
      }
    } else {
      // No se seleccionó ningún paquete → crear NUEVO paquete
      // Generar ID temporal único para este nuevo paquete
      tempPackageId = `temp-${selectedSessionServiceId}-${tempPackageCounter}`;
      setTempPackageCounter(prev => prev + 1);
      // Primera sesión del nuevo paquete
      sessionNumber = 1;
    }

    const newSession = {
      serviceId: selectedSessionServiceId,
      orderId,
      sessionNumber, // IMPORTANTE: Siempre incluir sessionNumber
      tempPackageId
    };

    setAllSessions(prev => [...prev, newSession]);

    // Limpiar error de sesiones si existe
    if (errors.sessions) {
      setErrors(prev => ({ ...prev, sessions: '' }));
    }

    // Reset selectors
    setSelectedSessionServiceId('');
    setSelectedSessionOrderId('');
  };

  const handleRemoveSession = (index: number) => {
    setAllSessions(prev => {
      const session = prev[index];

      // Si es una sesión EXISTENTE (tiene appointmentServiceId), marcarla para eliminar
      if (session.appointmentServiceId) {
        const updatedSessions = prev.map((s, i) =>
          i === index ? { ...s, markedForDeletion: !s.markedForDeletion } : s
        );

        // Aplicar compensación automática: si hay sesiones marcadas para eliminar Y sesiones nuevas en el mismo paquete
        return applySessionCompensation(updatedSessions);
      }

      // Si es una sesión NUEVA/SIMULADA (no tiene appointmentServiceId), eliminarla directamente
      const updatedSessions = prev.filter((_, i) => i !== index);

      // Aplicar compensación automática después de eliminar sesión nueva
      return applySessionCompensation(updatedSessions);
    });
  };

  /**
   * Aplica compensación automática entre sesiones marcadas para eliminar y sesiones nuevas
   * en el mismo paquete (misma combinación de serviceId + orderId/tempPackageId)
   *
   * REGLA: Siempre mantener las sesiones con número más bajo (más cercanas a la primera sesión)
   */
  const applySessionCompensation = (sessions: typeof allSessions) => {
    // Agrupar sesiones por paquete (mismo criterio que packageSimulation)
    const packageGroups = new Map<string, number[]>();

    sessions.forEach((session, index) => {
      let packageKey: string;
      if (session.orderId) {
        packageKey = `existing-${session.orderId}`;
      } else if (session.tempPackageId) {
        packageKey = session.tempPackageId;
      } else {
        packageKey = `new-${session.serviceId}`;
      }

      if (!packageGroups.has(packageKey)) {
        packageGroups.set(packageKey, []);
      }
      packageGroups.get(packageKey)!.push(index);
    });

    let compensatedSessions = [...sessions];
    const indicesToRemove = new Set<number>();

    // Para cada paquete, verificar si hay sesiones por eliminar y por agregar
    packageGroups.forEach((indices) => {
      // Sesiones existentes marcadas para eliminar (ordenadas por sessionNumber ascendente)
      const markedForDeletionWithNumbers = indices
        .filter(i => compensatedSessions[i].markedForDeletion && compensatedSessions[i].appointmentServiceId)
        .map(i => ({
          index: i,
          sessionNumber: compensatedSessions[i].sessionNumber || 999
        }))
        .sort((a, b) => a.sessionNumber - b.sessionNumber);

      // Sesiones nuevas (ordenadas por sessionNumber descendente - eliminar las más altas primero)
      const newSessionsWithNumbers = indices
        .filter(i => !compensatedSessions[i].appointmentServiceId && !compensatedSessions[i].markedForDeletion)
        .map(i => ({
          index: i,
          sessionNumber: compensatedSessions[i].sessionNumber || 999
        }))
        .sort((a, b) => b.sessionNumber - a.sessionNumber);

      // Compensar: por cada sesión marcada para eliminar, cancelar con una sesión nueva
      // Prioridad: mantener sesiones con números más bajos, eliminar sesiones con números más altos
      const compensationCount = Math.min(markedForDeletionWithNumbers.length, newSessionsWithNumbers.length);

      for (let i = 0; i < compensationCount; i++) {
        const deletionIndex = markedForDeletionWithNumbers[i].index;
        const newIndex = newSessionsWithNumbers[i].index;

        // Desmarcar la sesión existente (vuelve a estado normal) - mantiene número bajo
        compensatedSessions[deletionIndex] = {
          ...compensatedSessions[deletionIndex],
          markedForDeletion: false,
        };

        // Marcar la sesión nueva para eliminar del array - elimina número alto
        indicesToRemove.add(newIndex);
      }
    });

    // Eliminar las sesiones nuevas que fueron compensadas
    if (indicesToRemove.size > 0) {
      compensatedSessions = compensatedSessions.filter((_, i) => !indicesToRemove.has(i));
    }

    // Renumerar sesiones nuevas en cada paquete para llenar huecos
    compensatedSessions = renumberNewSessions(compensatedSessions);

    return compensatedSessions;
  };

  /**
   * Renumera las sesiones nuevas (sin appointmentServiceId) en cada paquete
   * para que sean consecutivas (1, 2, 3...) sin huecos
   *
   * Toma en cuenta los números ya ocupados por sesiones existentes
   */
  const renumberNewSessions = (sessions: typeof allSessions) => {
    // Agrupar sesiones por paquete
    const packageGroups = new Map<string, number[]>();

    sessions.forEach((session, index) => {
      let packageKey: string;
      if (session.orderId) {
        packageKey = `existing-${session.orderId}`;
      } else if (session.tempPackageId) {
        packageKey = session.tempPackageId;
      } else {
        packageKey = `new-${session.serviceId}`;
      }

      if (!packageGroups.has(packageKey)) {
        packageGroups.set(packageKey, []);
      }
      packageGroups.get(packageKey)!.push(index);
    });

    let renumberedSessions = [...sessions];

    // Para cada paquete, renumerar solo las sesiones nuevas
    packageGroups.forEach((indices) => {
      // Obtener números ya ocupados por sesiones existentes
      const occupiedNumbers = new Set<number>();
      indices.forEach(i => {
        const session = renumberedSessions[i];
        // Solo contar sesiones existentes (con appointmentServiceId) y que no estén marcadas para eliminar
        if (session.appointmentServiceId && !session.markedForDeletion && session.sessionNumber) {
          occupiedNumbers.add(session.sessionNumber);
        }
      });

      // Filtrar solo sesiones nuevas (sin appointmentServiceId)
      const newSessionIndices = indices.filter(
        i => !renumberedSessions[i].appointmentServiceId
      );

      // Renumerar sesiones nuevas encontrando el primer número disponible
      newSessionIndices.forEach((index) => {
        let nextNumber = 1;
        while (occupiedNumbers.has(nextNumber)) {
          nextNumber++;
        }

        renumberedSessions[index] = {
          ...renumberedSessions[index],
          sessionNumber: nextNumber,
        };

        // Marcar este número como ocupado para la siguiente sesión nueva
        occupiedNumbers.add(nextNumber);
      });
    });

    return renumberedSessions;
  };

  /**
   * Handler para actualizar el precio de un paquete temporal
   */
  const handleUpdatePackagePrice = (tempPackageId: string, newPrice: number) => {
    setPackageCustomPrices(prev => ({
      ...prev,
      [tempPackageId]: newPrice
    }));
  };

  /**
   * Transforma el estado de simulación a operaciones explícitas para el backend
   */
  const transformSessionsToOperations = (
    sessions: typeof allSessions
  ): import('../types').SessionOperations => {
    const toDelete: string[] = [];
    const toCreate: Array<{
      orderId?: string;
      serviceId: string;
      sessionNumber: number;
      tempPackageId?: string;
    }> = [];
    const newOrders: Array<{
      serviceId: string;
      totalSessions: number;
      tempPackageId: string;
    }> = [];
    const orderPriceUpdates: Array<{
      orderId: string;
      finalPrice: number;
    }> = [];

    // Track which new orders we've already added
    const addedNewOrders = new Set<string>();
    // Track which existing orders have custom prices
    const processedOrderPrices = new Set<string>();

    sessions.forEach((session) => {
      // 1. Sesiones existentes marcadas para eliminar (soft delete)
      if (session.appointmentServiceId && session.markedForDeletion) {
        toDelete.push(session.appointmentServiceId);
      }

      // 2. Sesiones nuevas (a crear)
      if (!session.appointmentServiceId && !session.markedForDeletion) {
        // Si tiene orderId, es sesión nueva de paquete existente
        if (session.orderId) {
          toCreate.push({
            orderId: session.orderId,
            serviceId: session.serviceId,
            sessionNumber: session.sessionNumber || 1,
          });
        }
        // Si tiene tempPackageId, es sesión de paquete nuevo
        else if (session.tempPackageId) {
          // Agregar el nuevo paquete solo una vez
          if (!addedNewOrders.has(session.tempPackageId)) {
            const service = services.find((s) => s.id === session.serviceId);
            newOrders.push({
              serviceId: session.serviceId,
              totalSessions: service?.defaultSessions || 1,
              tempPackageId: session.tempPackageId,
            });
            addedNewOrders.add(session.tempPackageId);
          }

          // Agregar la sesión a crear (el backend creará el Order primero)
          toCreate.push({
            serviceId: session.serviceId,
            sessionNumber: session.sessionNumber || 1,
            tempPackageId: session.tempPackageId,
          });
        }
      }

      // 3. Check for custom prices on existing orders
      if (session.orderId && !processedOrderPrices.has(session.orderId)) {
        const packageKey = `existing-${session.orderId}`;
        const customPrice = packageCustomPrices[packageKey];
        if (customPrice !== undefined) {
          orderPriceUpdates.push({
            orderId: session.orderId,
            finalPrice: customPrice,
          });
          processedOrderPrices.add(session.orderId);
        }
      }
    });

    return { toDelete, toCreate, newOrders, orderPriceUpdates };
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.patientId) {
      newErrors.patientId = 'Debe seleccionar un paciente';
    }
    if (allSessions.length === 0) {
      newErrors.sessions = 'Debe agregar al menos una sesión a realizar';
    }
    if (!formData.scheduledDate) {
      newErrors.scheduledDate = 'La fecha y hora son requeridas';
    } else {
      // ✅ Validar correctamente usando dateUtils
      if (isDateTimeInPast(formData.scheduledDate)) {
        newErrors.scheduledDate = 'La fecha no puede ser en el pasado';
      }
    }
    if (!formData.durationMinutes || formData.durationMinutes < 30) {
      newErrors.durationMinutes = 'La duración mínima es 30 minutos';
    }
    if (formData.reservationAmount !== undefined && formData.reservationAmount < 0) {
      newErrors.reservationAmount = 'El monto debe ser mayor o igual a 0';
    }

    setErrors(newErrors);

    // Scroll to first error
    if (Object.keys(newErrors).length > 0) {
      setTimeout(() => {
        const firstError = document.querySelector('.alert-error, .input-error-message');
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      if (isEditMode && id) {
        // MODO EDIT: Usar SessionOperations para integración con simulación
        const sessionOperations = transformSessionsToOperations(allSessions);

        const submissionData: import('../types').UpdateAppointmentDto = {
          patientId: formData.patientId,
          scheduledDate: localToUTC(formData.scheduledDate), // ✅ Convertir a UTC para backend
          durationMinutes: formData.durationMinutes,
          reservationAmount: formData.reservationAmount,
          notes: formData.notes,
          sessionOperations,
        };

        await appointmentsService.updateAppointment(id, submissionData);
      } else {
        // MODO CREATE: Crear cita y luego subir recibo si existe
        // Agregar precios personalizados a las sesiones
        const sessionsWithPrices = allSessions.map(session => ({
          ...session,
          customPrice: session.tempPackageId ? packageCustomPrices[session.tempPackageId] : undefined
        }));

        const submissionData: import('../types').CreateAppointmentDto = {
          patientId: formData.patientId,
          scheduledDate: localToUTC(formData.scheduledDate), // ✅ Convertir a UTC para backend
          durationMinutes: formData.durationMinutes || 30,
          reservationAmount: formData.reservationAmount,
          notes: formData.notes,
          services: sessionsWithPrices,
        };

        const createdAppointment = await appointmentsService.createAppointment(submissionData);

        // Si hay un archivo de recibo pendiente, subirlo ahora
        if (pendingReceiptFile && createdAppointment.id) {
          try {
            await appointmentsService.uploadReceipt(
              createdAppointment.id,
              pendingReceiptFile,
              formData.reservationAmount || 0
            );
          } catch (uploadError) {
            console.error('Error uploading receipt after creation:', uploadError);
            // No fallar la creación si el recibo no se pudo subir
          }
        }
      }

      navigate('/appointments');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar cita');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadReceipt = async (amount: number, file: File) => {
    if (isEditMode && id) {
      // MODO EDIT: Subir inmediatamente al servidor
      try {
        const result = await appointmentsService.uploadReceipt(id, file, amount);
        setCurrentReceipt(result.reservationReceiptUrl || null);
        setFormData(prev => ({ ...prev, reservationAmount: amount }));
        setShowUploadReceiptModal(false);
      } catch (error) {
        console.error('Error uploading receipt:', error);
        throw error;
      }
    } else {
      // MODO CREATE: Guardar archivo temporalmente para enviar en la creación
      setPendingReceiptFile(file);
      setFormData(prev => ({ ...prev, reservationAmount: amount }));
      // Crear preview URL para mostrar la imagen
      const previewUrl = URL.createObjectURL(file);
      setCurrentReceipt(previewUrl);
      setShowUploadReceiptModal(false);
    }
  };

  const handleCancel = () => {
    navigate('/appointments');
  };

  if (loadingData || isLoading) {
    return <Loading text="Cargando datos..." />;
  }

  return (
    <div className="appointment-detail-modern">
      {/* Header Mobile-First */}
      <div className="detail-header">
        <button className="btn-back" onClick={handleCancel}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Volver
        </button>

        <h1 className="detail-title">{isEditMode ? 'Editar Cita' : 'Nueva Cita'}</h1>

        <div className="header-spacer"></div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM10 6v4M10 14h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {error}
        </div>
      )}

      {/* Preselected Order Alert */}
      {preselectedOrderId && (
        <div className="alert alert-success">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM10 6v4M10 14h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div>
            <strong>Sesión Siguiente:</strong> El paciente y servicio ya están preseleccionados para esta sesión del pedido.
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit}>
        {/* Patient Selection Card */}
        <div className="glass-card">
          <div className="card-header">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="card-icon">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 11a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h2>Información del Paciente</h2>
          </div>

          <PatientSelector
            value={formData.patientId}
            onChange={handlePatientChange}
            error={errors.patientId}
            disabled={isSaving || !!preselectedOrderId}
          />
        </div>

        {/* Sessions Card - Unified interface for both create and edit modes */}
        {formData.patientId && (
          <div className="glass-card">
            <div className="card-header">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="card-icon">
                <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h2>Servicios de esta Cita</h2>
            </div>

            <p className="services-subtitle">
              {isEditMode ? 'Edita las sesiones/procedimientos de esta cita' : 'Agrega todas las sesiones/procedimientos que se realizarán en esta visita'}
            </p>

            {/* Error message if no sessions */}
            {errors.sessions && (
              <div className="alert alert-error" style={{ marginBottom: '20px' }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM10 6v4M10 14h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {errors.sessions}
              </div>
            )}

            {/* List of added sessions - Using Professional Package Simulation for BOTH modes */}
            {allSessions.length > 0 && (() => {
              // Simulate package groups using Strategy + Factory patterns
              const packageGroups = packageSimulator.simulatePackages(
                allSessions,
                services,
                patientOrders,
                isEditMode,
                packageCustomPrices
              );

              return (
                <PackageGroupView
                  packageGroups={packageGroups}
                  services={services}
                  onRemoveSession={handleRemoveSession}
                  onUpdatePackagePrice={handleUpdatePackagePrice}
                />
              );
            })()}

            {/* Add new session form - SAME for both modes */}
            {!preselectedOrderId && (
              <div className="add-session-form">
                <div className="add-session-header">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd"/>
                  </svg>
                  <span>Agregar Sesión</span>
                </div>

                <div className="add-session-fields">
                  <Select
                    label="Servicio/Tratamiento *"
                    name="sessionService"
                    value={selectedSessionServiceId}
                    onChange={(e) => setSelectedSessionServiceId(e.target.value)}
                    options={[
                      { value: '', label: '-- Seleccionar servicio --' },
                      ...services.map(s => ({
                        value: s.id,
                        label: `${s.name} - S/. ${s.basePrice}${s.defaultSessions > 1 ? ` (${s.defaultSessions} sesiones)` : ''}`
                      }))
                    ]}
                  />

                  {selectedSessionServiceId && (() => {
                    const selectedService = services.find(s => s.id === selectedSessionServiceId);

                    // VALIDACIÓN: Servicios de 1 sesión SIEMPRE crean paquetes nuevos
                    if (selectedService && selectedService.defaultSessions === 1) {
                      return (
                        <div className="alert alert-info" style={{ marginTop: '12px', fontSize: '13px' }}>
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                          </svg>
                          <span>Este servicio es de sesión única. Se creará automáticamente un nuevo paquete.</span>
                        </div>
                      );
                    }

                    // No hay órdenes del paciente o servicio no válido
                    if (!selectedService || patientOrders.length === 0) {
                      return null;
                    }

                    // 1. Filtrar paquetes EXISTENTES disponibles (no completos)
                    const availableOrders = patientOrders
                      .filter(order => order.serviceId === selectedSessionServiceId)
                      .map(order => {
                        const appointmentServices = order.appointmentServices || [];
                        const nonCancelledAppointments = appointmentServices.filter((a: any) => a.appointment?.status !== 'cancelled') || [];
                        const pendingAppointments = nonCancelledAppointments.filter((a: any) => a.appointment?.status === 'reserved');
                        const hasPending = pendingAppointments.length > 0;
                        const occupiedNumbers = new Set(nonCancelledAppointments.map((a: any) => a.sessionNumber).filter(Boolean));

                        // IMPORTANTE: También contar sesiones que ya están en allSessions para este paquete
                        const sessionsInForm = allSessions.filter(s => s.orderId === order.id);
                        sessionsInForm.forEach(s => {
                          if (s.sessionNumber) {
                            occupiedNumbers.add(s.sessionNumber);
                          } else {
                            let calculatedSession = 1;
                            while (occupiedNumbers.has(calculatedSession)) {
                              calculatedSession++;
                            }
                            occupiedNumbers.add(calculatedSession);
                          }
                        });

                        let nextSession = 1;
                        while (occupiedNumbers.has(nextSession)) {
                          nextSession++;
                        }
                        const isComplete = nextSession > order.totalSessions;
                        return {
                          type: 'existing' as const,
                          order,
                          nextSession,
                          hasPending,
                          isComplete
                        };
                      })
                      .filter(item => !item.isComplete);

                    // 2. Identificar paquetes SIMULADOS (temporales) en allSessions
                    const simulatedPackages = allSessions
                      .filter(s => s.tempPackageId && s.serviceId === selectedSessionServiceId)
                      .reduce((acc, session) => {
                        const key = session.tempPackageId!;
                        if (!acc[key]) {
                          acc[key] = [];
                        }
                        acc[key].push(session);
                        return acc;
                      }, {} as Record<string, typeof allSessions>);

                    const availableSimulatedPackages = Object.entries(simulatedPackages).map(([tempPackageId, sessions]) => {
                      const nextSession = sessions.length + 1;
                      const isComplete = nextSession > selectedService.defaultSessions;
                      return {
                        type: 'simulated' as const,
                        tempPackageId,
                        sessions,
                        nextSession,
                        totalSessions: selectedService.defaultSessions,
                        isComplete
                      };
                    }).filter(item => !item.isComplete);

                    // 3. Combinar ambos tipos de paquetes
                    const allAvailablePackages = [
                      ...availableOrders,
                      ...availableSimulatedPackages
                    ];

                    // Solo mostrar selector si hay paquetes disponibles
                    if (allAvailablePackages.length === 0) {
                      return (
                        <div className="alert alert-success" style={{ marginTop: '12px', fontSize: '13px' }}>
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                          </svg>
                          <span>Se creará un nuevo paquete de {selectedService.defaultSessions} sesiones automáticamente</span>
                        </div>
                      );
                    }

                    return (
                      <div>
                        <Select
                          label="¿Asociar a un paquete? (opcional)"
                          name="sessionOrder"
                          value={selectedSessionOrderId}
                          onChange={(e) => setSelectedSessionOrderId(e.target.value)}
                          options={[
                            { value: '', label: 'No, crear nuevo paquete' },
                            ...allAvailablePackages.map((item, idx) => {
                              if (item.type === 'existing') {
                                // Paquete EXISTENTE (de base de datos)
                                const orderDate = new Date(item.order.createdAt);
                                const dateStr = orderDate.toLocaleDateString('es-PE', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                });

                                // Si hay múltiples paquetes, mostrar identificador adicional
                                const identifier = allAvailablePackages.length > 1 ? ` - Creado ${dateStr}` : '';

                                return {
                                  value: item.order.id,
                                  label: `📦 Paquete ${idx + 1}: Sesión ${item.nextSession} de ${item.order.totalSessions}${identifier}${item.hasPending ? ' ⚠️' : ''}`,
                                  disabled: item.hasPending
                                };
                              } else {
                                // Paquete SIMULADO (temporal)
                                return {
                                  value: item.tempPackageId,
                                  label: `🆕 Paquete Simulado ${idx + 1}: Sesión ${item.nextSession} de ${item.totalSessions}`,
                                  disabled: false
                                };
                              }
                            })
                          ]}
                        />
                        {!selectedSessionOrderId && (
                          <div className="alert alert-success" style={{ marginTop: '12px', fontSize: '13px' }}>
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                            </svg>
                            <span>Se creará un nuevo paquete de {selectedService.defaultSessions} sesiones automáticamente</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleAddSession}
                    disabled={!selectedSessionServiceId}
                    style={{ width: '100%' }}
                  >
                    ➕ Agregar a la Lista
                  </Button>
                </div>
              </div>
            )}

            {loadingOrders && (
              <div className="loading-orders">
                <div className="spinner-small"></div>
                <span>Cargando paquetes del paciente...</span>
              </div>
            )}
          </div>
        )}

        {/* Date & Time Card */}
        <div className="glass-card">
          <div className="card-header">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="card-icon">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
              <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <h2>Fecha y Duración</h2>
          </div>

          <div style={{ display: 'grid', gap: '20px' }}>
            <DateTimePicker
              label="Fecha y Hora *"
              value={formData.scheduledDate}
              onChange={(value) => {
                setFormData(prev => ({ ...prev, scheduledDate: value }));
                if (errors.scheduledDate) {
                  setErrors(prev => ({ ...prev, scheduledDate: '' }));
                }
              }}
              error={errors.scheduledDate}
              minDate={new Date()}
              timeSlotInterval={30}
            />

            <Select
              label="Duración *"
              name="durationMinutes"
              value={formData.durationMinutes?.toString() || '30'}
              onChange={handleChange}
              error={errors.durationMinutes}
              options={[
                { value: '30', label: '30 minutos' },
                { value: '45', label: '45 minutos' },
                { value: '60', label: '1 hora' },
                { value: '90', label: '1.5 horas' },
                { value: '120', label: '2 horas' },
                { value: '150', label: '2.5 horas' },
                { value: '180', label: '3 horas' }
              ]}
            />
          </div>
        </div>

        {/* Additional Info Card */}
        <div className="glass-card">
          <div className="card-header">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="card-icon">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="1" y1="10" x2="23" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h2>Información Adicional</h2>
          </div>

          <div style={{ display: 'grid', gap: '20px' }}>
            <Input
              label="Monto de Reserva (S/.)"
              type="number"
              name="reservationAmount"
              value={formData.reservationAmount?.toString() || ''}
              onChange={handleChange}
              error={errors.reservationAmount}
              placeholder="0.00"
              step="0.01"
              min="0"
            />

            {/* Upload Receipt Section */}
            <div>
              <label className="field-label">
                Comprobante de Reserva
              </label>

              {currentReceipt ? (
                <div className="receipt-container">
                  {/* Miniatura de la imagen */}
                  <div className="receipt-image-wrapper">
                    <img
                      src={currentReceipt.startsWith('blob:') ? currentReceipt : `http://localhost:3000${currentReceipt}`}
                      alt="Recibo de reserva"
                      className="receipt-image"
                    />
                  </div>

                    {/* Información y acciones */}
                    <div className="receipt-info">
                      <div className="receipt-status">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ color: 'var(--color-success)', flexShrink: 0 }}>
                          <path d="M7 9l2 2L17 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M16 10v6a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className="receipt-status-text">
                          Recibo subido
                        </span>
                      </div>
                      <div className="receipt-actions">
                        <a
                          href={currentReceipt.startsWith('blob:') ? currentReceipt : `http://localhost:3000${currentReceipt}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="receipt-view-btn"
                        >
                          Ver
                        </a>
                        <button
                          type="button"
                          onClick={() => setShowUploadReceiptModal(true)}
                          className="receipt-change-btn"
                        >
                          Cambiar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowUploadReceiptModal(true)}
                    className="upload-receipt-button"
                  >
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="upload-icon">
                      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/>
                      <path d="M16 10v12M10 16h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <span className="upload-label">
                      Subir Comprobante
                    </span>
                    <span className="upload-hint">
                      JPG, PNG o PDF (máx. 5MB)
                    </span>
                  </button>
                )}
            </div>

            <div>
              <label className="field-label">
                Notas
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Observaciones adicionales..."
                rows={4}
                className="notes-textarea"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button
            type="button"
            className="action-btn secondary"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Cancelar
          </button>
          <button
            type="submit"
            className="action-btn primary"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <div className="spinner-small"></div>
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M16.667 5L7.5 14.167L3.333 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>{isEditMode ? 'Guardar Cambios' : 'Crear Cita'}</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Upload Receipt Modal */}
      <UploadReservationModal
        isOpen={showUploadReceiptModal}
        onClose={() => setShowUploadReceiptModal(false)}
        onSubmit={handleUploadReceipt}
      />
    </div>
  );
};

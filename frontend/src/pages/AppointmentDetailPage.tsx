import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { appointmentsService } from '../services/appointments.service';
import { patientsService } from '../services/patients.service';
import { Appointment, Patient } from '../types';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';
import { Modal } from '../components/Modal';
import { AttendAppointmentModal } from '../components/AttendAppointmentModal';
import { UploadReservationModal } from '../components/UploadReservationModal';
import { UploadPhotosModal } from '../components/UploadPhotosModal';
import { BodyMeasurementsModal } from '../components/BodyMeasurementsModal';
import { StateTransitionSelector } from '../components/StateTransitionSelector';
import { PackageGroupView } from '../components/PackageGroupView';
import { useAuth } from '../contexts/AuthContext';
import { packageSimulator } from '../utils/packageSimulation';
import { addToGoogleCalendar, downloadICSFile } from '../utils/googleCalendar';
import {
  getStateConfig,
  hasPermission,
  getPaymentUrgency,
} from '../config/appointmentStates.config';
import '../styles/appointment-detail.css';
import '../styles/state-transitions.css';

// Helper function to get full URL for receipt
const getReceiptUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  const serverUrl = baseUrl.replace('/api', '');
  return `${serverUrl}${path}`;
};

export const AppointmentDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [patientData, setPatientData] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAttendModal, setShowAttendModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showPhotoUploadModal, setShowPhotoUploadModal] = useState(false);
  const [photoUploadType, setPhotoUploadType] = useState<'before' | 'after'>('before');
  const [photoViewMode, setPhotoViewMode] = useState<'list' | 'compare'>('list');
  const [newNote, setNewNote] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [showBodyMeasurementsModal, setShowBodyMeasurementsModal] = useState(false);

  // System Info collapsible state - expandido por defecto en estados finales
  const [systemInfoExpanded, setSystemInfoExpanded] = useState(() => {
    // Expandido por defecto en: attended, cancelled, no_show
    return false; // Se actualizará basado en el estado de la cita
  });

  useEffect(() => {
    if (id) {
      loadAppointment(id);
    }
  }, [id]);

  // Actualizar estado de expansión cuando cambia el estado de la cita
  useEffect(() => {
    if (appointment) {
      const isFinalState = ['attended', 'cancelled', 'no_show'].includes(appointment.status);
      setSystemInfoExpanded(isFinalState);
    }
  }, [appointment?.status]);

  // Fetch patient data with all orders when appointment loads
  useEffect(() => {
    if (appointment?.patientId) {
      loadPatientData(appointment.patientId);
    }
  }, [appointment?.patientId]);

  const loadAppointment = async (appointmentId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await appointmentsService.getAppointment(appointmentId);
      setAppointment(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar cita');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPatientData = async (patientId: string) => {
    try {
      const data = await patientsService.getPatientWithOrders(patientId);
      setPatientData(data);
    } catch (err: any) {
      console.error('Error loading patient data:', err);
    }
  };

  const handleEdit = () => {
    navigate(`/appointments/${id}/edit`);
  };

  const handleUploadReceipt = () => {
    setShowUploadModal(true);
  };

  const handleUploadSubmit = async (amount: number, file: File) => {
    if (!id) return;

    try {
      setError(null);
      setUploadSuccess(false);
      const updated = await appointmentsService.uploadReceipt(id, file, amount);
      setAppointment(updated);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al subir recibo');
      throw err;
    }
  };

  const handleBack = () => {
    navigate('/appointments');
  };

  const handleViewPatient = () => {
    if (appointment?.patientId) {
      navigate(`/patients/${appointment.patientId}`);
    }
  };

  const handleViewInvoices = () => {
    if (appointment?.patientId) {
      // TODO: Navigate to patient invoices page
      navigate(`/patients/${appointment.patientId}/invoices`);
    }
  };

  const handlePhotoUpload = async (files: File[]) => {
    if (!id) return;

    try {
      setError(null);

      // Upload photos
      const response = await appointmentsService.uploadTreatmentPhotos(files);

      // Update patient record with new photos
      // Note: We need to create a backend endpoint for this
      const photoUrls = response.urls;

      // For now, we'll need to create an endpoint that adds photos to existing patient records
      // TODO: Implement backend endpoint to add photos to patient record
      await appointmentsService.addPhotosToAppointment(id, {
        photoUrls,
        type: photoUploadType
      });

      // Reload appointment to show new photos
      await loadAppointment(id);

      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al subir fotos');
      throw err;
    }
  };

  const handleAddNote = async () => {
    if (!id || !newNote.trim()) return;

    try {
      setIsSubmittingNote(true);
      setError(null);

      await appointmentsService.createAppointmentNote(id, newNote.trim());

      // Reload appointment to show new note
      await loadAppointment(id);

      // Clear input
      setNewNote('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al agregar nota');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleSaveBodyMeasurements = async (data: {
    weight?: number | null;
    bodyMeasurement?: any;
    healthNotes?: string;
  }) => {
    if (!id) return;

    try {
      setError(null);
      await appointmentsService.updateBodyMeasurements(id, data);

      // Reload appointment to show new measurements
      await loadAppointment(id);

      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar medidas');
      throw err;
    }
  };

  if (isLoading) {
    return <Loading text="Cargando información de la cita..." />;
  }

  if (error && !appointment) {
    return (
      <div className="page-container">
        <div className="error-banner">
          {error}
        </div>
        <Button onClick={handleBack}>Volver</Button>
      </div>
    );
  }

  if (!appointment) {
    return <div className="page-container"><p>Cita no encontrada</p></div>;
  }

  // ============================================
  // CONFIGURACIÓN BASADA EN ESTADO
  // ============================================
  const stateConfig = getStateConfig(appointment.status);
  const userRole = user?.role;

  // Permisos derivados de la configuración
  const canEdit = hasPermission(appointment.status, 'canEdit', userRole);
  const canMarkAttended = hasPermission(appointment.status, 'canMarkAttended', userRole);

  // Calcular datos de pago - Sistema dual de pagos
  // INCLUYE TODAS LAS ÓRDENES DEL PACIENTE, NO SOLO LAS DE ESTA CITA
  const paymentData = (() => {
    // Si no hay datos del paciente aún, usar fallback con datos de la cita actual
    const ordersToProcess = patientData?.orders || [];

    // Identificar qué órdenes están en esta cita
    const currentAppointmentOrderIds = new Set(
      appointment.appointmentServices?.map(svc => svc.orderId) || []
    );

    // Procesar TODAS las órdenes del paciente
    const allOrders = ordersToProcess.map(order => {
      const finalPrice = Number(order.finalPrice || 0);
      const invoice = order.invoice;
      const amountPaid = invoice?.payments?.reduce((sum, p) => sum + Number(p.amountPaid), 0) || 0;
      const status = invoice?.status || 'pending';
      const isPending = status === 'pending' || status === 'partial';
      const isInCurrentAppointment = currentAppointmentOrderIds.has(order.id);

      return {
        orderId: order.id,
        serviceName: order.service?.name || 'Servicio',
        finalPrice,
        amountPaid,
        pendingAmount: finalPrice - amountPaid,
        status,
        isPending,
        isInCurrentAppointment,
        invoiceId: invoice?.id
      };
    });

    // Separar órdenes de esta cita vs otras citas
    const currentAppointmentOrders = allOrders.filter(o => o.isInCurrentAppointment);
    const otherOrders = allOrders.filter(o => !o.isInCurrentAppointment);

    // Calcular totales para esta cita
    const currentTotal = currentAppointmentOrders.reduce((sum, o) => sum + o.finalPrice, 0);
    const currentPaid = currentAppointmentOrders.reduce((sum, o) => sum + o.amountPaid, 0);
    const currentPending = currentTotal - currentPaid;

    // Calcular totales de todas las órdenes del paciente
    const allTotal = allOrders.reduce((sum, o) => sum + o.finalPrice, 0);
    const allPaid = allOrders.reduce((sum, o) => sum + o.amountPaid, 0);
    const allPending = allTotal - allPaid;

    // Calcular totales de otras órdenes (no de esta cita)
    const otherTotal = otherOrders.reduce((sum, o) => sum + o.finalPrice, 0);
    const otherPaid = otherOrders.reduce((sum, o) => sum + o.amountPaid, 0);
    const otherPending = otherTotal - otherPaid;

    // Facturas impagas (estado pending o partial)
    const unpaidInvoices = allOrders.filter(o => o.isPending);
    const unpaidInvoicesCount = unpaidInvoices.length;
    const unpaidInvoicesTotal = unpaidInvoices.reduce((sum, o) => sum + o.pendingAmount, 0);

    const reservationPaid = appointment.reservationAmount ? Number(appointment.reservationAmount) : 0;
    const hasReservation = reservationPaid > 0;

    return {
      // Totales de esta cita
      packagesTotal: currentTotal,
      packagesPaid: currentPaid,
      packagesPending: currentPending,
      packages: currentAppointmentOrders,

      // Totales globales del paciente
      allPackagesTotal: allTotal,
      allPackagesPaid: allPaid,
      allPackagesPending: allPending,

      // Otras órdenes (no de esta cita)
      otherOrdersTotal: otherTotal,
      otherOrdersPaid: otherPaid,
      otherOrdersPending: otherPending,
      otherOrders: otherOrders.filter(o => o.isPending), // Solo mostrar las pendientes

      // Facturas impagas
      unpaidInvoices,
      unpaidInvoicesCount,
      unpaidInvoicesTotal,

      // Reserva
      reservationPaid,
      hasReservation,
    };
  })();

  const hasPendingPayment = paymentData.packagesPending > 0;

  // Obtener urgencia de pago basada en estado
  const paymentUrgency = getPaymentUrgency(
    appointment.status,
    !!appointment.reservationReceiptUrl,
    hasPendingPayment
  );

  // Labels desde configuración
  const statusLabel = stateConfig.label.singular;
  const statusColor = stateConfig.label.color;

  return (
    <div className="appointment-detail-modern">
      {/* Mobile-First Header */}
      <div className="detail-header">
        <button className="btn-back" onClick={handleBack}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Volver
        </button>

        <h1 className="detail-title">Detalle de Cita</h1>

        <div className="detail-actions-mobile">
          {canEdit && (
            <button className="btn-icon btn-primary" onClick={handleEdit} title="Editar">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M14.167 2.5a1.768 1.768 0 012.5 2.5L5.833 15.833l-3.333.834.833-3.334L14.167 2.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM10 6v4M10 14h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {error}
        </div>
      )}

      {uploadSuccess && (
        <div className="alert alert-success">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M16.667 5L7.5 14.167L3.333 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Recibo subido exitosamente
        </div>
      )}

      {/* Status Badge - Prominent */}
      <div className="status-section">
        <div className={`status-badge-large ${statusColor}`}>
          {statusLabel}
        </div>
      </div>

      {/* State Machine Transition Selector - Control Centralizado de Estados */}
      <StateTransitionSelector
        currentStatus={appointment.status}
        appointmentId={appointment.id}
        appointment={appointment}
        onTransition={async (newStatus) => {
          await appointmentsService.updateAppointment(appointment.id, {
            status: newStatus
          });
          await loadAppointment(appointment.id);
        }}
        disabled={false}
      />

      {/* Main Info Card - Glass Morphism */}
      <div className="glass-card">
        <div className="card-header">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="card-icon">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
            <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <h2>Información de la Cita</h2>
        </div>

        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Fecha y Hora</span>
            <span className="info-value">
              {new Date(appointment.scheduledDate).toLocaleDateString('es-PE', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
            <span className="info-time">
              {new Date(appointment.scheduledDate).toLocaleTimeString('es-PE', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>

          <div className="info-item">
            <span className="info-label">Duración</span>
            <span className="info-value">{appointment.durationMinutes} minutos</span>
          </div>

          <div className="info-item">
            <span className="info-label">Paciente</span>
            <span className="info-value clickable" onClick={handleViewPatient}>
              {appointment.patient
                ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
                : '-'}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: '4px' }}>
                <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </div>

          {appointment.notes && (
            <div className="info-item full-width">
              <span className="info-label">Notas</span>
              <span className="info-value">{appointment.notes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Services/Sessions Card */}
      {appointment.appointmentServices && appointment.appointmentServices.length > 0 && (() => {
        // Convertir appointmentServices al formato que espera packageSimulator
        const sessions = appointment.appointmentServices
          .filter(appSvc => appSvc.order?.serviceId) // Filtrar inválidos
          .map(appSvc => ({
            serviceId: appSvc.order.serviceId!,
            orderId: appSvc.orderId,
            sessionNumber: appSvc.sessionNumber || 1,
            appointmentServiceId: appSvc.id,
            tempPackageId: undefined,
            markedForDeletion: false,
          }));

        // Extraer servicios únicos
        const uniqueServices = Array.from(
          new Map(
            appointment.appointmentServices
              .filter(appSvc => appSvc.order?.serviceId && appSvc.order?.service)
              .map(appSvc => [
                appSvc.order.serviceId,
                {
                  id: appSvc.order.serviceId!,
                  name: appSvc.order.service?.name || 'Servicio',
                  basePrice: Number(appSvc.order.service?.basePrice || 0),
                  defaultSessions: appSvc.order.service?.defaultSessions || 1,
                }
              ])
          ).values()
        );

        // Extraer orders únicos
        const uniqueOrders = Array.from(
          new Map(
            appointment.appointmentServices
              .filter(appSvc => appSvc.order?.serviceId)
              .map(appSvc => [
                appSvc.orderId,
                {
                  id: appSvc.orderId,
                  totalSessions: appSvc.order.totalSessions || 1,
                  serviceId: appSvc.order.serviceId!,
                  createdAt: appSvc.order.createdAt || new Date().toISOString(),
                  appointmentServices: appSvc.order.appointmentServices || [],
                  finalPrice: appSvc.order.finalPrice, // Precio final del paquete
                }
              ])
          ).values()
        );

        // Simular grupos de paquetes usando la misma lógica que el formulario
        const packageGroups = packageSimulator.simulatePackages(
          sessions,
          uniqueServices,
          uniqueOrders,
          false // No es modo edición, es solo vista
        );

        return (
          <div className="glass-card">
            <div className="card-header">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="card-icon">
                <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h2>Servicios de esta Cita</h2>
            </div>

            <p className="services-subtitle">
              {appointment.appointmentServices.length} sesión{appointment.appointmentServices.length > 1 ? 'es' : ''} incluida{appointment.appointmentServices.length > 1 ? 's' : ''}
            </p>

            {/* Usar PackageGroupView para mostrar paquetes agrupados */}
            <PackageGroupView
              packageGroups={packageGroups}
              services={uniqueServices}
              onRemoveSession={() => {}} // Vista de detalle, sin acciones
              readOnly={true} // Modo solo lectura: sin botones ni badges de edición
            />

            {/* Total */}
            <div className="services-total">
              <span className="total-label">Total de Servicios</span>
              <span className="total-amount">S/. {paymentData.packagesTotal.toFixed(2)}</span>
            </div>
          </div>
        );
      })()}

      {/* Payment Status Card - DISEÑO MEJORADO CON SEPARACIÓN CLARA */}
      <div className={`glass-card payment-card ${
        paymentUrgency === 'urgent' ? 'payment-card--urgent' :
        paymentUrgency === 'warning' ? 'payment-card--warning' :
        ''
      }`}>
        <div className="card-header">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="card-icon">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="1" y1="10" x2="23" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h2>Estado de Pago</h2>
        </div>

        {/* SECCIÓN 1: PAGO DE PAQUETES */}
        {paymentData.packagesTotal > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '2px solid #3b82f6',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              fontSize: '13px',
              fontWeight: '700',
              color: '#1e40af',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 5h12M2 8h12M2 11h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              PAGO DEL PAQUETE
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <div style={{
                background: 'white',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #bfdbfe'
              }}>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', fontWeight: '600' }}>
                  TOTAL DEL PAQUETE
                </div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e40af' }}>
                  S/. {paymentData.packagesTotal.toFixed(2)}
                </div>
              </div>

              <div style={{
                background: 'white',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #86efac'
              }}>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', fontWeight: '600' }}>
                  PAGADO
                </div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#15803d' }}>
                  S/. {paymentData.packagesPaid.toFixed(2)}
                </div>
              </div>

              <div style={{
                background: 'white',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #fca5a5'
              }}>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', fontWeight: '600' }}>
                  PENDIENTE
                </div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#dc2626' }}>
                  S/. {paymentData.packagesPending.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Barra de progreso */}
            <div style={{
              background: '#e5e7eb',
              height: '8px',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '12px'
            }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(90deg, #10b981, #059669)',
                width: `${paymentData.packagesTotal > 0 ? (paymentData.packagesPaid / paymentData.packagesTotal * 100) : 0}%`,
                transition: 'width 0.3s ease'
              }} />
            </div>

            {hasPendingPayment ? (
              <button className="btn-pay" onClick={handleViewInvoices} style={{
                width: '100%',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="2.5" y="3.333" width="15" height="13.333" rx="1.667" stroke="currentColor" strokeWidth="2"/>
                  <path d="M2.5 7.5h15" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Ver Facturas del Paciente
              </button>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px',
                background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                borderRadius: '8px',
                color: '#065f46',
                fontWeight: '600',
                fontSize: '14px'
              }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M16.667 5L7.5 14.167L3.333 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                ¡Paquete Pagado Completamente!
              </div>
            )}
          </div>
        )}

        {/* SECCIÓN 2: PREVIEW DE FACTURAS IMPAGAS DEL PACIENTE */}
        {paymentData.unpaidInvoicesCount > 0 && paymentData.otherOrders.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)',
            border: '2px solid #f97316',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: '700',
                color: '#c2410c',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2"/>
                </svg>
                OTRAS FACTURAS PENDIENTES
              </div>
              <div style={{
                background: '#ea580c',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '700'
              }}>
                {paymentData.otherOrders.length} {paymentData.otherOrders.length === 1 ? 'factura' : 'facturas'}
              </div>
            </div>

            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '12px',
              border: '1px solid #fed7aa'
            }}>
              <div style={{
                fontSize: '11px',
                color: '#9a3412',
                fontWeight: '600',
                marginBottom: '8px'
              }}>
                Este paciente tiene pagos pendientes de otros servicios/paquetes:
              </div>

              {paymentData.otherOrders.map((order, idx) => (
                <div key={order.orderId} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px',
                  background: idx % 2 === 0 ? '#fff7ed' : 'white',
                  borderRadius: '6px',
                  marginBottom: idx < paymentData.otherOrders.length - 1 ? '6px' : '0'
                }}>
                  <div>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#1f2937',
                      marginBottom: '2px'
                    }}>
                      {order.serviceName}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: '#6b7280'
                    }}>
                      Estado: <span style={{
                        color: order.status === 'pending' ? '#dc2626' : '#f59e0b',
                        fontWeight: '600',
                        textTransform: 'uppercase'
                      }}>
                        {order.status === 'pending' ? 'SIN PAGAR' : 'PAGO PARCIAL'}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '700',
                      color: '#dc2626'
                    }}>
                      S/. {order.pendingAmount.toFixed(2)}
                    </div>
                    <div style={{
                      fontSize: '10px',
                      color: '#6b7280'
                    }}>
                      pendiente
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px',
              background: 'white',
              borderRadius: '8px',
              marginBottom: '12px'
            }}>
              <div style={{
                fontSize: '13px',
                fontWeight: '700',
                color: '#1f2937'
              }}>
                TOTAL PENDIENTE (Otras facturas)
              </div>
              <div style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#dc2626'
              }}>
                S/. {paymentData.otherOrdersPending.toFixed(2)}
              </div>
            </div>

            <button className="btn-view-all-invoices" onClick={handleViewInvoices} style={{
              width: '100%',
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Ver Todas las Facturas del Paciente
            </button>

            <div style={{
              marginTop: '12px',
              padding: '10px',
              background: 'rgba(255, 255, 255, 0.5)',
              borderRadius: '6px',
              fontSize: '11px',
              color: '#9a3412',
              fontStyle: 'italic'
            }}>
              💡 <strong>Nota:</strong> Estas facturas corresponden a otros servicios del paciente. No están incluidas en el pago de esta cita.
            </div>
          </div>
        )}

        {/* SECCIÓN 3: RESERVA DE CITA (INDEPENDIENTE) */}
        <div style={{
          background: paymentData.hasReservation ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
          border: paymentData.hasReservation ? '2px solid #10b981' : '2px dashed #d1d5db',
          borderRadius: '12px',
          padding: '16px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
            fontSize: '13px',
            fontWeight: '700',
            color: paymentData.hasReservation ? '#065f46' : '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="2"/>
              <path d="M2 6h12" stroke="currentColor" strokeWidth="2"/>
            </svg>
            RESERVA DE CITA (Independiente)
          </div>

          {paymentData.hasReservation ? (
            <>
              <div style={{
                background: 'white',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '12px',
                border: '1px solid #86efac'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: '600' }}>
                      Adelanto Pagado
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#15803d' }}>
                      S/. {paymentData.reservationPaid.toFixed(2)}
                    </div>
                  </div>
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <circle cx="16" cy="16" r="14" stroke="#10b981" strokeWidth="2"/>
                    <path d="M10 16l4 4 8-8" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>

              {appointment.reservationReceiptUrl && (
                <div style={{
                  background: 'white',
                  padding: '12px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px',
                  border: '1px solid #d1d5db'
                }}>
                  {(appointment.reservationReceiptUrl.toLowerCase().endsWith('.jpg') ||
                    appointment.reservationReceiptUrl.toLowerCase().endsWith('.jpeg') ||
                    appointment.reservationReceiptUrl.toLowerCase().endsWith('.png')) && (
                    <img
                      src={getReceiptUrl(appointment.reservationReceiptUrl) || ''}
                      alt="Recibo de reserva"
                      style={{
                        width: '60px',
                        height: '60px',
                        objectFit: 'cover',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                      onClick={() => window.open(getReceiptUrl(appointment.reservationReceiptUrl) || '', '_blank')}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                      Comprobante de Reserva
                    </div>
                    <a
                      href={getReceiptUrl(appointment.reservationReceiptUrl) || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '12px',
                        color: '#3b82f6',
                        textDecoration: 'none',
                        fontWeight: '500'
                      }}
                    >
                      📄 Ver recibo completo →
                    </a>
                  </div>
                </div>
              )}

              {appointment.status === 'reserved' && (
                <button onClick={handleUploadReceipt} style={{
                  width: '100%',
                  background: 'white',
                  border: '1px solid #d1d5db',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M14 10v2.667A1.333 1.333 0 0112.667 14H3.333A1.333 1.333 0 012 12.667V10M11.333 5.333L8 2m0 0L4.667 5.333M8 2v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {appointment.reservationReceiptUrl ? 'Reemplazar Recibo' : 'Subir Recibo'}
                </button>
              )}
            </>
          ) : (
            <>
              <div style={{
                textAlign: 'center',
                padding: '24px',
                color: '#9ca3af'
              }}>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ margin: '0 auto 12px' }}>
                  <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/>
                  <path d="M24 16v16M16 24h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
                  No se pagó reserva
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                  La reserva es un adelanto opcional para asegurar la cita
                </div>
              </div>

              {appointment.status === 'reserved' && (
                <button onClick={handleUploadReceipt} style={{
                  width: '100%',
                  background: 'white',
                  border: '2px dashed #d1d5db',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M14 10v2.667A1.333 1.333 0 0112.667 14H3.333A1.333 1.333 0 012 12.667V10M11.333 5.333L8 2m0 0L4.667 5.333M8 2v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Registrar Reserva (Opcional)
                </button>
              )}
            </>
          )}

          {/* Nota explicativa */}
          <div style={{
            marginTop: '12px',
            padding: '10px 12px',
            background: 'rgba(255, 255, 255, 0.7)',
            borderRadius: '6px',
            fontSize: '11px',
            color: '#6b7280',
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-start'
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginTop: '1px', flexShrink: 0 }}>
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M7 6.5V10M7 4.5h.005" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <div>
              <strong>Nota:</strong> La reserva es un adelanto independiente del pago del paquete. No descuenta del total del tratamiento.
            </div>
          </div>
        </div>
      </div>

      {/* Photos Gallery Card */}
      {(() => {
        // Lógica para mostrar/ocultar galería de fotos
        const hasPhotos = appointment.patientRecords?.some((record: any) => {
          const beforePhotos = record.beforePhotoUrls as string[] | null;
          const afterPhotos = record.afterPhotoUrls as string[] | null;
          return (beforePhotos && beforePhotos.length > 0) || (afterPhotos && afterPhotos.length > 0);
        });

        // Ocultar si: NO hay fotos Y estado es 'reserved'
        if (!hasPhotos && appointment.status === 'reserved') {
          return null;
        }

        // Mostrar para estados activos
        if (['attended', 'reserved', 'in_progress'].includes(appointment.status)) {
          return (
        <div className="glass-card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="card-icon">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2"/>
                <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h2>Fotos del Tratamiento</h2>
            </div>

            {/* View Mode Switcher */}
            {appointment.patientRecords?.some((record: any) => {
              const beforePhotos = record.beforePhotoUrls as string[] | null;
              const afterPhotos = record.afterPhotoUrls as string[] | null;
              return (beforePhotos && beforePhotos.length > 0) && (afterPhotos && afterPhotos.length > 0);
            }) && (
              <div className="apt-detail__view-switcher">
                <button
                  className={`apt-detail__view-btn ${photoViewMode === 'list' ? 'apt-detail__view-btn--active' : ''}`}
                  onClick={() => setPhotoViewMode('list')}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: '6px', display: 'inline' }}>
                    <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                    <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                    <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                    <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                  Lista
                </button>
                <button
                  className={`apt-detail__view-btn ${photoViewMode === 'compare' ? 'apt-detail__view-btn--active' : ''}`}
                  onClick={() => setPhotoViewMode('compare')}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: '6px', display: 'inline' }}>
                    <rect x="2" y="2" width="5" height="12" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                    <rect x="9" y="2" width="5" height="12" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                  Comparar
                </button>
              </div>
            )}
          </div>

          {appointment.patientRecords && appointment.patientRecords.length > 0 ? (
            appointment.patientRecords.map((record: any) => {
            const beforePhotos = record.beforePhotoUrls as string[] | null;
            const afterPhotos = record.afterPhotoUrls as string[] | null;
            const hasPhotos = (beforePhotos && beforePhotos.length > 0) || (afterPhotos && afterPhotos.length > 0);

            if (!hasPhotos) return null;

            return (
              <div key={record.id} className="apt-detail__photo-gallery">
                {/* Comparison View */}
                {photoViewMode === 'compare' && beforePhotos && afterPhotos && beforePhotos.length > 0 && afterPhotos.length > 0 ? (
                  <div className="apt-detail__comparison-view">
                    {/* Before Side */}
                    <div className="apt-detail__comparison-side">
                      <h3>
                        <span className="apt-detail__photo-badge apt-detail__photo-badge--before" style={{ marginRight: '8px' }}>
                          ANTES
                        </span>
                        {beforePhotos.length} foto{beforePhotos.length > 1 ? 's' : ''}
                      </h3>
                      <div className="apt-detail__photo-grid">
                        {beforePhotos.map((url, index) => (
                          <div
                            key={index}
                            className="apt-detail__photo-card"
                            onClick={() => window.open(getReceiptUrl(url) || '', '_blank')}
                          >
                            <img
                              src={getReceiptUrl(url) || ''}
                              alt={`Antes ${index + 1}`}
                              className="apt-detail__photo-img"
                            />
                            <div className="apt-detail__photo-overlay">
                              Foto {index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* After Side */}
                    <div className="apt-detail__comparison-side">
                      <h3>
                        <span className="apt-detail__photo-badge apt-detail__photo-badge--after" style={{ marginRight: '8px' }}>
                          DESPUÉS
                        </span>
                        {afterPhotos.length} foto{afterPhotos.length > 1 ? 's' : ''}
                      </h3>
                      <div className="apt-detail__photo-grid">
                        {afterPhotos.map((url, index) => (
                          <div
                            key={index}
                            className="apt-detail__photo-card"
                            onClick={() => window.open(getReceiptUrl(url) || '', '_blank')}
                          >
                            <img
                              src={getReceiptUrl(url) || ''}
                              alt={`Después ${index + 1}`}
                              className="apt-detail__photo-img"
                            />
                            <div className="apt-detail__photo-overlay">
                              Foto {index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* List View - Before Photos */}
                    {beforePhotos && beforePhotos.length > 0 && (
                  <div className="apt-detail__photo-section">
                    <div className="apt-detail__photo-header">
                      <span className="apt-detail__photo-badge apt-detail__photo-badge--before">
                        ANTES
                      </span>
                      <span className="apt-detail__photo-count">
                        {beforePhotos.length} foto{beforePhotos.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="apt-detail__photo-grid">
                      {beforePhotos.map((url, index) => (
                        <div
                          key={index}
                          className="apt-detail__photo-card"
                          onClick={() => window.open(getReceiptUrl(url) || '', '_blank')}
                        >
                          <img
                            src={getReceiptUrl(url) || ''}
                            alt={`Antes ${index + 1}`}
                            className="apt-detail__photo-img"
                          />
                          <div className="apt-detail__photo-overlay">
                            Foto {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* After Photos */}
                {afterPhotos && afterPhotos.length > 0 && (
                  <div className="apt-detail__photo-section">
                    <div className="apt-detail__photo-header">
                      <span className="apt-detail__photo-badge apt-detail__photo-badge--after">
                        DESPUÉS
                      </span>
                      <span className="apt-detail__photo-count">
                        {afterPhotos.length} foto{afterPhotos.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="apt-detail__photo-grid">
                      {afterPhotos.map((url, index) => (
                        <div
                          key={index}
                          className="apt-detail__photo-card"
                          onClick={() => window.open(getReceiptUrl(url) || '', '_blank')}
                        >
                          <img
                            src={getReceiptUrl(url) || ''}
                            alt={`Después ${index + 1}`}
                            className="apt-detail__photo-img"
                          />
                          <div className="apt-detail__photo-overlay">
                            Foto {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                  </>
                )}
              </div>
            );
          })
          ) : (
            <div className="apt-detail__photo-empty">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="apt-detail__photo-empty-icon">
                <rect x="8" y="8" width="48" height="48" rx="4" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/>
                <circle cx="20" cy="20" r="3" stroke="currentColor" strokeWidth="2"/>
                <path d="M56 40L40 24L8 56" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p className="apt-detail__photo-empty-title">
                No hay fotos del tratamiento
              </p>
              <p className="apt-detail__photo-empty-text">
                Usa los botones de abajo para agregar fotos de antes y después
              </p>
            </div>
          )}

          {/* Upload Buttons */}
          {canMarkAttended && (
            <div className="apt-detail__upload-buttons">
              <button
                className="apt-detail__upload-btn"
                onClick={() => {
                  setPhotoUploadType('before');
                  setShowPhotoUploadModal(true);
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M17.5 12.5v3.333a1.667 1.667 0 01-1.667 1.667H4.167A1.667 1.667 0 012.5 15.833V12.5M14.167 6.667L10 2.5m0 0L5.833 6.667M10 2.5v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Agregar Fotos de Antes
              </button>
              <button
                className="apt-detail__upload-btn apt-detail__upload-btn--after"
                onClick={() => {
                  setPhotoUploadType('after');
                  setShowPhotoUploadModal(true);
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M17.5 12.5v3.333a1.667 1.667 0 01-1.667 1.667H4.167A1.667 1.667 0 012.5 15.833V12.5M14.167 6.667L10 2.5m0 0L5.833 6.667M10 2.5v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Agregar Fotos de Después
              </button>
            </div>
          )}
        </div>
          );
        }

        return null;
      })()}

      {/* Body Measurements Card */}
      {['attended', 'reserved', 'in_progress'].includes(appointment.status) && (() => {
        const patientRecord = appointment.patientRecords?.[0];
        const hasData = patientRecord && (
          patientRecord.weight ||
          (patientRecord.bodyMeasurement && Object.keys(patientRecord.bodyMeasurement).length > 0) ||
          patientRecord.healthNotes
        );

        return (
          <div className="glass-card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="card-icon">
                  <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h2>Medidas Corporales y Seguimiento</h2>
              </div>
            </div>

            {hasData ? (
              <div>
                {/* Peso, Altura e IMC */}
                {(patientRecord.weight || patientRecord.bodyMeasurement?.height) && (() => {
                  const weight = patientRecord.weight;
                  const height = patientRecord.bodyMeasurement?.height;

                  // Calcular IMC si hay peso y altura
                  let bmi: number | null = null;
                  let bmiCategory: { label: string; color: string; bg: string } | null = null;

                  if (weight && height) {
                    const heightInMeters = height / 100;
                    bmi = weight / (heightInMeters * heightInMeters);

                    if (bmi < 18.5) {
                      bmiCategory = { label: 'Bajo peso', color: '#3b82f6', bg: '#eff6ff' };
                    } else if (bmi < 25) {
                      bmiCategory = { label: 'Peso normal', color: '#10b981', bg: '#f0fdf4' };
                    } else if (bmi < 30) {
                      bmiCategory = { label: 'Sobrepeso', color: '#f59e0b', bg: '#fef3c7' };
                    } else {
                      bmiCategory = { label: 'Obesidad', color: '#ef4444', bg: '#fee2e2' };
                    }
                  }

                  return (
                    <>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: weight && height ? '1fr 1fr 1fr' : (weight || height ? '1fr' : ''),
                        gap: '16px',
                        marginBottom: '16px'
                      }}>
                        {weight && (
                          <div style={{
                            background: '#f0fdf4',
                            border: '2px solid #10b981',
                            borderRadius: '12px',
                            padding: '16px'
                          }}>
                            <div style={{
                              fontSize: '13px',
                              fontWeight: '700',
                              color: '#065f46',
                              marginBottom: '8px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}>
                              Peso
                            </div>
                            <div style={{ fontSize: '32px', fontWeight: '700', color: '#047857' }}>
                              {weight} kg
                            </div>
                          </div>
                        )}

                        {height && (
                          <div style={{
                            background: '#fef3c7',
                            border: '2px solid #f59e0b',
                            borderRadius: '12px',
                            padding: '16px'
                          }}>
                            <div style={{
                              fontSize: '13px',
                              fontWeight: '700',
                              color: '#92400e',
                              marginBottom: '8px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}>
                              Altura
                            </div>
                            <div style={{ fontSize: '32px', fontWeight: '700', color: '#b45309' }}>
                              {height} cm
                            </div>
                          </div>
                        )}

                        {bmi && bmiCategory && (
                          <div style={{
                            background: bmiCategory.bg,
                            border: `2px solid ${bmiCategory.color}`,
                            borderRadius: '12px',
                            padding: '16px'
                          }}>
                            <div style={{
                              fontSize: '13px',
                              fontWeight: '700',
                              color: bmiCategory.color,
                              marginBottom: '8px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}>
                              IMC
                            </div>
                            <div style={{
                              fontSize: '32px',
                              fontWeight: '700',
                              color: bmiCategory.color,
                              marginBottom: '4px'
                            }}>
                              {bmi.toFixed(1)}
                            </div>
                            <div style={{
                              fontSize: '11px',
                              fontWeight: '600',
                              color: bmiCategory.color,
                              opacity: 0.8
                            }}>
                              {bmiCategory.label}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}

                {/* Medidas Corporales */}
                {patientRecord.bodyMeasurement && Object.keys(patientRecord.bodyMeasurement).length > 0 && (
                  <div style={{
                    background: '#eff6ff',
                    border: '2px solid #3b82f6',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      color: '#1e40af',
                      marginBottom: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Medidas del Cuerpo
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                      gap: '12px'
                    }}>
                      {Object.entries(patientRecord.bodyMeasurement).map(([key, value]) => {
                        // Excluir altura ya que se muestra arriba
                        if (key === 'height') return null;

                        const labels: Record<string, string> = {
                          waist: 'Cintura',
                          chest: 'Pecho',
                          hips: 'Cadera',
                          leftArm: 'Brazo Izq.',
                          rightArm: 'Brazo Der.',
                          leftThigh: 'Muslo Izq.',
                          rightThigh: 'Muslo Der.',
                          leftCalf: 'Pantorrilla Izq.',
                          rightCalf: 'Pantorrilla Der.',
                          abdomen: 'Abdomen (grosor)',
                          triceps: 'Tríceps (grosor)',
                          subscapular: 'Subescapular (grosor)',
                          suprailiac: 'Suprailiaco (grosor)',
                          thigh: 'Muslo (grosor)',
                        };

                        const isThickness = ['abdomen', 'triceps', 'subscapular', 'suprailiac', 'thigh'].includes(key);
                        const unit = isThickness ? 'mm' : 'cm';

                        return (
                          <div key={key} style={{
                            background: 'white',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid #bfdbfe'
                          }}>
                            <div style={{
                              fontSize: '11px',
                              color: '#6b7280',
                              marginBottom: '4px',
                              fontWeight: '600'
                            }}>
                              {labels[key] || key}
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e40af' }}>
                              {value} {unit}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Notas de Salud */}
                {patientRecord.healthNotes && (
                  <div style={{
                    background: '#fef3c7',
                    border: '2px solid #f59e0b',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      color: '#92400e',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Notas de Salud
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: '#78350f',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {patientRecord.healthNotes}
                    </div>
                  </div>
                )}

                {canMarkAttended && (
                  <button
                    onClick={() => setShowBodyMeasurementsModal(true)}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '12px 20px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Actualizar Medidas
                  </button>
                )}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#9ca3af'
              }}>
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ margin: '0 auto 16px' }}>
                  <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/>
                  <path d="M32 20v24M20 32h24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
                  No hay medidas registradas
                </div>
                <div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '20px' }}>
                  Registra el peso, medidas corporales y grosor de piel/grasa para llevar un seguimiento del tratamiento
                </div>
                {canMarkAttended && (
                  <button
                    onClick={() => setShowBodyMeasurementsModal(true)}
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 5v10M5 10h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Registrar Medidas
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Appointment Notes Card */}
      <div className="glass-card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="card-icon">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h2>Notas de Atención</h2>
          </div>
        </div>

        {/* Add Note Form */}
        <div style={{ marginBottom: '20px' }}>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Agregar una nota sobre esta cita (reacciones, alergias, observaciones, etc.)"
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '12px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical',
              marginBottom: '12px'
            }}
            disabled={isSubmittingNote}
          />
          <Button
            onClick={handleAddNote}
            disabled={!newNote.trim() || isSubmittingNote}
            variant="primary"
            size="medium"
          >
            {isSubmittingNote ? 'Agregando...' : 'Agregar Nota'}
          </Button>
        </div>

        {/* Notes List */}
        {appointment.appointmentNotes && appointment.appointmentNotes.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {appointment.appointmentNotes.map((note) => (
              <div
                key={note.id}
                style={{
                  padding: '16px',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  borderLeft: '4px solid #3b82f6'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '8px'
                }}>
                  <div>
                    <span style={{ fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
                      {note.createdBy?.firstName} {note.createdBy?.lastName}
                    </span>
                    <span style={{ color: '#7f8c8d', fontSize: '12px', marginLeft: '8px' }}>
                      {note.createdBy?.role === 'admin' ? 'Admin' : note.createdBy?.role === 'nurse' ? 'Enfermera' : 'Ventas'}
                    </span>
                  </div>
                  <span style={{ color: '#7f8c8d', fontSize: '12px' }}>
                    {new Date(note.createdAt).toLocaleString('es-PE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <p style={{ margin: 0, color: '#2c3e50', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  {note.note}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#7f8c8d', textAlign: 'center', margin: 0 }}>
            No hay notas para esta cita. Agrega la primera nota arriba.
          </p>
        )}
      </div>

      {/* System Info Card */}
      <div className="glass-card system-card">
        <div
          className="card-header card-header--collapsible"
          onClick={() => setSystemInfoExpanded(!systemInfoExpanded)}
          style={{ cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="card-icon">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <h2>Información del Sistema</h2>
          </div>
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            style={{
              transition: 'transform 0.2s ease',
              transform: systemInfoExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
            }}
          >
            <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {systemInfoExpanded && (
        <div className="system-info">
          <div className="system-item">
            <span className="system-label">Creado por</span>
            <span className="system-value">
              {appointment.createdBy
                ? `${appointment.createdBy.firstName} ${appointment.createdBy.lastName}`
                : '-'}
            </span>
          </div>
          <div className="system-item">
            <span className="system-label">Fecha de Creación</span>
            <span className="system-value">
              {new Date(appointment.createdAt).toLocaleString('es-PE')}
            </span>
          </div>
          {appointment.attendedBy && (
            <div className="system-item">
              <span className="system-label">Atendido por</span>
              <span className="system-value">
                {`${appointment.attendedBy.firstName} ${appointment.attendedBy.lastName}`}
              </span>
            </div>
          )}
          {appointment.attendedAt && (
            <div className="system-item">
              <span className="system-label">Fecha de Atención</span>
              <span className="system-value">
                {new Date(appointment.attendedAt).toLocaleString('es-PE')}
              </span>
            </div>
          )}
          <div className="system-item full">
            <span className="system-label">ID del Sistema</span>
            <code className="system-id">{appointment.id}</code>
          </div>
        </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button className="action-btn primary" onClick={handleViewPatient}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M16.667 17.5v-1.667a3.333 3.333 0 00-3.334-3.333H6.667a3.333 3.333 0 00-3.334 3.333V17.5M10 9.167A3.333 3.333 0 1010 2.5a3.333 3.333 0 000 6.667z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Ver Paciente
        </button>
        <button className="action-btn success" onClick={() => addToGoogleCalendar(appointment)}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="3.333" y="3.333" width="13.333" height="13.333" rx="1.667" stroke="currentColor" strokeWidth="2"/>
            <path d="M3.333 8.333h13.334M13.333 1.667v3.333M6.667 1.667v3.333" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Google Calendar
        </button>
        <button className="action-btn secondary" onClick={() => downloadICSFile(appointment)}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M17.5 12.5v3.333a1.667 1.667 0 01-1.667 1.667H4.167A1.667 1.667 0 012.5 15.833V12.5M5.833 8.333L10 12.5m0 0l4.167-4.167M10 12.5v-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Descargar .ics
        </button>
      </div>

      {/* Attend Modal */}
      {appointment && (
        <AttendAppointmentModal
          isOpen={showAttendModal}
          onClose={() => setShowAttendModal(false)}
          appointment={appointment}
          onSuccess={(updatedAppointment) => {
            setAppointment(updatedAppointment);
            setShowAttendModal(false);
          }}
        />
      )}

      {/* Upload Reservation Modal */}
      <UploadReservationModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSubmit={handleUploadSubmit}
        maxAmount={paymentData.packagesTotal}
      />

      {/* Upload Photos Modal */}
      {appointment && (
        <UploadPhotosModal
          isOpen={showPhotoUploadModal}
          onClose={() => setShowPhotoUploadModal(false)}
          onSubmit={handlePhotoUpload}
          type={photoUploadType}
          appointmentId={appointment.id}
        />
      )}

      {/* Body Measurements Modal */}
      {appointment && (() => {
        // Obtener la última medición del paciente de citas anteriores
        const currentRecord = appointment.patientRecords?.[0];

        // Buscar última medición en el historial del paciente (excluir la cita actual)
        let lastMeasurement: { weight?: number | null; height?: number | null } | undefined;

        if (patientData?.appointments) {
          // Ordenar citas por fecha descendente, excluir la cita actual
          const previousAppointments = patientData.appointments
            .filter(apt => apt.id !== appointment.id && apt.patientRecords && apt.patientRecords.length > 0)
            .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());

          // Buscar la primera cita con datos de peso o altura
          for (const apt of previousAppointments) {
            const record = apt.patientRecords?.[0];
            if (record && (record.weight || record.bodyMeasurement?.height)) {
              lastMeasurement = {
                weight: record.weight || null,
                height: record.bodyMeasurement?.height || null,
              };
              break;
            }
          }
        }

        return (
          <BodyMeasurementsModal
            isOpen={showBodyMeasurementsModal}
            onClose={() => setShowBodyMeasurementsModal(false)}
            onSubmit={handleSaveBodyMeasurements}
            initialData={{
              weight: currentRecord?.weight || null,
              bodyMeasurement: currentRecord?.bodyMeasurement,
              healthNotes: currentRecord?.healthNotes,
            }}
            lastMeasurement={lastMeasurement}
          />
        );
      })()}
    </div>
  );
};

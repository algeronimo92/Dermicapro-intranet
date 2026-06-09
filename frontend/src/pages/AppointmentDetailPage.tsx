import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { appointmentsService } from '../services/appointments.service';
import { patientsService } from '../services/patients.service';
import { usersService } from '../services/users.service';
import { Appointment, Patient, Role, User } from '../types';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';
import { AttendAppointmentModal } from '../components/AttendAppointmentModal';
import { UploadReservationModal } from '../components/UploadReservationModal';
import { UploadPhotosModal } from '../components/UploadPhotosModal';
import { BodyMeasurementsModal } from '../components/BodyMeasurementsModal';
import { StateTransitionSelector } from '../components/StateTransitionSelector';
import { PackageGroupView } from '../components/PackageGroupView';
import { ImageViewer } from '../components/ImageViewer';
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

const getReceiptUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return path; // relative path — proxied by Vite (dev) or nginx (prod)
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
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Attendees state
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [showAttendeeSelector, setShowAttendeeSelector] = useState(false);
  const [attendeeSearchQuery, setAttendeeSearchQuery] = useState('');
  const [isAddingAttendee, setIsAddingAttendee] = useState(false);
  const [removingAttendeeId, setRemovingAttendeeId] = useState<string | null>(null);
  const [attendeeRequiredError, setAttendeeRequiredError] = useState(false);

  const errorBannerRef = useRef<HTMLDivElement>(null);
  const attendeeErrorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (error && errorBannerRef.current) {
      errorBannerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  const openViewer = (images: string[], index = 0) => {
    setViewerImages(images);
    setViewerIndex(index);
  };
  const closeViewer = () => setViewerImages([]);

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
      if (appointment.status === 'attended') {
        setAttendeeRequiredError(false);
      }
    }
  }, [appointment?.status]);

  // Fetch patient data with all orders when appointment loads
  useEffect(() => {
    if (appointment?.patientId) {
      loadPatientData(appointment.patientId);
    }
  }, [appointment?.patientId]);

  // Load staff users once for attendee picker
  useEffect(() => {
    usersService.getAllUsers({ isActive: true }).then(setStaffUsers).catch(() => {});
  }, []);

  const loadAppointment = async (appointmentId: string, silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      setError(null);
      const data = await appointmentsService.getAppointment(appointmentId);
      setAppointment(data);
    } catch (err: any) {
      if (!silent) setError(err.response?.data?.message || 'Error al cargar cita');
    } finally {
      if (!silent) setIsLoading(false);
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

  const handleAddAttendee = async (userId: string) => {
    if (!appointment) return;
    setIsAddingAttendee(true);
    try {
      const updated = await appointmentsService.addAttendee(appointment.id, userId);
      setAppointment(updated);
      setShowAttendeeSelector(false);
      setAttendeeSearchQuery('');
      setAttendeeRequiredError(false);
    } catch (err: any) {
      console.error('Error adding attendee:', err);
    } finally {
      setIsAddingAttendee(false);
    }
  };

  const handleRemoveAttendee = async (userId: string) => {
    if (!appointment) return;
    setRemovingAttendeeId(userId);
    try {
      const updated = await appointmentsService.removeAttendee(appointment.id, userId);
      setAppointment(updated);
    } catch (err: any) {
      console.error('Error removing attendee:', err);
    } finally {
      setRemovingAttendeeId(null);
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

  const handleViewPaymentOrders = () => {
    if (appointment?.patientId) {
      // TODO: Navigate to patient payment orders page
      navigate(`/patients/${appointment.patientId}/payment-orders`);
    }
  };

  const handlePhotoUpload = async (files: File[]) => {
    if (!id) return;

    try {
      setError(null);
      const { urls } = await appointmentsService.uploadTreatmentPhotos(files);
      await appointmentsService.addPhotosToAppointment(id, { photoUrls: urls, type: photoUploadType });
      await loadAppointment(id, true);

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

      const createdNote = await appointmentsService.createAppointmentNote(id, newNote.trim());

      // Actualizar notas en estado local sin recargar la página (evita scroll to top)
      setAppointment(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          appointmentNotes: [createdNote, ...(prev.appointmentNotes || [])],
        };
      });

      setNewNote('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al agregar nota');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleRemovePhoto = async (photoUrl: string, type: 'before' | 'after') => {
    if (!id) return;
    try {
      setError(null);
      const updated = await appointmentsService.removePhotoFromAppointment(id, { type, photoUrl });
      setAppointment(updated);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al eliminar la foto');
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

      await loadAppointment(id, true);

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
  const canEditAttendees = hasPermission(appointment.status, 'canManageAttendees', userRole);

  // Calcular datos de pago - Sistema dual de pagos
  // INCLUYE TODAS LAS ÓRDENES DEL PACIENTE, NO SOLO LAS DE ESTA CITA
  const paymentData = (() => {
    // Si no hay datos del paciente aún, usar fallback con datos de la cita actual
    const ordersToProcess = patientData?.orders || [];

    // Identificar qué órdenes están en esta cita
    const currentAppointmentOrderIds = new Set(
      appointment.appointmentServices?.map(svc => svc.serviceInstanceId) || []
    );

    // Procesar TODAS las órdenes del paciente
    const allOrders = ordersToProcess.map(order => {
      const finalPrice = Number(order.finalPrice || 0);
      const paymentOrder = order.paymentOrder;
      const amountPaid = paymentOrder?.payments?.reduce((sum, p) => sum + Number(p.amountPaid), 0) || 0;
      const status = paymentOrder?.status || 'pending';
      const isPending = status === 'pending' || status === 'partial';
      const isInCurrentAppointment = currentAppointmentOrderIds.has(order.id); // order.id is the ServiceInstance ID

      return {
        serviceInstanceId: order.id,
        serviceName: order.service?.name || 'Servicio',
        finalPrice,
        amountPaid,
        pendingAmount: finalPrice - amountPaid,
        status,
        isPending,
        isInCurrentAppointment,
        paymentOrderId: paymentOrder?.id
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

    // Órdenes de pago sin pagar (estado pending o partial)
    const unpaidPaymentOrders = allOrders.filter(o => o.isPending);
    const unpaidPaymentOrdersCount = unpaidPaymentOrders.length;
    const unpaidPaymentOrdersTotal = unpaidPaymentOrders.reduce((sum, o) => sum + o.pendingAmount, 0);

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

      // Órdenes de pago sin pagar
      unpaidPaymentOrders,
      unpaidPaymentOrdersCount,
      unpaidPaymentOrdersTotal,

      // Reserva
      reservationPaid,
      hasReservation,
    };
  })();

  const hasPendingPayment = paymentData.packagesPending > 0;

  const beforeCount = appointment.patientRecords?.reduce(
    (sum, r) => sum + (((r.beforePhotoUrls as string[] | null)?.length) || 0), 0
  ) ?? 0;
  const afterCount = appointment.patientRecords?.reduce(
    (sum, r) => sum + (((r.afterPhotoUrls as string[] | null)?.length) || 0), 0
  ) ?? 0;

  // Obtener urgencia de pago basada en estado
  const paymentUrgency = getPaymentUrgency(
    appointment.status,
    !!appointment.reservationReceiptUrl,
    hasPendingPayment
  );

  // Labels desde configuración
  const statusLabel = stateConfig.label.singular;
  const statusColor = stateConfig.label.color;

  const hasFixedBar = !['attended', 'cancelled', 'no_show'].includes(appointment.status);

  return (
    <div className="appointment-detail-modern" style={hasFixedBar ? { paddingBottom: '160px' } : undefined}>
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
          {canEdit ? (
            <button className="btn-icon btn-primary" onClick={handleEdit} title="Editar cita">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M14.167 2.5a1.768 1.768 0 012.5 2.5L5.833 15.833l-3.333.834.833-3.334L14.167 2.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : stateConfig.visibility.showActionButtons.edit ? (
            /* Estado final — usuario no es admin */
            <div title="Solo los administradores pueden editar citas en estado final" style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 'var(--radius-lg)',
              background: 'var(--color-bg-secondary)',
              border: '1.5px solid var(--color-border-secondary)',
              color: 'var(--color-text-disabled)',
              cursor: 'not-allowed', opacity: 0.6,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          ) : null}
        </div>
      </div>

      {error && (
        <div ref={errorBannerRef} className="alert alert-error">
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
          Guardado correctamente
        </div>
      )}

      {/* Patient Strip — foto o iniciales + nombre */}
      {appointment.patient && (
        <div className="adet-patient-strip" onClick={handleViewPatient} role="button" tabIndex={0}>
          <div className="adet-patient-avatar">
            {appointment.patient.photoUrl
              ? <img src={appointment.patient.photoUrl} alt={`${appointment.patient.firstName} ${appointment.patient.lastName}`} />
              : `${appointment.patient.firstName.charAt(0)}${appointment.patient.lastName.charAt(0)}`.toUpperCase()}
          </div>
          <div className="adet-patient-info">
            <p className="adet-patient-name">
              {appointment.patient.firstName} {appointment.patient.lastName}
            </p>
            <span className="adet-patient-meta">
              {appointment.patient.dni ? `DNI ${appointment.patient.dni}` : 'Ver ficha del paciente'}
            </span>
          </div>
          <svg className="adet-patient-chevron" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M7 5l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}

      {/* Status Badge - Prominent */}
      <div className="status-section">
        <div className={`status-badge-large ${statusColor}`}>
          {statusLabel}
        </div>
      </div>

      {/* Attendees Card — visible en todos los estados excepto cancelled/no_show */}
      {!['cancelled', 'no_show'].includes(appointment.status) && (
        <div className="glass-card">
          <div className="card-header">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="card-icon">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h2>Profesionales que Atendieron</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {attendeeRequiredError && (
              <p ref={attendeeErrorRef} style={{ color: 'var(--error-color, #f87171)', fontSize: '13px', margin: 0, fontWeight: 500 }}>
                Debe agregar al menos un profesional antes de marcar la cita como atendida.
              </p>
            )}
            {(!appointment.attendees || appointment.attendees.length === 0) && !attendeeRequiredError && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
                Ningún profesional registrado aún.
              </p>
            )}

            {appointment.attendees?.map((att) => (
              <div
                key={att.userId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-secondary, rgba(255,255,255,0.05))',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {att.user?.photoUrl ? (
                    <img
                      src={att.user.photoUrl}
                      alt=""
                      style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--primary-color, #6366f1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: '13px', fontWeight: 600,
                    }}>
                      {att.user?.firstName?.[0]}{att.user?.lastName?.[0]}
                    </div>
                  )}
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>
                    {att.user?.firstName} {att.user?.lastName}
                  </span>
                </div>
                {canEditAttendees && (
                  <button
                    onClick={() => handleRemoveAttendee(att.userId)}
                    disabled={removingAttendeeId === att.userId}
                    title="Quitar"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-secondary)', padding: '4px', borderRadius: '4px',
                      opacity: removingAttendeeId === att.userId ? 0.5 : 1,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
              </div>
            ))}

            {/* Picker de usuario — solo si se puede editar */}
            {canEditAttendees && showAttendeeSelector ? (
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Buscar profesional..."
                  value={attendeeSearchQuery}
                  onChange={(e) => setAttendeeSearchQuery(e.target.value)}
                  autoFocus
                  style={{
                    padding: '8px 12px', borderRadius: '8px', fontSize: '14px',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.15))',
                    background: 'var(--bg-input, rgba(255,255,255,0.08))',
                    color: 'inherit', outline: 'none',
                  }}
                />
                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {staffUsers
                    .filter((u) => {
                      const alreadyAdded = appointment.attendees?.some((a) => a.userId === u.id);
                      const matchesSearch = `${u.firstName} ${u.lastName}`.toLowerCase().includes(attendeeSearchQuery.toLowerCase());
                      return !alreadyAdded && matchesSearch;
                    })
                    .map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleAddAttendee(u.id)}
                        disabled={isAddingAttendee}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '8px 10px', borderRadius: '6px',
                          border: 'none', background: 'var(--bg-secondary, rgba(255,255,255,0.05))',
                          cursor: 'pointer', color: 'inherit', textAlign: 'left',
                          opacity: isAddingAttendee ? 0.5 : 1,
                        }}
                      >
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: 'var(--primary-color, #6366f1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: '11px', fontWeight: 600, flexShrink: 0,
                        }}>
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <span style={{ fontSize: '14px' }}>{u.firstName} {u.lastName}</span>
                      </button>
                    ))}
                </div>
                <button
                  onClick={() => { setShowAttendeeSelector(false); setAttendeeSearchQuery(''); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-secondary)', fontSize: '13px', padding: '4px',
                  }}
                >
                  Cancelar
                </button>
              </div>
            ) : canEditAttendees ? (
              <button
                onClick={() => setShowAttendeeSelector(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 12px', borderRadius: '8px', marginTop: '4px',
                  border: `1px dashed ${attendeeRequiredError ? 'var(--error-color, #f87171)' : 'var(--border-color, rgba(255,255,255,0.2))'}`,
                  background: 'none', cursor: 'pointer',
                  color: attendeeRequiredError ? 'var(--error-color, #f87171)' : 'var(--text-secondary)',
                  fontSize: '14px',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Agregar profesional
              </button>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0, fontStyle: 'italic' }}>
                Solo administradores pueden modificar los asistentes de una cita atendida.
              </p>
            )}
          </div>
        </div>
      )}

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

        </div>
      </div>

      {/* Services/Sessions Card */}
      {appointment.appointmentServices && appointment.appointmentServices.length > 0 && (() => {
        // Convertir appointmentServices al formato que espera packageSimulator
        const sessions = appointment.appointmentServices
          .filter(appSvc => appSvc.serviceInstance?.serviceTemplateId) // Filtrar inválidos
          .map(appSvc => ({
            serviceId: appSvc.serviceInstance.serviceTemplateId!,
            orderId: appSvc.serviceInstanceId,
            sessionNumber: appSvc.sessionNumber || 1,
            appointmentServiceId: appSvc.id,
            tempPackageId: undefined,
            markedForDeletion: false,
          }));

        // Extraer servicios únicos
        const uniqueServices = Array.from(
          new Map(
            appointment.appointmentServices
              .filter(appSvc => appSvc.serviceInstance?.serviceTemplateId && appSvc.serviceInstance?.service)
              .map(appSvc => [
                appSvc.serviceInstance.serviceTemplateId,
                {
                  id: appSvc.serviceInstance.serviceTemplateId!,
                  name: appSvc.serviceInstance.service?.name || 'Servicio',
                  basePrice: Number(appSvc.serviceInstance.service?.basePrice || 0),
                  defaultSessions: appSvc.serviceInstance.service?.defaultSessions || 1,
                }
              ])
          ).values()
        );

        // Extraer orders únicos
        const uniqueOrders = Array.from(
          new Map(
            appointment.appointmentServices
              .filter(appSvc => appSvc.serviceInstance?.serviceTemplateId)
              .map(appSvc => [
                appSvc.serviceInstanceId,
                {
                  id: appSvc.serviceInstanceId,
                  totalSessions: appSvc.serviceInstance.totalSessions || 1,
                  serviceId: appSvc.serviceInstance.serviceTemplateId!,
                  createdAt: appSvc.serviceInstance.createdAt || new Date().toISOString(),
                  appointmentServices: appSvc.serviceInstance.appointmentServices || [],
                  finalPrice: appSvc.serviceInstance.finalPrice, // Precio final del paquete
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

        // Enriquecer con datos reales de orden de pago desde paymentData (que sí los tiene)
        const enrichedGroups = packageGroups.map(pg => {
          if (!pg.orderId) return pg;
          const pdata = paymentData.packages.find(p => p.serviceInstanceId === pg.orderId);
          return {
            ...pg,
            hasPaymentOrder:    !!pdata?.paymentOrderId,
            isPaymentOrderPaid: pdata?.status === 'paid',
          };
        });

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

            {/* Usar PackageGroupView con estado de orden de pago correcto */}
            <PackageGroupView
              packageGroups={enrichedGroups}
              services={uniqueServices}
              onRemoveSession={() => {}}
              readOnly={true}
            />

            {/* Total: mostrar estado real según si está pagado o pendiente */}
            <div className="services-total">
              <span className="total-label">Total de Servicios</span>
              {paymentData.packagesPending <= 0 && paymentData.packagesTotal > 0 ? (
                <span style={{ fontWeight: 700, color: 'var(--color-success-dark)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.8"/>
                    <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Pagado
                </span>
              ) : (
                <span className="total-amount">S/. {paymentData.packagesPending.toFixed(2)} pendiente</span>
              )}
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

        {/* SECCIÓN 1: PAGO DEL PAQUETE */}
        {paymentData.packagesTotal > 0 && (
          <div className="adet-pay-pkg">
            <div className="adet-pay-pkg__title">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 5h12M2 8h12M2 11h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Pago del Paquete
            </div>

            <div className="adet-pay-pkg__stats">
              <div className="adet-pay-stat adet-pay-stat--total">
                <div className="adet-pay-stat__label">Total</div>
                <div className="adet-pay-stat__amount">S/. {paymentData.packagesTotal.toFixed(2)}</div>
              </div>
              <div className="adet-pay-stat adet-pay-stat--paid">
                <div className="adet-pay-stat__label">Pagado</div>
                <div className="adet-pay-stat__amount">S/. {paymentData.packagesPaid.toFixed(2)}</div>
              </div>
              <div className="adet-pay-stat adet-pay-stat--pending">
                <div className="adet-pay-stat__label">Pendiente</div>
                <div className="adet-pay-stat__amount">S/. {paymentData.packagesPending.toFixed(2)}</div>
              </div>
            </div>

            <div className="adet-pay-progress">
              <div className="adet-pay-progress__fill" style={{
                width: `${paymentData.packagesTotal > 0 ? (paymentData.packagesPaid / paymentData.packagesTotal * 100) : 0}%`
              }} />
            </div>

            {hasPendingPayment ? (
              <button className="adet-pay-cta" onClick={handleViewPaymentOrders}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect x="2" y="3" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="2"/>
                  <path d="M2 7h14" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Ver Órdenes de Pago del Paciente
              </button>
            ) : (
              <div className="adet-pay-done">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M15 4.5L7 12.5L3 8.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Paquete Pagado Completamente
              </div>
            )}
          </div>
        )}

        {/* SECCIÓN 2: OTRAS ÓRDENES DE PAGO PENDIENTES */}
        {paymentData.unpaidPaymentOrdersCount > 0 && paymentData.otherOrders.length > 0 && (
          <div className="adet-other-payment-orders">
            <div className="adet-other-payment-orders__header">
              <div className="adet-other-payment-orders__title">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2"/>
                  <path d="M8 4v4M8 11h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Otras Órdenes de Pago Pendientes
              </div>
              <span className="adet-other-payment-orders__count">
                {paymentData.otherOrders.length} {paymentData.otherOrders.length === 1 ? 'orden de pago' : 'órdenes de pago'}
              </span>
            </div>

            <div className="adet-payment-order-list">
              {paymentData.otherOrders.map((order) => (
                <div key={order.serviceInstanceId} className="adet-payment-order-item">
                  <div>
                    <div className="adet-payment-order-item__name">{order.serviceName}</div>
                    <div className="adet-payment-order-item__status">
                      {order.status === 'pending' ? 'Sin pagar' : 'Pago parcial'}
                    </div>
                  </div>
                  <div>
                    <div className="adet-payment-order-item__amount">S/. {order.pendingAmount.toFixed(2)}</div>
                    <div className="adet-payment-order-item__amount-sub">pendiente</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="adet-other-payment-orders__total">
              <span className="adet-other-payment-orders__total-label">Total pendiente</span>
              <span className="adet-other-payment-orders__total-amount">S/. {paymentData.otherOrdersPending.toFixed(2)}</span>
            </div>

            <button className="adet-other-payment-orders__cta" onClick={handleViewPaymentOrders}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="2" y="3" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="2"/>
                <path d="M2 7h14M6 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Ver Todas las Órdenes de Pago del Paciente
            </button>

            <div className="adet-other-payment-orders__note">
              Estas órdenes de pago son de otros servicios del paciente, no de esta cita.
            </div>
          </div>
        )}

        {/* SECCIÓN 3: RESERVA */}
        <div className={`adet-reservation ${paymentData.hasReservation ? 'adet-reservation--paid' : 'adet-reservation--empty'}`}>
          <div className="adet-reservation__title">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="2"/>
              <path d="M2 6h12" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Reserva de Cita
          </div>

          {paymentData.hasReservation ? (
            <>
              <div className="adet-reservation__amount-row">
                <div>
                  <div className="adet-reservation__amount-label">Adelanto Pagado</div>
                  <div className="adet-reservation__amount">S/. {paymentData.reservationPaid.toFixed(2)}</div>
                </div>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <circle cx="14" cy="14" r="12" stroke="var(--color-success)" strokeWidth="2"/>
                  <path d="M8 14l4 4 8-8" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {appointment.reservationReceiptUrl && (() => {
                const receiptUrl = getReceiptUrl(appointment.reservationReceiptUrl) || '';
                const isPdf = receiptUrl.toLowerCase().includes('.pdf');
                const isImage = /\.(jpg|jpeg|png|webp)$/i.test(receiptUrl);
                const handleView = () => isPdf
                  ? window.open(receiptUrl, '_blank')
                  : openViewer([receiptUrl]);
                return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--color-bg-primary)', padding: '10px 12px', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--spacing-sm)', border: '1px solid var(--color-border-secondary)' }}>
                  {isImage && (
                    <img
                      src={receiptUrl}
                      alt="Recibo de reserva"
                      style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: 'var(--radius-md)', cursor: 'zoom-in', flexShrink: 0 }}
                      onClick={handleView}
                    />
                  )}
                  {isPdf && (
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }}>
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <text x="6" y="19" fontSize="5" fill="currentColor" fontWeight="bold">PDF</text>
                    </svg>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                      Comprobante de Reserva
                    </div>
                    <button
                      onClick={handleView}
                      style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 'var(--font-weight-semibold)', fontFamily: 'inherit' }}>
                      Ver recibo completo →
                    </button>
                  </div>
                </div>
                );
              })()}

              {appointment.status === 'reserved' && !appointment.reservationReceiptUrl && (
                <button onClick={handleUploadReceipt} className="adet-reservation__upload-btn">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M14 10v2.667A1.333 1.333 0 0112.667 14H3.333A1.333 1.333 0 012 12.667V10M11.333 5.333L8 2m0 0L4.667 5.333M8 2v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Subir Recibo
                </button>
              )}
            </>
          ) : (
            <>
              <div className="adet-reservation__empty-msg">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ margin: '0 auto 8px' }}>
                  <circle cx="20" cy="20" r="17" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3"/>
                  <path d="M20 13v14M13 20h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <p>Sin reserva registrada</p>
                <p className="adet-reservation__empty-sub">Adelanto opcional para asegurar la cita</p>
              </div>
              {appointment.status === 'reserved' && (
                <button onClick={handleUploadReceipt} className="adet-reservation__upload-btn">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M14 10v2.667A1.333 1.333 0 0112.667 14H3.333A1.333 1.333 0 012 12.667V10M11.333 5.333L8 2m0 0L4.667 5.333M8 2v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Registrar Reserva (Opcional)
                </button>
              )}
            </>
          )}

          <div className="adet-reservation__note">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}>
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M7 6.5V10M7 4.5h.005" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            La reserva es un adelanto independiente del pago del paquete.
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="card-icon">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
              <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2"/>
              <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h2>Fotos del Tratamiento</h2>
          </div>

          {/* Resumen de slots */}
          <div className="apt-detail__photo-summary">
            <div className="apt-detail__photo-summary-item apt-detail__photo-summary-item--before">
              <span className="apt-detail__photo-badge apt-detail__photo-badge--before">ANTES</span>
              <div className="apt-detail__slot-chips">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={`apt-detail__slot-chip apt-detail__slot-chip--before${i < beforeCount ? ' apt-detail__slot-chip--filled' : ''}`} />
                ))}
              </div>
              <span className="apt-detail__photo-summary-count">{beforeCount}/6</span>
            </div>
            <div className="apt-detail__photo-summary-sep" />
            <div className="apt-detail__photo-summary-item apt-detail__photo-summary-item--after">
              <span className="apt-detail__photo-badge apt-detail__photo-badge--after">DESPUÉS</span>
              <div className="apt-detail__slot-chips">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={`apt-detail__slot-chip apt-detail__slot-chip--after${i < afterCount ? ' apt-detail__slot-chip--filled' : ''}`} />
                ))}
              </div>
              <span className="apt-detail__photo-summary-count">{afterCount}/6</span>
            </div>

            {/* View Mode Switcher */}
            {appointment.patientRecords?.some((record: any) => {
              const beforePhotos = record.beforePhotoUrls as string[] | null;
              const afterPhotos = record.afterPhotoUrls as string[] | null;
              return (beforePhotos && beforePhotos.length > 0) && (afterPhotos && afterPhotos.length > 0);
            }) && (
              <div className="apt-detail__view-switcher" style={{ marginLeft: 'auto' }}>
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
                          <div key={index} className="apt-detail__photo-card" onClick={() => openViewer(beforePhotos.map(u => getReceiptUrl(u) || u), index)}>
                            <img src={getReceiptUrl(url) || ''} alt={`Antes ${index + 1}`} className="apt-detail__photo-img" />
                            <div className="apt-detail__photo-overlay">Foto {index + 1}</div>
                            {canMarkAttended && (
                              <button className="apt-detail__photo-delete" title="Eliminar foto"
                                onClick={(e) => { e.stopPropagation(); if (window.confirm('¿Eliminar esta foto?')) handleRemovePhoto(url, 'before'); }}>
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                              </button>
                            )}
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
                          <div key={index} className="apt-detail__photo-card" onClick={() => openViewer(afterPhotos.map(u => getReceiptUrl(u) || u), index)}>
                            <img src={getReceiptUrl(url) || ''} alt={`Después ${index + 1}`} className="apt-detail__photo-img" />
                            <div className="apt-detail__photo-overlay">Foto {index + 1}</div>
                            {canMarkAttended && (
                              <button className="apt-detail__photo-delete" title="Eliminar foto"
                                onClick={(e) => { e.stopPropagation(); if (window.confirm('¿Eliminar esta foto?')) handleRemovePhoto(url, 'after'); }}>
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                              </button>
                            )}
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
                        <div key={index} className="apt-detail__photo-card" onClick={() => openViewer(beforePhotos.map(u => getReceiptUrl(u) || u), index)}>
                          <img src={getReceiptUrl(url) || ''} alt={`Antes ${index + 1}`} className="apt-detail__photo-img" />
                          <div className="apt-detail__photo-overlay">Foto {index + 1}</div>
                          {canMarkAttended && (
                            <button className="apt-detail__photo-delete" title="Eliminar foto"
                              onClick={(e) => { e.stopPropagation(); if (window.confirm('¿Eliminar esta foto?')) handleRemovePhoto(url, 'before'); }}>
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                            </button>
                          )}
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
                        <div key={index} className="apt-detail__photo-card" onClick={() => openViewer(afterPhotos.map(u => getReceiptUrl(u) || u), index)}>
                          <img src={getReceiptUrl(url) || ''} alt={`Después ${index + 1}`} className="apt-detail__photo-img" />
                          <div className="apt-detail__photo-overlay">Foto {index + 1}</div>
                          {canMarkAttended && (
                            <button className="apt-detail__photo-delete" title="Eliminar foto"
                              onClick={(e) => { e.stopPropagation(); if (window.confirm('¿Eliminar esta foto?')) handleRemovePhoto(url, 'after'); }}>
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                            </button>
                          )}
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
                disabled={beforeCount >= 6}
              >
                <div className="apt-detail__upload-btn-content">
                  <div className="apt-detail__upload-btn-label">
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <path d="M17.5 12.5v3.333a1.667 1.667 0 01-1.667 1.667H4.167A1.667 1.667 0 012.5 15.833V12.5M14.167 6.667L10 2.5m0 0L5.833 6.667M10 2.5v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {beforeCount >= 6 ? 'Antes · Completo' : 'Agregar · Antes'}
                  </div>
                  <div className="apt-detail__upload-btn-slots">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className={`apt-detail__slot-chip apt-detail__slot-chip--before${i < beforeCount ? ' apt-detail__slot-chip--filled' : ''}`} />
                    ))}
                    <span className="apt-detail__slot-label">{beforeCount}/6</span>
                  </div>
                </div>
              </button>
              <button
                className="apt-detail__upload-btn apt-detail__upload-btn--after"
                onClick={() => {
                  setPhotoUploadType('after');
                  setShowPhotoUploadModal(true);
                }}
                disabled={afterCount >= 6}
              >
                <div className="apt-detail__upload-btn-content">
                  <div className="apt-detail__upload-btn-label">
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <path d="M17.5 12.5v3.333a1.667 1.667 0 01-1.667 1.667H4.167A1.667 1.667 0 012.5 15.833V12.5M14.167 6.667L10 2.5m0 0L5.833 6.667M10 2.5v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {afterCount >= 6 ? 'Después · Completo' : 'Agregar · Después'}
                  </div>
                  <div className="apt-detail__upload-btn-slots">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className={`apt-detail__slot-chip apt-detail__slot-chip--after${i < afterCount ? ' apt-detail__slot-chip--filled' : ''}`} />
                    ))}
                    <span className="apt-detail__slot-label">{afterCount}/6</span>
                  </div>
                </div>
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
                  let bmi: number | null = null;
                  let bmiVariant: 'info' | 'success' | 'warning' | 'error' = 'success';
                  let bmiLabel = '';

                  if (weight && height) {
                    const hm = height / 100;
                    bmi = weight / (hm * hm);
                    if (bmi < 18.5)      { bmiVariant = 'info';    bmiLabel = 'Bajo peso'; }
                    else if (bmi < 25)   { bmiVariant = 'success'; bmiLabel = 'Peso normal'; }
                    else if (bmi < 30)   { bmiVariant = 'warning'; bmiLabel = 'Sobrepeso'; }
                    else                 { bmiVariant = 'error';   bmiLabel = 'Obesidad'; }
                  }

                  const cols = [weight, height, bmi].filter(Boolean).length;
                  return (
                    <div className="adet-measures-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                      {weight && (
                        <div className="adet-measure-stat adet-measure-stat--success">
                          <div className="adet-measure-stat__label">Peso</div>
                          <div className="adet-measure-stat__value">{weight} <span style={{ fontSize: 'var(--font-size-base)' }}>kg</span></div>
                        </div>
                      )}
                      {height && (
                        <div className="adet-measure-stat adet-measure-stat--warning">
                          <div className="adet-measure-stat__label">Altura</div>
                          <div className="adet-measure-stat__value">{height} <span style={{ fontSize: 'var(--font-size-base)' }}>cm</span></div>
                        </div>
                      )}
                      {bmi && (
                        <div className={`adet-measure-stat adet-measure-stat--${bmiVariant}`}>
                          <div className="adet-measure-stat__label">IMC</div>
                          <div className="adet-measure-stat__value">{bmi.toFixed(1)}</div>
                          <div className="adet-measure-stat__sub">{bmiLabel}</div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Medidas Corporales */}
                {patientRecord.bodyMeasurement && Object.keys(patientRecord.bodyMeasurement).length > 0 && (
                  <div className="adet-body-block">
                    <div className="adet-body-block__title">Medidas del Cuerpo</div>
                    <div className="adet-body-items">
                      {Object.entries(patientRecord.bodyMeasurement).map(([key, value]) => {
                        if (key === 'height') return null;
                        const labels: Record<string, string> = {
                          waist: 'Cintura', chest: 'Pecho', hips: 'Cadera',
                          leftArm: 'Brazo Izq.', rightArm: 'Brazo Der.',
                          leftThigh: 'Muslo Izq.', rightThigh: 'Muslo Der.',
                          leftCalf: 'Pantorrilla Izq.', rightCalf: 'Pantorrilla Der.',
                          abdomen: 'Abdomen', triceps: 'Tríceps',
                          subscapular: 'Subescapular', suprailiac: 'Suprailiaco', thigh: 'Muslo',
                        };
                        const unit = ['abdomen', 'triceps', 'subscapular', 'suprailiac', 'thigh'].includes(key) ? 'mm' : 'cm';
                        return (
                          <div key={key} className="adet-body-item">
                            <div className="adet-body-item__label">{labels[key] || key}</div>
                            <div className="adet-body-item__value">{value} {unit}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Notas de Salud */}
                {patientRecord.healthNotes && (
                  <div className="adet-health-notes">
                    <div className="adet-health-notes__title">Notas de Salud</div>
                    <div className="adet-health-notes__text">{patientRecord.healthNotes}</div>
                  </div>
                )}

                {canMarkAttended && (
                  <button className="adet-pay-cta" onClick={() => setShowBodyMeasurementsModal(true)}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M12 3a2 2 0 112.828 2.828l-.707.707-2.828-2.828.707-.707zM10.172 5.172L2 13.344V16h2.656l8.172-8.172-2.656-2.656z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Actualizar Medidas
                  </button>
                )}
              </div>
            ) : (
              <div className="adet-measures-empty">
                <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                  <circle cx="28" cy="28" r="25" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3"/>
                  <path d="M28 18v20M18 28h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <p>No hay medidas registradas</p>
                <p className="adet-measures-empty__sub">Registra peso, medidas y grosor de piel para el seguimiento</p>
                {canMarkAttended && (
                  <button className="adet-pay-cta" style={{ marginTop: 'var(--spacing-sm)' }} onClick={() => setShowBodyMeasurementsModal(true)}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
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
        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <textarea
            className="adet-note-textarea"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Agregar una nota sobre esta cita (reacciones, alergias, observaciones, etc.)"
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
          <div className="adet-notes-list">
            {appointment.appointmentNotes.map((note) => (
              <div key={note.id} className="adet-note-item">
                <div className="adet-note-item__header">
                  <div>
                    <span className="adet-note-item__author">
                      {note.createdBy?.firstName} {note.createdBy?.lastName}
                    </span>
                    <span className="adet-note-item__role">
                      {(() => {
                        const roleName = typeof note.createdBy?.role === 'string' ? note.createdBy.role : note.createdBy?.role?.name;
                        if (roleName === Role.admin) return 'Admin';
                        if (roleName === Role.medical_staff) return 'Personal Médico';
                        if (roleName === Role.sales) return 'Vendedor';
                        return note.createdBy?.role && typeof note.createdBy.role !== 'string' ? note.createdBy.role.displayName : roleName;
                      })()}
                    </span>
                  </div>
                  <span className="adet-note-item__date">
                    {new Date(note.createdAt).toLocaleString('es-PE', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
                <p className="adet-note-item__text">{note.note}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="adet-notes-empty">No hay notas para esta cita. Agrega la primera nota arriba.</p>
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
              <span className="system-label">Estado cambiado por</span>
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
        fixedAmount={appointment?.reservationAmount ? Number(appointment.reservationAmount) : undefined}
      />

      {/* Upload Photos Modal */}
      {appointment && (
        <UploadPhotosModal
          isOpen={showPhotoUploadModal}
          onClose={() => setShowPhotoUploadModal(false)}
          onSubmit={handlePhotoUpload}
          type={photoUploadType}
          appointmentId={appointment.id}
          existingCount={photoUploadType === 'before' ? beforeCount : afterCount}
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

      {viewerImages.length > 0 && (
        <ImageViewer images={viewerImages} initialIndex={viewerIndex} onClose={closeViewer} />
      )}

      {/* Barra de estado sticky — siempre visible al fondo del área de contenido */}
      <StateTransitionSelector
        key={appointment.attendees?.length ?? 0}
        currentStatus={appointment.status}
        appointmentId={appointment.id}
        appointment={appointment}
        onTransition={async (newStatus) => {
          if (newStatus === 'attended') {
            if (!appointment.attendees || appointment.attendees.length === 0) {
              setAttendeeRequiredError(true);
              setTimeout(() => {
                attendeeErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 0);
              const handledErr = new Error('Debe agregar al menos un profesional');
              (handledErr as any).handled = true;
              throw handledErr;
            }
            setAttendeeRequiredError(false);
            await appointmentsService.markAsAttended(appointment.id);
          } else {
            await appointmentsService.updateAppointment(appointment.id, { status: newStatus });
          }
          await loadAppointment(appointment.id, true);
        }}
        disabled={false}
        fixedBottom={true}
      />
    </div>
  );
};

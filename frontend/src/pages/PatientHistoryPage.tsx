import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { patientsService } from '../services/patients.service';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';
import { AppointmentStatus } from '../types';
import { formatDate, formatDateTime } from '../utils/dateUtils';

interface PatientHistory {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    createdAt: string;
    createdBy: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
  statistics: {
    totalAppointments: number;
    attendedAppointments: number;
    cancelledAppointments: number;
    noShowAppointments: number;
    registrationDate: string;
    lastAttendedDate: string | null;
    lastAppointmentDate: string | null;
  };
  appointments: Array<{
    id: string;
    scheduledDate: string;
    status: AppointmentStatus;
    notes: string | null;
    reservationAmount: string | null;
    createdAt: string;
    attendedAt: string | null;
    appointmentServices: Array<{
      id: string;
      serviceId: string;
      orderId: string | null;
      sessionNumber: number | null;
      service: {
        name: string;
        basePrice: string;
      };
      order: {
        id: string;
        totalSessions: number;
      } | null;
    }>;
    createdBy: {
      id: string;
      firstName: string;
      lastName: string;
    };
    attendedBy: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
    patientRecords: Array<{
      id: string;
      weight: string | null;
      healthNotes: string | null;
      beforePhotoUrls: string[] | null;
      afterPhotoUrls: string[] | null;
      createdAt: string;
      originalService?: {
        id: string;
        name: string;
        basePrice: string;
      } | null;
      createdBy: {
        id: string;
        firstName: string;
        lastName: string;
      };
    }>;
    appointmentNotes?: Array<{
      id: string;
      appointmentId: string;
      note: string;
      createdById: string;
      createdAt: string;
      createdBy?: {
        id: string;
        firstName: string;
        lastName: string;
      };
    }>;
  }>;
}

export const PatientHistoryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [history, setHistory] = useState<PatientHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllAppointments, setShowAllAppointments] = useState(false);

  useEffect(() => {
    if (id) {
      loadHistory(id);
    }
  }, [id]);

  const loadHistory = async (patientId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await patientsService.getPatientHistory(patientId);
      setHistory(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar historial');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate(`/patients/${id}`);
  };

  const statusLabels: Record<AppointmentStatus, string> = {
    reserved: 'Reservada',
    in_progress: 'En Atención',
    attended: 'Atendida',
    cancelled: 'Cancelada',
    no_show: 'No asistió'
  };

  const statusColors: Record<AppointmentStatus, string> = {
    reserved: '#3498db',
    in_progress: '#f39c12',
    attended: '#2ecc71',
    cancelled: '#e74c3c',
    no_show: '#95a5a6'
  };

  if (isLoading) {
    return <Loading text="Cargando historial del paciente..." />;
  }

  if (error || !history) {
    return (
      <div className="page-container">
        <div className="error-banner">
          {error || 'No se pudo cargar el historial'}
        </div>
        <Button onClick={handleBack}>Volver</Button>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <Button variant="secondary" onClick={handleBack}>
            ← Volver al Perfil
          </Button>
          <h1>Historial Médico</h1>
          <h2 style={{ color: '#7f8c8d', fontWeight: 'normal', marginTop: '10px' }}>
            {history.patient.firstName} {history.patient.lastName}
          </h2>
        </div>
      </div>

      {/* View Tabs */}
      <div style={{
        marginBottom: '30px',
        borderBottom: '2px solid #e5e7eb',
        display: 'flex',
        gap: '4px'
      }}>
        {/* Tab: Historial Médico */}
        <button
          onClick={() => setShowAllAppointments(false)}
          style={{
            padding: '12px 24px',
            border: 'none',
            borderBottom: showAllAppointments ? 'none' : '3px solid #2ecc71',
            background: showAllAppointments ? 'transparent' : 'linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%)',
            color: showAllAppointments ? '#7f8c8d' : '#2c3e50',
            fontWeight: showAllAppointments ? '500' : '600',
            fontSize: '15px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '8px 8px 0 0',
            marginBottom: '-2px'
          }}
        >
          <span style={{ fontSize: '18px' }}>📋</span>
          Historial Médico
          <span style={{
            background: showAllAppointments ? '#e5e7eb' : '#2ecc71',
            color: showAllAppointments ? '#6b7280' : 'white',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '600',
            marginLeft: '4px'
          }}>
            {history.appointments.filter(apt => apt.status === 'attended' && apt.patientRecords && apt.patientRecords.length > 0).length}
          </span>
        </button>

        {/* Tab: Todas las Citas */}
        <button
          onClick={() => setShowAllAppointments(true)}
          style={{
            padding: '12px 24px',
            border: 'none',
            borderBottom: showAllAppointments ? '3px solid #3498db' : 'none',
            background: showAllAppointments ? 'linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%)' : 'transparent',
            color: showAllAppointments ? '#2c3e50' : '#7f8c8d',
            fontWeight: showAllAppointments ? '600' : '500',
            fontSize: '15px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '8px 8px 0 0',
            marginBottom: '-2px'
          }}
        >
          <span style={{ fontSize: '18px' }}>📅</span>
          Todas las Citas
          <span style={{
            background: showAllAppointments ? '#3498db' : '#e5e7eb',
            color: showAllAppointments ? 'white' : '#6b7280',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '600',
            marginLeft: '4px'
          }}>
            {history.appointments.length}
          </span>
        </button>
      </div>

      {/* Statistics Cards - Medical Focus */}
      <div className="stats-grid" style={{ marginBottom: '30px' }}>
        {(() => {
          // Filtrar citas según el checkbox
          const appointmentsWithRecords = showAllAppointments
            ? history.appointments // Mostrar todas las citas
            : history.appointments.filter( // Solo citas con registros médicos
                apt => apt.status === 'attended' && apt.patientRecords && apt.patientRecords.length > 0
              );

          // Encontrar la fecha del último registro médico
          const lastRecordDate = appointmentsWithRecords.length > 0
            ? appointmentsWithRecords
                .map(apt => new Date(apt.attendedAt || apt.scheduledDate))
                .sort((a, b) => b.getTime() - a.getTime())[0]
            : null;

          return (
            <>
              <div className="stat-card" style={{ background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)' }}>
                <div className="stat-value">{appointmentsWithRecords.length}</div>
                <div className="stat-label">Procedimientos Documentados</div>
              </div>
              <div className="stat-card" style={{ background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)' }}>
                <div className="stat-value">
                  {history.statistics.registrationDate
                    ? formatDate(history.statistics.registrationDate)
                    : '-'}
                </div>
                <div className="stat-label">Paciente desde</div>
              </div>
              <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)' }}>
                <div className="stat-value">
                  {lastRecordDate
                    ? formatDate(lastRecordDate)
                    : 'Ninguno'}
                </div>
                <div className="stat-label">Último Registro</div>
              </div>
              <div className="stat-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <div className="stat-value">
                  {appointmentsWithRecords.reduce((total, apt) =>
                    total + (apt.patientRecords?.length || 0), 0
                  )}
                </div>
                <div className="stat-label">Archivos Médicos</div>
              </div>
            </>
          );
        })()}
      </div>

      {/* Timeline - Medical Records Only */}
      <div className="timeline-container">
        <h2 style={{ marginBottom: '30px', color: '#2c3e50' }}>
          {showAllAppointments ? 'Historial de Citas' : 'Historial de Procedimientos'}
        </h2>

        {(() => {
          // Filtrar citas según el checkbox (igual que en statistics)
          const filteredAppointments = showAllAppointments
            ? history.appointments
            : history.appointments.filter(apt => apt.status === 'attended' && apt.patientRecords && apt.patientRecords.length > 0);

          if (filteredAppointments.length === 0) {
            return (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#7f8c8d',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px'
              }}>
                <p style={{ fontSize: '18px' }}>
                  {showAllAppointments
                    ? 'No hay citas registradas para este paciente'
                    : 'No hay registros médicos para este paciente'}
                </p>
              </div>
            );
          }

          return (
            <div className="timeline">
              {filteredAppointments.map((appointment, index) => (
              <div key={appointment.id} className="timeline-item">
                <div
                  className="timeline-marker"
                  style={{ backgroundColor: statusColors[appointment.status] }}
                >
                  {appointment.status === 'attended' ? '✓' :
                   appointment.status === 'reserved' ? '📅' :
                   appointment.status === 'in_progress' ? '⏳' :
                   appointment.status === 'cancelled' ? '✕' :
                   appointment.status === 'no_show' ? '⚠' : '?'}
                </div>
                <div className="timeline-content">
                  <div className="timeline-header">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                        <h3 style={{ margin: 0, color: '#2c3e50', fontSize: '18px' }}>
                          {formatDate(appointment.attendedAt || appointment.scheduledDate, {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </h3>
                        {showAllAppointments && (
                          <span style={{
                            background: statusColors[appointment.status],
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {statusLabels[appointment.status]}
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '5px 0', color: '#7f8c8d', fontSize: '13px' }}>
                        {appointment.status === 'attended' && appointment.attendedBy
                          ? `Atendido por: ${appointment.attendedBy.firstName} ${appointment.attendedBy.lastName}`
                          : `Creado por: ${appointment.createdBy.firstName} ${appointment.createdBy.lastName}`}
                      </p>
                    </div>
                  </div>

                  {/* Treatments Section */}
                  <div style={{
                    marginTop: '15px',
                    marginBottom: '15px',
                    padding: '15px',
                    backgroundColor: '#e8f5e9',
                    borderRadius: '8px',
                    border: '1px solid #c8e6c9'
                  }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#2c3e50', fontSize: '15px', fontWeight: '600' }}>
                      Tratamientos Realizados
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {appointment.appointmentServices.map((appSvc, idx) => (
                        <div key={appSvc.id} style={{
                          padding: '8px 12px',
                          backgroundColor: 'white',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span style={{ fontSize: '16px' }}>•</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '500', color: '#2c3e50' }}>
                              {appSvc.order.service?.name}
                            </div>
                            {appSvc.order && appSvc.sessionNumber && (
                              <div style={{ fontSize: '12px', color: '#6c757d' }}>
                                Sesión {appSvc.sessionNumber} de {appSvc.order.totalSessions}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Medical Records */}
                  {appointment.patientRecords && appointment.patientRecords.length > 0 && (
                    <div className="medical-records">
                      {appointment.patientRecords.map((record) => (
                        <div key={record.id} className="medical-record-item">
                          {record.healthNotes && (
                            <div style={{
                              marginBottom: '15px',
                              padding: '15px',
                              backgroundColor: '#fff3e0',
                              borderRadius: '8px',
                              borderLeft: '4px solid #ff9800'
                            }}>
                              <strong style={{ display: 'block', marginBottom: '8px', color: '#e65100', fontSize: '14px' }}>
                                📋 Notas del Procedimiento
                              </strong>
                              <p style={{ margin: 0, lineHeight: '1.6', color: '#5d4037' }}>{record.healthNotes}</p>
                            </div>
                          )}
                          {record.weight && (
                            <div style={{
                              padding: '12px',
                              backgroundColor: '#e3f2fd',
                              borderRadius: '8px',
                              marginBottom: '15px',
                              display: 'inline-block'
                            }}>
                              <strong style={{ color: '#1565c0' }}>⚖️ Peso registrado:</strong> {Number(record.weight).toFixed(1)} kg
                            </div>
                          )}

                          {/* Before Photos */}
                          {record.beforePhotoUrls && Array.isArray(record.beforePhotoUrls) && record.beforePhotoUrls.length > 0 && (
                            <div style={{ marginTop: '20px' }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '12px',
                                padding: '8px 12px',
                                backgroundColor: '#fce4ec',
                                borderRadius: '6px',
                                width: 'fit-content'
                              }}>
                                <span style={{ fontSize: '20px' }}>📸</span>
                                <strong style={{ color: '#c2185b', fontSize: '14px' }}>Fotos Antes del Tratamiento</strong>
                              </div>
                              <div className="photo-grid">
                                {record.beforePhotoUrls.map((url, idx) => (
                                  <img
                                    key={idx}
                                    src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000'}${url}`}
                                    alt={`Antes ${idx + 1}`}
                                    className="timeline-photo"
                                    onClick={() => window.open(`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000'}${url}`, '_blank')}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* After Photos */}
                          {record.afterPhotoUrls && Array.isArray(record.afterPhotoUrls) && record.afterPhotoUrls.length > 0 && (
                            <div style={{ marginTop: '20px' }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '12px',
                                padding: '8px 12px',
                                backgroundColor: '#e8f5e9',
                                borderRadius: '6px',
                                width: 'fit-content'
                              }}>
                                <span style={{ fontSize: '20px' }}>✨</span>
                                <strong style={{ color: '#2e7d32', fontSize: '14px' }}>Fotos Después del Tratamiento</strong>
                              </div>
                              <div className="photo-grid">
                                {record.afterPhotoUrls.map((url, idx) => (
                                  <img
                                    key={idx}
                                    src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000'}${url}`}
                                    alt={`Después ${idx + 1}`}
                                    className="timeline-photo"
                                    onClick={() => window.open(`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000'}${url}`, '_blank')}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Appointment Notes */}
                  {appointment.appointmentNotes && appointment.appointmentNotes.length > 0 && (
                    <div style={{
                      marginTop: '15px',
                      padding: '15px',
                      backgroundColor: '#f0f4ff',
                      borderRadius: '8px',
                      border: '1px solid #d0e0ff'
                    }}>
                      <h4 style={{ margin: '0 0 12px 0', color: '#2c3e50', fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>💬</span>
                        Notas de Atención
                      </h4>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {appointment.appointmentNotes.map((note) => (
                          <div
                            key={note.id}
                            style={{
                              padding: '12px',
                              background: 'white',
                              borderRadius: '6px',
                              borderLeft: '3px solid #3b82f6'
                            }}
                          >
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              marginBottom: '6px'
                            }}>
                              <div>
                                <span style={{ fontWeight: '600', color: '#2c3e50', fontSize: '13px' }}>
                                  {note.createdBy?.firstName} {note.createdBy?.lastName}
                                </span>
                              </div>
                              <span style={{ color: '#7f8c8d', fontSize: '11px' }}>
                                {formatDateTime(note.createdAt, {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <p style={{ margin: 0, color: '#2c3e50', fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                              {note.note}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          );
        })()}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { patientsService } from '../services/patients.service';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';
import { ImageViewer } from '../components/ImageViewer';
import { AppointmentStatus } from '../types';
import { formatDate, formatDateTime } from '../utils/dateUtils';
import '../styles/patient-history.css';

interface PatientHistory {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    createdAt: string;
    createdBy: { id: string; firstName: string; lastName: string };
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
  concludedOrders?: Array<{
    id: string;
    concludedAt: string;
    concludeReason: string | null;
    totalSessions: number;
    service: { id: string; name: string } | null;
    concludedBy: { id: string; firstName: string; lastName: string } | null;
    appointmentServices: Array<{
      appointment?: { status: string } | null;
    }>;
  }>;
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
      serviceTemplateId: string;
      serviceInstanceId: string | null;
      sessionNumber: number | null;
      serviceInstance?: { totalSessions: number; service?: { name: string } } | null;
      service?: { name: string; basePrice: string };
      order: { id: string; totalSessions: number } | null;
    }>;
    createdBy: { id: string; firstName: string; lastName: string };
    attendedBy: { id: string; firstName: string; lastName: string } | null;
    patientRecords: Array<{
      id: string;
      weight: string | null;
      healthNotes: string | null;
      beforePhotoUrls: string[] | null;
      afterPhotoUrls: string[] | null;
      createdAt: string;
      createdBy: { id: string; firstName: string; lastName: string };
    }>;
    appointmentNotes?: Array<{
      id: string;
      note: string;
      createdAt: string;
      createdBy?: { id: string; firstName: string; lastName: string };
    }>;
  }>;
}

const statusLabels: Record<AppointmentStatus, string> = {
  reserved: 'Reservada',
  in_progress: 'En Atención',
  attended: 'Atendida',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};

// URL relativa — el proxy de Vite enruta /uploads al backend
const photoBase = '';

export const PatientHistoryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [history, setHistory] = useState<PatientHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  const openViewer = (images: string[], index = 0) => {
    setViewerImages(images);
    setViewerIndex(index);
  };
  const closeViewer = () => setViewerImages([]);

  useEffect(() => {
    if (id) loadHistory(id);
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

  if (isLoading) return <Loading text="Cargando historial del paciente..." />;

  if (error || !history) {
    return (
      <div className="page-container">
        <div className="alert alert-error">{error || 'No se pudo cargar el historial'}</div>
        <Button onClick={() => navigate(`/patients/${id}`)}>Volver</Button>
      </div>
    );
  }

  const withRecords = history.appointments.filter(
    apt => apt.status === 'attended' && apt.patientRecords?.length > 0,
  );
  const displayList = showAll ? history.appointments : withRecords;

  const lastRecordDate = displayList.length > 0
    ? displayList
        .map(apt => new Date(apt.attendedAt || apt.scheduledDate))
        .sort((a, b) => b.getTime() - a.getTime())[0]
    : null;

  return (
    <div className="page-container">

      {/* ── Back + Header ── */}
      <button className="pd-back" onClick={() => navigate(`/patients/${id}`)}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Volver al Perfil
      </button>

      <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', margin: '0 0 var(--spacing-xs)' }}>
        Historial Médico
      </h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-base)', margin: '0 0 var(--spacing-xl)' }}>
        {history.patient.firstName} {history.patient.lastName}
      </p>

      {/* ── Tabs ── */}
      <div className="phist-tabs">
        <button
          className={`phist-tab${!showAll ? ' phist-tab--active' : ''}`}
          onClick={() => setShowAll(false)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          Historial Médico
          <span className="phist-tab__badge">{withRecords.length}</span>
        </button>
        <button
          className={`phist-tab${showAll ? ' phist-tab--active' : ''}`}
          onClick={() => setShowAll(true)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M2 6h12M6 2v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          Todas las Citas
          <span className="phist-tab__badge">{history.appointments.length}</span>
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="phist-stat-grid">
        <div className="phist-stat-card phist-stat-card--records">
          <div className="phist-stat-card__value">{displayList.length}</div>
          <div className="phist-stat-card__label">Procedimientos Documentados</div>
        </div>
        <div className="phist-stat-card phist-stat-card--since">
          <div className="phist-stat-card__value">
            {history.statistics.registrationDate ? formatDate(history.statistics.registrationDate) : '-'}
          </div>
          <div className="phist-stat-card__label">Paciente desde</div>
        </div>
        <div className="phist-stat-card phist-stat-card--last">
          <div className="phist-stat-card__value">
            {lastRecordDate ? formatDate(lastRecordDate) : 'Ninguno'}
          </div>
          <div className="phist-stat-card__label">Último Registro</div>
        </div>
        <div className="phist-stat-card phist-stat-card--files">
          <div className="phist-stat-card__value">
            {displayList.reduce((t, apt) => t + (apt.patientRecords?.length || 0), 0)}
          </div>
          <div className="phist-stat-card__label">Archivos Médicos</div>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div className="timeline-container">
        <h2 className="phist-section-title">
          {showAll ? 'Historial de Citas' : 'Historial de Procedimientos'}
        </h2>

        {(() => {
          // Eventos de citas
          const aptEvents = displayList.map(apt => ({
            type: 'appointment' as const,
            date: apt.scheduledDate,
            apt,
          }));

          // Eventos de tratamientos concluidos (siempre visibles, independiente del tab)
          const concludedEvents = (history.concludedOrders || []).map(order => ({
            type: 'concluded' as const,
            date: order.concludedAt,
            order,
          }));

          // Mezclar y ordenar por fecha descendente
          const allEvents = [...aptEvents, ...concludedEvents].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );

          if (allEvents.length === 0) return (
            <div className="phist-empty">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ margin: '0 auto var(--spacing-md)', display: 'block' }}>
                <rect x="8" y="6" width="32" height="36" rx="3" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3"/>
                <path d="M14 16h20M14 22h20M14 28h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {showAll ? 'No hay citas registradas para este paciente' : 'No hay registros médicos para este paciente'}
            </div>
          );

          return (
          <div className="timeline">
            {allEvents.map((event) => {
              /* ── Evento: Tratamiento Concluido ── */
              if (event.type === 'concluded') {
                const order = event.order;
                const attended = order.appointmentServices.filter(as => as.appointment?.status === 'attended').length;
                const remaining = order.totalSessions - attended;
                return (
                  <div key={`concluded-${order.id}`} className="timeline-item">
                    <div className="timeline-marker" style={{ background: 'var(--color-warning)', color: '#fff', fontSize: 13, fontWeight: 700 }}>
                      ■
                    </div>
                    <div className="timeline-content" style={{ borderLeft: '3px solid var(--color-warning)', paddingLeft: 'var(--spacing-md)' }}>
                      <div className="timeline-header">
                        <div>
                          <p className="phist-apt-date" style={{ color: 'var(--color-warning)', fontSize: 'var(--font-size-base)' }}>
                            Tratamiento concluido anticipadamente
                          </p>
                          <p className="phist-apt-meta">
                            {formatDate(order.concludedAt)}
                            {order.concludedBy && ` · por ${order.concludedBy.firstName} ${order.concludedBy.lastName}`}
                          </p>
                        </div>
                        <span className="phist-status-badge" style={{ background: 'var(--color-warning)', color: '#fff' }}>
                          Concluido
                        </span>
                      </div>

                      {/* Detalle del tratamiento */}
                      <div style={{ marginTop: 'var(--spacing-sm)', padding: 'var(--spacing-sm) var(--spacing-md)', background: 'var(--color-warning-alpha-10)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-warning)' }}>
                        <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', marginBottom: 4 }}>
                          {order.service?.name || 'Servicio'}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                          <span style={{ color: 'var(--color-success-dark)', fontWeight: 600 }}>✓ {attended} completada{attended !== 1 ? 's' : ''}</span>
                          {remaining > 0 && (
                            <span style={{ color: 'var(--color-error)', fontWeight: 600 }}>✕ {remaining} sin completar</span>
                          )}
                          <span style={{ color: 'var(--color-text-tertiary)' }}>de {order.totalSessions} totales</span>
                        </div>
                        {order.concludeReason && (
                          <div style={{ marginTop: 6, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', fontStyle: 'italic', borderTop: '1px solid var(--color-border-secondary)', paddingTop: 6 }}>
                            Motivo: "{order.concludeReason}"
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              /* ── Evento: Cita ── */
              const apt = event.apt;
              return (
              <div key={apt.id} className="timeline-item">

                {/* Marker con color de estado */}
                <div className={`timeline-marker timeline-marker--${apt.status}`}>
                  {apt.status === 'attended'    ? '✓' :
                   apt.status === 'reserved'    ? '◆' :
                   apt.status === 'in_progress' ? '▶' :
                   apt.status === 'cancelled'   ? '✕' :
                   apt.status === 'no_show'     ? '!' : '?'}
                </div>

                <div className="timeline-content">
                  {/* Header */}
                  <div className="timeline-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                      <h3 className="phist-apt-date">
                        {formatDate(apt.attendedAt || apt.scheduledDate, {
                          day: 'numeric', month: 'long', year: 'numeric',
                        })}
                      </h3>
                      {showAll && (
                        <span className={`phist-status-badge phist-status-badge--${apt.status}`}>
                          {statusLabels[apt.status]}
                        </span>
                      )}
                    </div>
                    <p className="phist-apt-meta">
                      {apt.status === 'attended' && apt.attendedBy
                        ? `Atendido por: ${apt.attendedBy.firstName} ${apt.attendedBy.lastName}`
                        : `Creado por: ${apt.createdBy.firstName} ${apt.createdBy.lastName}`}
                    </p>
                  </div>

                  {/* Tratamientos */}
                  {apt.appointmentServices.length > 0 && (
                    <div className="phist-treatment-block">
                      <div className="phist-treatment-block__title">Tratamientos Realizados</div>
                      <div className="phist-treatment-list">
                        {apt.appointmentServices.map(svc => (
                          <div key={svc.id} className="phist-treatment-row">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <circle cx="7" cy="7" r="3" fill="var(--color-success)"/>
                            </svg>
                            <div>
                              <div className="phist-treatment-row__name">
                                {svc.serviceInstance?.service?.name || svc.service?.name || 'Servicio'}
                              </div>
                              {svc.serviceInstance && svc.sessionNumber && (
                                <div className="phist-treatment-row__session">
                                  Sesión {svc.sessionNumber} de {svc.serviceInstance.totalSessions}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Registros médicos */}
                  {apt.patientRecords?.length > 0 && (
                    <div className="medical-records">
                      {apt.patientRecords.map(record => (
                        <div key={record.id} className="medical-record-item">

                          {/* Notas de salud */}
                          {record.healthNotes && (
                            <div className="phist-health-note">
                              <strong className="phist-health-note__title">Notas del Procedimiento</strong>
                              <p className="phist-health-note__text">{record.healthNotes}</p>
                            </div>
                          )}

                          {/* Peso */}
                          {record.weight && (
                            <div className="phist-weight">
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M2 10h10M4 10V7a3 3 0 016 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                              Peso registrado: {Number(record.weight).toFixed(1)} kg
                            </div>
                          )}

                          {/* Fotos antes */}
                          {record.beforePhotoUrls && record.beforePhotoUrls.length > 0 && (
                            <div className="phist-photo-section">
                              <div className="phist-photo-badge phist-photo-badge--before">
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <rect x="1" y="2" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                                  <circle cx="4" cy="5" r="1" stroke="currentColor" strokeWidth="1.2"/>
                                  <path d="M1 8l3-2.5 2 2 2-2.5 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                Fotos Antes del Tratamiento
                              </div>
                              <div className="photo-grid">
                                {record.beforePhotoUrls.map((url, i) => (
                                  <img key={i} src={`${photoBase}${url}`} alt={`Antes ${i + 1}`}
                                    className="timeline-photo"
                                    style={{ cursor: 'zoom-in' }}
                                    onClick={() => openViewer((record.beforePhotoUrls ?? []).map((u: string) => `${photoBase}${u}`), i)} />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Fotos después */}
                          {record.afterPhotoUrls && record.afterPhotoUrls.length > 0 && (
                            <div className="phist-photo-section">
                              <div className="phist-photo-badge phist-photo-badge--after">
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 9l3-3 2 2 3-4 2 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <rect x="1" y="2" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                                </svg>
                                Fotos Después del Tratamiento
                              </div>
                              <div className="photo-grid">
                                {record.afterPhotoUrls.map((url, i) => (
                                  <img key={i} src={`${photoBase}${url}`} alt={`Después ${i + 1}`}
                                    className="timeline-photo"
                                    style={{ cursor: 'zoom-in' }}
                                    onClick={() => openViewer((record.afterPhotoUrls ?? []).map((u: string) => `${photoBase}${u}`), i)} />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Notas de atención */}
                  {apt.appointmentNotes && apt.appointmentNotes.length > 0 && (
                    <div className="phist-notes-block">
                      <div className="phist-notes-block__title">Notas de Atención</div>
                      {apt.appointmentNotes.map(note => (
                        <div key={note.id} className="phist-note-item">
                          <div className="phist-note-item__header">
                            <span className="phist-note-item__author">
                              {note.createdBy?.firstName} {note.createdBy?.lastName}
                            </span>
                            <span className="phist-note-item__date">
                              {formatDateTime(note.createdAt, {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="phist-note-item__text">{note.note}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
            })}
          </div>
          );
        })()}
      </div>

      {viewerImages.length > 0 && (
        <ImageViewer images={viewerImages} initialIndex={viewerIndex} onClose={closeViewer} />
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Appointment, AppointmentStatus, User } from '../types';
import {
  canTransition,
  requiresConfirmation as needsConfirmation,
  getConfirmationMessage,
} from '../config/appointmentStateMachine.config';
import { useAuth } from '../contexts/AuthContext';
import { appointmentsService } from '../services/appointments.service';
import { usersService } from '../services/users.service';

interface KanbanBoardProps {
  appointments: Appointment[];
  onStatusChange: (appointmentId: string, newStatus: AppointmentStatus) => Promise<void>;
  onAttended: (appointmentId: string) => Promise<void>;
  showCancelled: boolean;
  isLoading?: boolean;
}

interface ColumnConfig {
  status: AppointmentStatus;
  label: string;
  icon: string;
  colorClass: string;
}

const FINAL_STATES: AppointmentStatus[] = [
  AppointmentStatus.attended,
  AppointmentStatus.cancelled,
  AppointmentStatus.no_show,
];

const COLUMNS: ColumnConfig[] = [
  { status: AppointmentStatus.reserved,    label: 'Reservada',   icon: '📅', colorClass: 'kanban-col-reserved'   },
  { status: AppointmentStatus.in_progress, label: 'En Atención', icon: '⏳', colorClass: 'kanban-col-progress'   },
  { status: AppointmentStatus.attended,    label: 'Atendida',    icon: '✅', colorClass: 'kanban-col-attended'   },
  { status: AppointmentStatus.no_show,     label: 'No asistió',  icon: '⚠️', colorClass: 'kanban-col-noshow'     },
  { status: AppointmentStatus.cancelled,   label: 'Cancelada',   icon: '❌', colorClass: 'kanban-col-cancelled'  },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  appointments,
  onStatusChange,
  onAttended,
  showCancelled,
  isLoading,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<AppointmentStatus | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Attend modal state
  const [pendingAttend, setPendingAttend] = useState<Appointment | null>(null);
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [selectedAttendees, setSelectedAttendees] = useState<Set<string>>(new Set());
  const [isSubmittingAttend, setIsSubmittingAttend] = useState(false);
  const [attendModalError, setAttendModalError] = useState<string | null>(null);

  useEffect(() => {
    usersService.getAllUsers({ isActive: true }).then(setStaffUsers).catch(() => {});
  }, []);

  const draggingAppointment = appointments.find(a => a.id === draggingId);

  const visibleColumns = showCancelled
    ? COLUMNS
    : COLUMNS.filter(c => c.status !== AppointmentStatus.cancelled && c.status !== AppointmentStatus.no_show);

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.status] = appointments.filter(a => a.status === col.status);
    return acc;
  }, {} as Record<AppointmentStatus, Appointment[]>);

  const getInitials = (firstName: string, lastName: string) =>
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  const isValidDrop = (targetStatus: AppointmentStatus): boolean => {
    if (!draggingAppointment) return false;
    if (draggingAppointment.status === targetStatus) return false;
    return canTransition(draggingAppointment.status, targetStatus, user?.role).allowed;
  };

  const getColumnDragClass = (targetStatus: AppointmentStatus): string => {
    if (!draggingId || dragOverColumn !== targetStatus) return '';
    return isValidDrop(targetStatus) ? 'drag-over-valid' : 'drag-over-invalid';
  };

  const handleDragStart = (e: React.DragEvent, appointmentId: string) => {
    const apt = appointments.find(a => a.id === appointmentId);
    if (apt && FINAL_STATES.includes(apt.status)) {
      e.preventDefault();
      return;
    }
    setDraggingId(appointmentId);
    setErrorMsg(null);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, targetStatus: AppointmentStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = isValidDrop(targetStatus) ? 'move' : 'none';
    setDragOverColumn(targetStatus);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const related = e.relatedTarget as Node | null;
    if (!(e.currentTarget as Node).contains(related)) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: AppointmentStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggingAppointment) return;
    if (draggingAppointment.status === targetStatus) {
      setDraggingId(null);
      return;
    }

    const result = canTransition(draggingAppointment.status, targetStatus, user?.role);
    if (!result.allowed) {
      setErrorMsg(result.reason || 'No se puede mover esta cita aquí');
      setDraggingId(null);
      return;
    }

    if (needsConfirmation(draggingAppointment.status, targetStatus)) {
      const msg =
        getConfirmationMessage(draggingAppointment.status, targetStatus) ||
        '¿Confirmas este cambio de estado?';
      if (!window.confirm(msg)) {
        setDraggingId(null);
        return;
      }
    }

    const idToUpdate = draggingAppointment.id;
    setDraggingId(null);

    // Attended requiere seleccionar asistentes — abre el modal
    if (targetStatus === AppointmentStatus.attended) {
      setSelectedAttendees(new Set());
      setAttendModalError(null);
      setPendingAttend(draggingAppointment);
      return;
    }

    try {
      await onStatusChange(idToUpdate, targetStatus);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Error al cambiar el estado');
    }
  };

  const handleAttendConfirm = async () => {
    if (!pendingAttend) return;
    if (selectedAttendees.size === 0) {
      setAttendModalError('Selecciona al menos un profesional');
      return;
    }
    setIsSubmittingAttend(true);
    setAttendModalError(null);
    try {
      for (const userId of selectedAttendees) {
        await appointmentsService.addAttendee(pendingAttend.id, userId);
      }
      await onAttended(pendingAttend.id);
      setPendingAttend(null);
    } catch (err: any) {
      setAttendModalError(err.response?.data?.error || err.message || 'Error al finalizar la atención');
    } finally {
      setIsSubmittingAttend(false);
    }
  };

  const toggleAttendee = (userId: string) => {
    setSelectedAttendees(prev => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="kanban-loading">
        <div className="kanban-loading-spinner" />
        <span>Cargando tablero...</span>
      </div>
    );
  }

  return (
    <div className="kanban-wrapper">
      {errorMsg && (
        <div className="kanban-error-banner">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 5v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span>{errorMsg}</span>
          <button className="kanban-error-close" onClick={() => setErrorMsg(null)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M11 3L3 11M3 3l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      )}

      <div className="kanban-hint">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M7 4v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Arrastra las tarjetas entre columnas para cambiar el estado de la cita
      </div>

      <div className="kanban-board">
        {visibleColumns.map(col => {
          const colCards = grouped[col.status] || [];
          const dragClass = getColumnDragClass(col.status);
          const isDraggingOverValid = dragClass === 'drag-over-valid';
          const isDraggingOverInvalid = dragClass === 'drag-over-invalid';

          return (
            <div
              key={col.status}
              className={`kanban-column ${col.colorClass} ${dragClass}`}
              onDragOver={e => handleDragOver(e, col.status)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, col.status)}
            >
              <div className="kanban-col-header">
                <span className="kanban-col-icon">{col.icon}</span>
                <span className="kanban-col-title">{col.label}</span>
                <span className="kanban-col-count">{colCards.length}</span>
              </div>

              <div className="kanban-col-body">
                {colCards.length === 0 && !isDraggingOverValid && (
                  <div className="kanban-col-empty">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                      <rect x="4" y="8" width="24" height="20" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M4 14h24" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M10 4v4M22 4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <span>Sin citas</span>
                  </div>
                )}

                {colCards.map(apt => {
                  const patient = apt.patient;
                  const scheduledDate = new Date(apt.scheduledDate);
                  const services = apt.appointmentServices
                    ?.map(as => as.serviceInstance?.service?.name)
                    .filter(Boolean) || [];
                  const isDragging  = apt.id === draggingId;
                  const isFinal    = FINAL_STATES.includes(apt.status);

                  return (
                    <div
                      key={apt.id}
                      className={`kanban-card ${isDragging ? 'is-dragging' : ''} ${isFinal ? 'kanban-card--final' : ''}`}
                      draggable={!isFinal}
                      onDragStart={e => handleDragStart(e, apt.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => !draggingId && navigate(`/appointments/${apt.id}`)}
                      title={isFinal ? 'Las citas en estado final no se pueden mover' : undefined}
                    >
                      <div className="kanban-card-top">
                        <div className="kanban-card-patient">
                          {patient && (
                            <div className="kanban-avatar">
                              {patient.photoUrl
                                ? <img src={patient.photoUrl} alt={`${patient.firstName} ${patient.lastName}`} />
                                : getInitials(patient.firstName, patient.lastName)}
                            </div>
                          )}
                          <div className="kanban-card-meta">
                            <p className="kanban-patient-name">
                              {patient
                                ? `${patient.firstName} ${patient.lastName}`
                                : 'Paciente'}
                            </p>
                            <p className="kanban-card-time">
                              {scheduledDate.toLocaleTimeString('es-PE', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {' · '}
                              {scheduledDate.toLocaleDateString('es-PE', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="kanban-drag-handle" title="Arrastrar">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <circle cx="5" cy="3" r="1.2" fill="currentColor"/>
                            <circle cx="9" cy="3" r="1.2" fill="currentColor"/>
                            <circle cx="5" cy="7" r="1.2" fill="currentColor"/>
                            <circle cx="9" cy="7" r="1.2" fill="currentColor"/>
                            <circle cx="5" cy="11" r="1.2" fill="currentColor"/>
                            <circle cx="9" cy="11" r="1.2" fill="currentColor"/>
                          </svg>
                        </div>
                      </div>

                      {services.length > 0 && (
                        <div className="kanban-card-services">
                          {services.slice(0, 2).map((s, i) => (
                            <span key={i} className="kanban-service-tag">{s}</span>
                          ))}
                          {services.length > 2 && (
                            <span className="kanban-service-tag kanban-service-more">
                              +{services.length - 2}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="kanban-card-footer">
                        <div className="kanban-duration">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M6 3v3l2 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                          {apt.durationMinutes} min
                        </div>
                        {apt.createdBy && (
                          <div className="kanban-created-by">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <circle cx="6" cy="4" r="2" stroke="currentColor" strokeWidth="1.5"/>
                              <path d="M2 10c0-1.5 1.5-2.5 4-2.5s4 1 4 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                            {apt.createdBy.firstName}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isDraggingOverValid && (
                  <div className="kanban-drop-zone">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Soltar aquí
                  </div>
                )}

                {isDraggingOverInvalid && (
                  <div className="kanban-drop-invalid">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M6 6l6 6M12 6l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    No permitido
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: selección de asistentes antes de marcar como atendida */}
      {pendingAttend && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setPendingAttend(null); }}
        >
          <div style={{
            background: 'var(--bg-card, #1e1e2e)', borderRadius: '16px',
            padding: '24px', maxWidth: '420px', width: '100%',
            boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
            border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--success-color, #4ade80)', flexShrink: 0 }}>
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Finalizar Atención</h3>
            </div>
            <p style={{ margin: '0 0 20px 30px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              {pendingAttend.patient
                ? `${pendingAttend.patient.firstName} ${pendingAttend.patient.lastName}`
                : 'Paciente'} · {new Date(pendingAttend.scheduledDate).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
            </p>

            {/* Selección de profesionales */}
            <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
              ¿Quiénes atendieron esta cita?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
              {staffUsers.map(u => {
                const checked = selectedAttendees.has(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => toggleAttendee(u.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 12px', borderRadius: '8px', border: 'none',
                      background: checked
                        ? 'var(--primary-color-alpha, rgba(99,102,241,0.15))'
                        : 'var(--bg-secondary, rgba(255,255,255,0.05))',
                      cursor: 'pointer', color: 'inherit', textAlign: 'left',
                      outline: checked ? '1.5px solid var(--primary-color, #6366f1)' : 'none',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: checked ? 'var(--primary-color, #6366f1)' : 'var(--bg-tertiary, rgba(255,255,255,0.1))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 600, color: checked ? '#fff' : 'var(--text-secondary)',
                      transition: 'all 0.15s',
                    }}>
                      {u.firstName[0]}{u.lastName[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>{u.firstName} {u.lastName}</p>
                    </div>
                    {checked && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--primary-color, #6366f1)', flexShrink: 0 }}>
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>

            {attendModalError && (
              <p style={{ margin: '12px 0 0', fontSize: '13px', color: 'var(--error-color, #f87171)', fontWeight: 500 }}>
                {attendModalError}
              </p>
            )}

            {/* Acciones */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setPendingAttend(null)}
                disabled={isSubmittingAttend}
                style={{
                  padding: '9px 16px', borderRadius: '8px', border: '1px solid var(--border-color, rgba(255,255,255,0.15))',
                  background: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '14px',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleAttendConfirm}
                disabled={isSubmittingAttend || selectedAttendees.size === 0}
                style={{
                  padding: '9px 20px', borderRadius: '8px', border: 'none',
                  background: selectedAttendees.size === 0 ? 'var(--bg-secondary, rgba(255,255,255,0.1))' : 'var(--primary-color, #6366f1)',
                  cursor: selectedAttendees.size === 0 ? 'not-allowed' : 'pointer',
                  color: selectedAttendees.size === 0 ? 'var(--text-secondary)' : '#fff',
                  fontSize: '14px', fontWeight: 600,
                  opacity: isSubmittingAttend ? 0.6 : 1,
                  transition: 'all 0.15s',
                }}
              >
                {isSubmittingAttend ? 'Guardando...' : 'Confirmar Atención'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

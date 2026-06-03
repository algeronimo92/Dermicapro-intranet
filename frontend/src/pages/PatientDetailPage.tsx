import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { patientsService } from '../services/patients.service';
import { Patient, Sex, Role, InvoiceStatus } from '../types';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';
import { Modal } from '../components/Modal';
import { CreatePatientModal } from '../components/CreatePatientModal';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, calculateAge } from '../utils/dateUtils';
import '../styles/patient-detail.css';

export const PatientDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (id) loadPatient(id);
  }, [id]);

  const loadPatient = async (patientId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await patientsService.getPatient(patientId);
      setPatient(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar paciente');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      setIsDeleting(true);
      await patientsService.deletePatient(id);
      navigate('/patients');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar paciente');
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) return <Loading text="Cargando información del paciente..." />;

  if (error || !patient) {
    return (
      <div className="page-container">
        <div className="error-banner">{error || 'Paciente no encontrado'}</div>
        <Button onClick={() => navigate('/patients')}>Volver</Button>
      </div>
    );
  }

  const sexLabels: Record<Sex, string> = { M: 'Masculino', F: 'Femenino', Other: 'Otro' };
  const canDelete = typeof user?.role === 'string'
    ? user.role === Role.admin
    : user?.role?.name === Role.admin;

  const age = calculateAge(patient.dateOfBirth);
  const allOrders = patient.orders || [];

  const activeOrders = allOrders.filter(order => {
    const done = order.appointmentServices?.length || 0;
    return done < order.totalSessions;
  });

  const completedOrders = allOrders.filter(order => {
    const done = order.appointmentServices?.length || 0;
    return done >= order.totalSessions;
  });

  const lastAppointment = allOrders
    .flatMap(o => (o.appointmentServices || []).map(as => as.appointment))
    .filter((a): a is NonNullable<typeof a> & { scheduledDate: string } => !!a?.scheduledDate)
    .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())
    .filter((a, i, arr) => arr.findIndex(x => x.id === a.id) === i)[0] ?? null;

  const lastAppointmentService = lastAppointment
    ? allOrders
        .flatMap(o => (o.appointmentServices || [])
          .filter(as => as.appointment?.id === lastAppointment.id)
          .map(() => o.service?.name))
        .filter(Boolean)
        .join(', ')
    : null;

  const uniqueInvoices = allOrders
    .filter(o => o.invoice)
    .map(o => o.invoice!)
    .filter((inv, i, arr) => arr.findIndex(x => x.id === inv.id) === i);

  const pendingInvoices = uniqueInvoices.filter(
    inv => inv.status === InvoiceStatus.pending || inv.status === InvoiceStatus.partial,
  );

  const totalPendingAmount = pendingInvoices.reduce((sum, inv) => {
    const paid = (inv.payments || []).reduce((s, p) => s + p.amountPaid, 0);
    return sum + ((inv.totalAmount ?? 0) - paid);
  }, 0);

  return (
    <div className="page-container">

      {/* ── BACK ── */}
      <button className="pd-back" onClick={() => navigate('/patients')}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Volver a Pacientes
      </button>

      {/* ── HERO ── */}
      <div className="pd-hero">
        {/* Avatar / Photo */}
        <div className="pd-avatar">
          {patient.photoUrl
            ? <img src={patient.photoUrl} alt={`${patient.firstName} ${patient.lastName}`} />
            : `${patient.firstName[0]}${patient.lastName[0]}`}
        </div>

        {/* Info */}
        <div className="pd-hero__info">
          <h1 className="pd-hero__name">
            {patient.firstName} {patient.lastName}
          </h1>
          <div className="pd-hero__chips">
            <span className="pd-chip">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="2" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M4 5h4M4 7.5h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              DNI: {patient.dni}
            </span>
            <span className="pd-chip">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 6.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1 11a5 5 0 0110 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {age} años
            </span>
            <span className="pd-chip">
              {sexLabels[patient.sex]}
            </span>
            {patient.phone && (
              <span className="pd-chip">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M10.5 8.5c0 .2-.05.39-.14.57-.1.18-.23.35-.4.5-.28.25-.58.37-.9.37-.23 0-.47-.05-.73-.16a7.8 7.8 0 01-.74-.39 12.2 12.2 0 01-.7-.56 12 12 0 01-.57-.7 7.8 7.8 0 01-.38-.73c-.1-.26-.16-.5-.16-.73 0-.22.05-.44.14-.64.1-.2.24-.38.44-.54L7.3 5c.18-.14.35-.21.5-.21.2 0 .4.1.58.3l.78.92c.18.2.27.38.27.55 0 .2-.07.4-.21.6l-.32.43c-.01.03-.01.06-.01.08 0 .05.02.1.05.17.07.14.19.31.36.5.17.19.34.36.53.5.17.14.3.23.42.28.06.03.1.04.14.04.03 0 .06-.01.08-.02l.43-.32c.2-.14.4-.21.6-.21.17 0 .35.09.55.27l.92.78c.2.18.3.38.3.58z" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
                {patient.phone}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="pd-hero__actions">
          <Button variant="primary" size="medium" onClick={() => setShowEditModal(true)}>
            Editar
          </Button>
          <Button variant="success" size="medium" onClick={() => navigate(`/appointments/new?patientId=${id}`)}>
            Nueva Cita
          </Button>
          {canDelete && (
            <Button variant="danger" size="medium" onClick={() => setShowDeleteModal(true)}>
              Eliminar
            </Button>
          )}
        </div>
      </div>

      {/* ── GRID DE CARDS ── */}
      <div className="pd-grid">

        {/* CARD 1 — Información de Contacto */}
        <div className="pd-card">
          <div className="pd-card__header">
            <h2 className="pd-card__title">
              <span className="pd-card__icon pd-card__icon--teal">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 8a3 3 0 100-6 3 3 0 000 6zM2 14a6 6 0 0112 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </span>
              Contacto
            </h2>
          </div>
          <div className="pd-card__body">
            <div className="pd-info-list">
              <div className="pd-info-row">
                <span className="pd-info-label">Teléfono</span>
                <span className="pd-info-value">
                  {patient.phone
                    ? <a href={`tel:${patient.phone}`} className="pd-info-link">{patient.phone}</a>
                    : <span className="pd-info-empty">No registrado</span>}
                </span>
              </div>
              <div className="pd-info-row">
                <span className="pd-info-label">Email</span>
                <span className="pd-info-value">
                  {patient.email
                    ? <a href={`mailto:${patient.email}`} className="pd-info-link">{patient.email}</a>
                    : <span className="pd-info-empty">No registrado</span>}
                </span>
              </div>
              <div className="pd-info-row">
                <span className="pd-info-label">Fecha de Nacimiento</span>
                <span className="pd-info-value">{formatDate(patient.dateOfBirth)}</span>
              </div>
              <div className="pd-info-row">
                <span className="pd-info-label">Dirección</span>
                <span className="pd-info-value">
                  {patient.address || <span className="pd-info-empty">No registrada</span>}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2 — Última Atención */}
        <div className="pd-card">
          <div className="pd-card__header">
            <h2 className="pd-card__title">
              <span className="pd-card__icon pd-card__icon--purple">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M5 1v2M11 1v2M2 6h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </span>
              Última Atención
            </h2>
          </div>
          <div className="pd-card__body">
            {lastAppointment ? (
              <>
                <div className="pd-last-apt">
                  <div className="pd-last-apt__date">
                    {formatDate(lastAppointment.scheduledDate!)}
                  </div>
                  {lastAppointmentService && (
                    <div className="pd-last-apt__service">{lastAppointmentService}</div>
                  )}
                </div>
                <div className="pd-stats">
                  <div className="pd-stat">
                    <span className="pd-stat__number">{allOrders.length}</span>
                    <span className="pd-stat__label">Total</span>
                  </div>
                  <div className="pd-stat">
                    <span className="pd-stat__number">{activeOrders.length}</span>
                    <span className="pd-stat__label">Activos</span>
                  </div>
                  <div className="pd-stat">
                    <span className="pd-stat__number">{completedOrders.length}</span>
                    <span className="pd-stat__label">Completos</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="pd-empty">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <rect x="5" y="5" width="30" height="30" rx="3" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3"/>
                  <path d="M13 18h14M13 24h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <p>Sin atenciones registradas</p>
                <Button variant="primary" size="small" onClick={() => navigate(`/appointments/new?patientId=${id}`)}>
                  Agendar Primera Cita
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* CARD 3 — Tratamientos Activos */}
        <div className="pd-card">
          <div className="pd-card__header">
            <h2 className="pd-card__title">
              <span className="pd-card__icon pd-card__icon--teal">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </span>
              Tratamientos Activos
            </h2>
            {activeOrders.length > 0 && (
              <span className="pd-chip">{activeOrders.length}</span>
            )}
          </div>
          <div className="pd-card__body">
            {activeOrders.length > 0 ? (
              <div className="pd-treatment-list">
                {activeOrders.slice(0, 4).map(order => {
                  const done = order.appointmentServices?.length || 0;
                  const pct = order.totalSessions > 0 ? Math.round((done / order.totalSessions) * 100) : 0;
                  return (
                    <div key={order.id} className="pd-treatment">
                      <div className="pd-treatment__header">
                        <h3 className="pd-treatment__name">{order.service?.name || 'Servicio'}</h3>
                        <span className="pd-treatment__sessions">{done}/{order.totalSessions}</span>
                      </div>
                      <div className="pd-progress">
                        <div className="pd-progress__track">
                          <div className="pd-progress__fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="pd-progress__pct">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
                {activeOrders.length > 4 && (
                  <button className="pd-view-all" onClick={() => navigate(`/patients/${id}/history`)}>
                    Ver todos ({activeOrders.length}) →
                  </button>
                )}
              </div>
            ) : (
              <div className="pd-empty">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="20" r="15" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3"/>
                  <path d="M14 20h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <p>Sin tratamientos activos</p>
              </div>
            )}
          </div>
        </div>

        {/* CARD 4 — Tratamientos Completados */}
        <div className="pd-card">
          <div className="pd-card__header">
            <h2 className="pd-card__title">
              <span className="pd-card__icon pd-card__icon--green">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              Completados
            </h2>
            {completedOrders.length > 0 && (
              <span className="pd-chip">{completedOrders.length}</span>
            )}
          </div>
          <div className="pd-card__body">
            {completedOrders.length > 0 ? (
              <div className="pd-completed-list">
                {completedOrders.slice(0, 4).map(order => (
                  <div key={order.id} className="pd-completed">
                    <div className="pd-completed__check">✓</div>
                    <div>
                      <div className="pd-completed__name">{order.service?.name || 'Servicio'}</div>
                      <div className="pd-completed__sessions">{order.totalSessions} sesiones</div>
                    </div>
                  </div>
                ))}
                {completedOrders.length > 4 && (
                  <button className="pd-view-all" onClick={() => navigate(`/patients/${id}/history`)}>
                    Ver todos ({completedOrders.length}) →
                  </button>
                )}
              </div>
            ) : (
              <div className="pd-empty">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="20" r="15" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3"/>
                  <path d="M13 20l5 5 9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p>Sin tratamientos completados</p>
              </div>
            )}
          </div>
        </div>

        {/* CARD 5 — Facturas Pendientes */}
        <div className="pd-card">
          <div className="pd-card__header">
            <h2 className="pd-card__title">
              <span className="pd-card__icon pd-card__icon--amber">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M1 7h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </span>
              Facturas Pendientes
            </h2>
            {pendingInvoices.length > 0 && (
              <span className="pd-card__badge">{pendingInvoices.length}</span>
            )}
          </div>
          <div className="pd-card__body">
            {pendingInvoices.length > 0 ? (
              <>
                <div className="pd-pending-total">
                  <span className="pd-pending-total__label">Total pendiente</span>
                  <span className="pd-pending-total__amount">S/ {totalPendingAmount.toFixed(2)}</span>
                </div>
                <div className="pd-invoice-list">
                  {pendingInvoices.slice(0, 3).map(inv => {
                    const paid = (inv.payments || []).reduce((s, p) => s + p.amountPaid, 0);
                    const remaining = (inv.totalAmount ?? 0) - paid;
                    return (
                      <div key={inv.id} className="pd-invoice">
                        <div>
                          <div className="pd-invoice__date">{inv.createdAt ? formatDate(inv.createdAt) : ''}</div>
                          <span className={`pd-invoice__status pd-invoice__status--${inv.status}`}>
                            {inv.status === InvoiceStatus.pending ? 'Pendiente' : 'Pago parcial'}
                          </span>
                        </div>
                        <span className="pd-invoice__amount">S/ {remaining.toFixed(2)}</span>
                      </div>
                    );
                  })}
                  {pendingInvoices.length > 3 && (
                    <button className="pd-view-all" onClick={() => navigate(`/patients/${id}/invoices`)}>
                      Ver todas ({pendingInvoices.length}) →
                    </button>
                  )}
                </div>
                <Button variant="primary" size="medium" onClick={() => navigate(`/patients/${id}/invoices`)} style={{ width: '100%' }}>
                  Gestionar Pagos
                </Button>
              </>
            ) : (
              <div className="pd-empty">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="20" r="15" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3"/>
                  <path d="M13 20l5 5 9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p>Sin facturas pendientes</p>
              </div>
            )}
          </div>
        </div>

        {/* CARD 6 — Acciones Rápidas */}
        <div className="pd-card">
          <div className="pd-card__header">
            <h2 className="pd-card__title">
              <span className="pd-card__icon pd-card__icon--teal">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1L10 6h5L11 9l2 5-5-3-5 3 2-5L1 6h5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
              </span>
              Acciones Rápidas
            </h2>
          </div>
          <div className="pd-card__body">
            <div className="pd-actions-grid">
              <button className="pd-action" onClick={() => navigate(`/patients/${id}/history`)}>
                <span className="pd-action__icon">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M9 2a7 7 0 100 14A7 7 0 009 2zM9 5v4l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                <div>
                  <p className="pd-action__title">Historial Médico</p>
                  <p className="pd-action__desc">Ver registros y evolución</p>
                </div>
              </button>

              <button className="pd-action" onClick={() => navigate(`/patients/${id}/invoices`)}>
                <span className="pd-action__icon">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect x="3" y="2" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
                    <path d="M6 6h6M6 9h6M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </span>
                <div>
                  <p className="pd-action__title">Facturación</p>
                  <p className="pd-action__desc">Facturas y pagos</p>
                </div>
              </button>

              <button className="pd-action" onClick={() => navigate(`/appointments/new?patientId=${id}`)}>
                <span className="pd-action__icon">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect x="2" y="3" width="14" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
                    <path d="M2 8h14M6 1v3M12 1v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </span>
                <div>
                  <p className="pd-action__title">Nueva Cita</p>
                  <p className="pd-action__desc">Agendar próxima sesión</p>
                </div>
              </button>

              <button className="pd-action" onClick={() => setShowEditModal(true)}>
                <span className="pd-action__icon">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M13 2.5a1.77 1.77 0 112.5 2.5L5.5 15.5l-3 .5.5-3L13 2.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                <div>
                  <p className="pd-action__title">Editar Datos</p>
                  <p className="pd-action__desc">Actualizar información</p>
                </div>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ── MODAL EDITAR ── */}
      <CreatePatientModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onUpdated={(updated) => {
          setPatient(prev => prev ? { ...prev, ...updated } : updated);
          setShowEditModal(false);
        }}
        patientId={id}
      />

      {/* ── MODAL ELIMINAR ── */}
      {showDeleteModal && (
        <Modal isOpen={showDeleteModal} title="Confirmar Eliminación" onClose={() => setShowDeleteModal(false)}>
          <div style={{ padding: '4px 0' }}>
            <p style={{ marginBottom: '12px', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              ¿Estás seguro que deseas eliminar a{' '}
              <strong style={{ color: 'var(--color-text-primary)' }}>
                {patient.firstName} {patient.lastName}
              </strong>?
            </p>
            <p style={{ marginBottom: '24px', color: 'var(--color-error)', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
              Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

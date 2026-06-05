import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { patientsService } from '../services/patients.service';
import { Patient, Sex, Role, InvoiceStatus, CreditTransaction, PaymentType, AppointmentStatus } from '../types';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';
import { Modal } from '../components/Modal';
import { CreatePatientModal } from '../components/CreatePatientModal';
import { AddCreditModal } from '../components/AddCreditModal';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, calculateAge } from '../utils/dateUtils';
import { creditsService } from '../services/credits.service';
import '../styles/patient-detail.css';

// ── WhatsApp helper ──────────────────────────────────────────────────────────
const buildWaUrl = (phone: string, firstName: string) => {
  const digits = phone.replace(/\D/g, '');
  const number = digits.startsWith('51') ? digits : `51${digits}`;
  const msg = encodeURIComponent(`Hola ${firstName}, le contactamos desde DermicaPro.`);
  return `https://wa.me/${number}?text=${msg}`;
};

// ── Icon helpers (inline SVG, no extra deps) ─────────────────────────────────
const IconWhatsApp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export const PatientDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [patient, setPatient]                     = useState<Patient | null>(null);
  const [isLoading, setIsLoading]                 = useState(true);
  const [error, setError]                         = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal]     = useState(false);
  const [isDeleting, setIsDeleting]               = useState(false);
  const [showEditModal, setShowEditModal]         = useState(false);
  const [showAddCreditModal, setShowAddCreditModal] = useState(false);
  const [accountBalance, setAccountBalance]         = useState(0);
  const [creditHistory, setCreditHistory]           = useState<CreditTransaction[]>([]);
  const [concludingOrderId, setConcludingOrderId]   = useState<string | null>(null);
  const [concludeReason, setConcludeReason]         = useState('');
  const [isConcluding, setIsConcluding]             = useState(false);

  useEffect(() => { if (id) loadPatient(id); }, [id]);

  const loadPatient = async (patientId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const [data, creditData] = await Promise.all([
        patientsService.getPatient(patientId),
        creditsService.getCreditHistory(patientId),
      ]);
      setPatient(data);
      setAccountBalance(creditData.accountBalance);
      setCreditHistory(creditData.credits);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar paciente');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConclude = async () => {
    if (!id || !concludingOrderId) return;
    try {
      setIsConcluding(true);
      await patientsService.concludeOrder(id, concludingOrderId, concludeReason.trim() || undefined);
      setConcludingOrderId(null);
      setConcludeReason('');
      await loadPatient(id);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al concluir tratamiento');
    } finally {
      setIsConcluding(false);
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

  // ── Computed values ────────────────────────────────────────────────────────
  const sexLabels: Record<Sex, string> = { M: 'Masculino', F: 'Femenino', Other: 'Otro' };
  const sexIcons:  Record<Sex, string> = { M: '♂', F: '♀', Other: '⚧' };

  const canDelete = typeof user?.role === 'string'
    ? user.role === Role.admin
    : user?.role?.name === Role.admin;

  const age       = calculateAge(patient.dateOfBirth);
  const allOrders = patient.orders || [];

  const countAttended = (o: typeof allOrders[0]) =>
    (o.appointmentServices || []).filter(as => as.appointment?.status === AppointmentStatus.attended).length;

  const activeOrders    = allOrders.filter(o => !o.concludedAt && countAttended(o) < o.totalSessions);
  const completedOrders = allOrders.filter(o => o.concludedAt || countAttended(o) >= o.totalSessions);

  // Todas las citas únicas con su estado
  const allApts = allOrders
    .flatMap(o => (o.appointmentServices || []).map(as => ({
      apt: as.appointment,
      serviceName: o.service?.name ?? 'Servicio',
    })))
    .filter(x => !!x.apt?.scheduledDate)
    .filter((x, i, arr) => arr.findIndex(y => y.apt?.id === x.apt?.id) === i);

  // Cita actualmente en curso (in_progress) — puede ser de hoy con hora pasada
  const currentInProgress = allApts
    .filter(x => x.apt?.status === AppointmentStatus.in_progress)[0] ?? null;

  // Última cita ATENDIDA (completada)
  const lastAttended = allApts
    .filter(x => x.apt?.status === AppointmentStatus.attended)
    .sort((a, b) => new Date(b.apt!.scheduledDate!).getTime() - new Date(a.apt!.scheduledDate!).getTime())[0] ?? null;

  // Próxima cita RESERVADA (futura)
  const nextReserved = allApts
    .filter(x => x.apt?.status === AppointmentStatus.reserved)
    .sort((a, b) => new Date(a.apt!.scheduledDate!).getTime() - new Date(b.apt!.scheduledDate!).getTime())[0] ?? null;

  // Bloqueo de nueva cita — el paciente ya tiene una cita activa
  const hasActivePendingApt = !!(currentInProgress || nextReserved);

  const uniqueInvoices = allOrders
    .filter(o => o.invoice)
    .map(o => o.invoice!)
    .filter((inv, i, arr) => arr.findIndex(x => x.id === inv.id) === i);

  const pendingInvoices = uniqueInvoices.filter(
    inv => inv.status === InvoiceStatus.pending || inv.status === InvoiceStatus.partial
  );

  const totalPendingInvoiced = pendingInvoices.reduce((sum, inv) => {
    const paid = (inv.payments || []).reduce((s, p) => s + Number(p.amountPaid), 0);
    return sum + (Number(inv.totalAmount ?? 0) - paid);
  }, 0);

  // Órdenes que aún no tienen factura generada
  const uninvoicedOrders = allOrders.filter(o => !o.invoice);
  const totalUninvoiced   = uninvoicedOrders.reduce((sum, o) => sum + Number(o.finalPrice ?? 0), 0);

  // Deuda total = facturas pendientes + órdenes sin facturar
  const totalPendingAmount = totalPendingInvoiced + totalUninvoiced;

  const totalPaid = uniqueInvoices.reduce((sum, inv) => {
    return sum + (inv.payments || []).reduce((s, p) => s + Number(p.amountPaid), 0);
  }, 0);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="page-container">

      {/* ══ BACK ════════════════════════════════════════════════════════════ */}
      <button className="pd-back" onClick={() => navigate('/patients')}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Pacientes
      </button>

      {/* ══ HERO ════════════════════════════════════════════════════════════ */}
      <div className="pd-hero">
        <div className="pd-avatar">
          {patient.photoUrl
            ? <img src={patient.photoUrl} alt={`${patient.firstName} ${patient.lastName}`} />
            : `${patient.firstName[0]}${patient.lastName[0]}`}
        </div>

        <div className="pd-hero__info">
          <h1 className="pd-hero__name">{patient.firstName} {patient.lastName}</h1>
          <div className="pd-hero__chips">
            <span className="pd-chip">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="2" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M4 5h4M4 7.5h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              {patient.dni}
            </span>
            <span className="pd-chip">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M1 11a5 5 0 0110 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {age} años
            </span>
            <span className="pd-chip">{sexIcons[patient.sex]} {sexLabels[patient.sex]}</span>
            {patient.phone && (
              <span className="pd-chip">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path d="M10.5 8.5c-.1.18-.23.35-.4.5-.28.25-.58.37-.9.37-.23 0-.47-.05-.73-.16a7.8 7.8 0 01-.74-.39 12.2 12.2 0 01-.7-.56 12 12 0 01-.57-.7 7.8 7.8 0 01-.38-.73c-.1-.26-.16-.5-.16-.73 0-.22.05-.44.14-.64.1-.2.24-.38.44-.54L7.3 5c.18-.14.35-.21.5-.21.2 0 .4.1.58.3l.78.92c.18.2.27.38.27.55 0 .2-.07.4-.21.6l-.32.43c0 .03-.01.06-.01.08 0 .05.02.1.05.17.07.14.19.31.36.5.17.19.34.36.53.5.17.14.3.23.42.28.06.03.1.04.14.04.03 0 .06-.01.08-.02l.43-.32c.2-.14.4-.21.6-.21.17 0 .35.09.55.27l.92.78c.2.18.3.38.3.58z" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
                {patient.phone}
              </span>
            )}
          </div>
        </div>

        <div className="pd-hero__actions">
          {/* WhatsApp — acción principal de contacto */}
          {patient.phone && (
            <a
              href={buildWaUrl(patient.phone, patient.firstName)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '8px 16px', borderRadius: 'var(--radius-lg)',
                background: '#25D366', color: '#fff',
                fontWeight: 700, fontSize: 'var(--font-size-sm)',
                textDecoration: 'none', fontFamily: 'inherit',
                boxShadow: 'var(--shadow-sm)',
                transition: 'filter var(--transition-fast)',
              }}
              onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
              onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
            >
              <IconWhatsApp />
              WhatsApp
            </a>
          )}
          {hasActivePendingApt ? (
            <div title={currentInProgress ? 'Tiene una cita en atención actualmente' : 'Ya tiene una cita reservada'} style={{ position: 'relative' }}>
              <button disabled style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 'var(--radius-lg)',
                background: 'var(--color-bg-tertiary)', color: 'var(--color-text-disabled)',
                border: '1.5px solid var(--color-border-secondary)',
                fontSize: 'var(--font-size-sm)', fontWeight: 700,
                cursor: 'not-allowed', fontFamily: 'inherit',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Cita ya agendada
              </button>
            </div>
          ) : (
            <Button variant="primary" size="medium" onClick={() => navigate(`/appointments/new?patientId=${id}`)}>+ Nueva Cita</Button>
          )}
          <Button variant="secondary" size="medium" onClick={() => setShowEditModal(true)}>Editar</Button>
          {canDelete && (
            <button
              onClick={() => setShowDeleteModal(true)}
              title="Eliminar paciente"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '7px 12px', borderRadius: 'var(--radius-lg)',
                background: 'transparent',
                border: '1.5px solid var(--color-border-primary)',
                color: 'var(--color-text-tertiary)',
                fontSize: 'var(--font-size-xs)', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--color-error)';
                e.currentTarget.style.color = 'var(--color-error)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--color-border-primary)';
                e.currentTarget.style.color = 'var(--color-text-tertiary)';
              }}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Eliminar
            </button>
          )}
        </div>
      </div>

      {/* ══ STRIP FINANCIERO ════════════════════════════════════════════════ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 'var(--spacing-md)',
        marginBottom: 'var(--spacing-xl)',
      }}>
        {/* Deuda pendiente */}
        <div style={{
          background: totalPendingAmount > 0 ? 'var(--color-error-alpha-10)' : 'var(--color-success-alpha-10)',
          border: `1.5px solid ${totalPendingAmount > 0 ? 'var(--color-error-light)' : 'var(--color-success)'}`,
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--spacing-lg)',
          boxShadow: 'var(--shadow-sm)',
          cursor: totalPendingAmount > 0 ? 'pointer' : 'default',
          transition: 'box-shadow var(--transition-fast)',
        }}
          onClick={() => totalPendingAmount > 0 && navigate(`/patients/${id}/invoices`)}
          onMouseEnter={e => totalPendingAmount > 0 && (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow-sm)')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
            <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: totalPendingAmount > 0 ? 'var(--color-error)' : 'var(--color-success-dark)' }}>
              Deuda pendiente
            </div>
            <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-lg)', background: totalPendingAmount > 0 ? 'var(--color-error-alpha-10)' : 'var(--color-success-alpha-10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {totalPendingAmount > 0 ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="var(--color-error)" strokeWidth="1.6"/>
                  <path d="M1 7h14" stroke="var(--color-error)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="var(--color-success)" strokeWidth="1.6"/>
                  <path d="M5 8l2 2 4-4" stroke="var(--color-success)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          </div>
          {totalPendingAmount > 0 ? (
            <>
              <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-error)', lineHeight: 1 }}>
                S/. {totalPendingAmount.toFixed(2)}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-error)', marginTop: 6, fontWeight: 600 }}>
                {pendingInvoices.length} factura{pendingInvoices.length !== 1 ? 's' : ''} · clic para gestionar →
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--color-success-dark)', lineHeight: 1 }}>
                Al día ✓
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-success-dark)', marginTop: 6, fontWeight: 600 }}>
                Sin deuda pendiente
              </div>
            </>
          )}
        </div>

        {/* Total pagado */}
        <div style={{
          background: totalPaid > 0 ? 'var(--color-success-alpha-10)' : 'var(--color-bg-primary)',
          border: `1.5px solid ${totalPaid > 0 ? 'var(--color-success)' : 'var(--color-border-secondary)'}`,
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--spacing-lg)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
            <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: totalPaid > 0 ? 'var(--color-success-dark)' : 'var(--color-text-tertiary)' }}>
              Total pagado
            </div>
            <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-lg)', background: totalPaid > 0 ? 'var(--color-success-alpha-10)' : 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke={totalPaid > 0 ? 'var(--color-success)' : 'var(--color-text-tertiary)'} strokeWidth="1.6"/>
                <path d="M5 8l2 2 4-4" stroke={totalPaid > 0 ? 'var(--color-success)' : 'var(--color-text-tertiary)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: totalPaid > 0 ? 'var(--color-success-dark)' : 'var(--color-text-disabled)', lineHeight: 1 }}>
            S/. {totalPaid.toFixed(2)}
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 6 }}>
            {uniqueInvoices.length} factura{uniqueInvoices.length !== 1 ? 's' : ''} en total
          </div>
        </div>

        {/* Saldo a favor */}
        <div style={{
          background: accountBalance > 0 ? 'var(--color-primary-alpha-10)' : 'var(--color-bg-primary)',
          border: `1.5px solid ${accountBalance > 0 ? 'var(--color-primary)' : 'var(--color-border-secondary)'}`,
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--spacing-lg)',
          boxShadow: 'var(--shadow-sm)',
          cursor: 'pointer',
          position: 'relative' as const,
        }}
          onClick={() => setShowAddCreditModal(true)}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
            <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: accountBalance > 0 ? 'var(--color-primary)' : 'var(--color-text-tertiary)' }}>
              Saldo a favor
            </div>
            <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-lg)', background: accountBalance > 0 ? 'var(--color-primary-alpha-10)' : 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="3" width="14" height="10" rx="1.5" stroke={accountBalance > 0 ? 'var(--color-primary)' : 'var(--color-text-tertiary)'} strokeWidth="1.6"/>
                <path d="M5 8h6M8 6v4" stroke={accountBalance > 0 ? 'var(--color-primary)' : 'var(--color-text-tertiary)'} strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: accountBalance > 0 ? 'var(--color-primary)' : 'var(--color-text-disabled)', lineHeight: 1 }}>
            S/. {accountBalance.toFixed(2)}
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: accountBalance > 0 ? 'var(--color-primary)' : 'var(--color-text-tertiary)', marginTop: 6, fontWeight: accountBalance > 0 ? 600 : 400 }}>
            {accountBalance > 0 ? 'Clic para agregar más' : 'Clic para agregar saldo'}
          </div>
        </div>
      </div>

      {/* ══ GRID DE CARDS ═══════════════════════════════════════════════════ */}
      <div className="pd-grid">

        {/* ── COLUMNA IZQUIERDA ──────────────────────────────────────────── */}

        {/* CARD — Contacto */}
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

              {/* Teléfono + WhatsApp */}
              <div className="pd-info-row">
                <span className="pd-info-label">Teléfono</span>
                {patient.phone ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                    <span className="pd-info-value" style={{ flex: 1, minWidth: 0 }}>{patient.phone}</span>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <a href={`tel:${patient.phone}`}
                        title="Llamar"
                        style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 30, height: 30, borderRadius: 'var(--radius-md)',
                          background: 'var(--color-primary-alpha-10)',
                          border: '1.5px solid var(--color-border-primary)',
                          color: 'var(--color-primary)', textDecoration: 'none',
                          transition: 'background var(--transition-fast)',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-primary-alpha-20)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-primary-alpha-10)')}
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M14 10.67c0 .27-.06.53-.19.77-.13.25-.31.48-.54.67-.38.33-.79.5-1.22.5-.31 0-.64-.07-.99-.21a10.6 10.6 0 01-1.01-.54 16.6 16.6 0 01-.95-.76 16.3 16.3 0 01-.77-.95 10.6 10.6 0 01-.52-1c-.14-.35-.21-.68-.21-1 0-.3.06-.6.19-.87.13-.27.33-.52.6-.73l.8-.59c.24-.19.47-.29.68-.29.27 0 .54.14.79.41l1.06 1.25c.25.27.37.52.37.75 0 .27-.09.54-.29.81l-.44.59c-.01.04-.02.08-.02.11 0 .07.03.14.07.23.09.19.26.42.48.67.23.26.46.49.71.68.23.19.41.31.57.38.08.04.14.06.2.06.04 0 .08-.02.11-.03l.58-.43c.27-.19.54-.28.81-.28.23 0 .47.12.74.37l1.25 1.06c.27.24.41.51.41.79z" stroke="currentColor" strokeWidth="1.5"/>
                        </svg>
                      </a>
                      <a href={buildWaUrl(patient.phone, patient.firstName)}
                        target="_blank" rel="noopener noreferrer"
                        title="Enviar WhatsApp"
                        style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 30, height: 30, borderRadius: 'var(--radius-md)',
                          background: 'rgba(37,211,102,0.12)',
                          border: '1.5px solid rgba(37,211,102,0.35)',
                          color: '#25D366', textDecoration: 'none',
                          transition: 'background var(--transition-fast)',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,211,102,0.22)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(37,211,102,0.12)')}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </a>
                    </div>
                  </div>
                ) : (
                  <span className="pd-info-empty">No registrado</span>
                )}
              </div>

              <div className="pd-info-row">
                <span className="pd-info-label">Email</span>
                <span className="pd-info-value">
                  {patient.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patient.email)
                    ? <a href={`mailto:${patient.email}`} className="pd-info-link">{patient.email}</a>
                    : patient.email
                      ? <span style={{ color: 'var(--color-text-primary)' }}>{patient.email}</span>
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

        {/* CARD — Cobros Pendientes (facturas sin pagar + órdenes sin facturar) */}
        <div className="pd-card">
          <div className="pd-card__header">
            <h2 className="pd-card__title">
              <span className="pd-card__icon pd-card__icon--amber">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M1 7h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </span>
              Cobros Pendientes
            </h2>
            {(pendingInvoices.length + uninvoicedOrders.length) > 0 && (
              <span className="pd-card__badge">{pendingInvoices.length + uninvoicedOrders.length}</span>
            )}
          </div>
          <div className="pd-card__body">
            {(pendingInvoices.length + uninvoicedOrders.length) > 0 ? (
              <>
                <div className="pd-invoice-list" style={{ marginBottom: 'var(--spacing-md)' }}>

                  {/* Facturas creadas pero sin pagar */}
                  {pendingInvoices.slice(0, 3).map(inv => {
                    const paid      = (inv.payments || []).reduce((s, p) => s + Number(p.amountPaid), 0);
                    const remaining = Number(inv.totalAmount ?? 0) - paid;
                    const pct       = Number(inv.totalAmount) > 0 ? Math.round((paid / Number(inv.totalAmount)) * 100) : 0;
                    return (
                      <div key={inv.id} className="pd-invoice"
                        style={{ cursor: 'pointer', flexDirection: 'column', gap: 6, alignItems: 'stretch' }}
                        onClick={() => navigate(`/invoices/${inv.id}`)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 2 }}>
                              Factura #{(inv.id ?? '').slice(0, 8).toUpperCase()} · {inv.createdAt ? formatDate(inv.createdAt) : ''}
                            </div>
                            <span className={`pd-invoice__status pd-invoice__status--${inv.status}`}>
                              {inv.status === InvoiceStatus.pending ? 'Sin pagar' : 'Pago parcial'}
                            </span>
                          </div>
                          <span className="pd-invoice__amount">S/. {remaining.toFixed(2)}</span>
                        </div>
                        <div style={{ height: 4, background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-warning)', borderRadius: 'var(--radius-full)' }} />
                        </div>
                      </div>
                    );
                  })}

                  {/* Órdenes sin facturar */}
                  {uninvoicedOrders.slice(0, 3).map(order => (
                    <div key={order.id} className="pd-invoice"
                      style={{ cursor: 'pointer', flexDirection: 'column', gap: 4, alignItems: 'stretch', borderLeft: '3px solid var(--color-warning)' }}
                      onClick={() => navigate(`/patients/${id}/invoices`)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 2 }}>
                            {order.service?.name || 'Servicio'} · {order.totalSessions} sesión{order.totalSessions !== 1 ? 'es' : ''}
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 'var(--radius-full)', background: 'var(--color-warning-alpha-10)', color: 'var(--color-warning-dark)', border: '1px solid var(--color-warning)' }}>
                            Sin facturar
                          </span>
                        </div>
                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-warning-dark)' }}>
                          S/. {Number(order.finalPrice ?? 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}

                  {(pendingInvoices.length + uninvoicedOrders.length) > 6 && (
                    <button className="pd-view-all" onClick={() => navigate(`/patients/${id}/invoices`)}>
                      Ver todas →
                    </button>
                  )}
                </div>
                <Button variant="primary" size="medium" onClick={() => navigate(`/patients/${id}/invoices`)} style={{ width: '100%' }}>
                  Gestionar Cobros
                </Button>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 'var(--spacing-md)', background: 'var(--color-success-alpha-10)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-success)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: 'var(--color-success)' }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-success-dark)' }}>Sin cobros pendientes</span>
              </div>
            )}
          </div>
        </div>

        {/* CARD — Citas (última atendida + próxima) */}
        <div className="pd-card">
          <div className="pd-card__header">
            <h2 className="pd-card__title">
              <span className="pd-card__icon pd-card__icon--purple">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M5 1v2M11 1v2M2 6h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </span>
              Citas
            </h2>
            <button className="pd-view-all" style={{ padding: 0, margin: 0, width: 'auto' }}
              onClick={() => navigate(`/patients/${id}/history`)}>
              Ver historial →
            </button>
          </div>
          <div className="pd-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>

            {/* ── En atención AHORA (banner prominente) ── */}
            {currentInProgress && (
              <div style={{
                background: 'var(--color-warning-alpha-10)',
                border: '1.5px solid var(--color-warning)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-warning)', animation: 'pulse-bar 1.4s ease-in-out infinite', flexShrink: 0 }} />
                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-warning)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>En atención ahora</span>
                  </div>
                  <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>{currentInProgress.serviceName}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{formatDate(currentInProgress.apt!.scheduledDate!)}</div>
                </div>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-warning)', flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}

            {/* ── Última atención (attended) ── */}
            <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)', marginTop: currentInProgress ? 'var(--spacing-xs)' : 0 }}>
              Última atención
            </div>
            {lastAttended ? (
              <div className="pd-last-apt" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div className="pd-last-apt__date">{formatDate(lastAttended.apt!.scheduledDate!)}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--color-success-alpha-10)', color: 'var(--color-success-dark)', border: '1px solid var(--color-success)', flexShrink: 0 }}>
                    Atendida ✓
                  </span>
                </div>
                <div className="pd-last-apt__service">{lastAttended.serviceName}</div>
              </div>
            ) : (
              <div style={{ padding: 'var(--spacing-sm) var(--spacing-md)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                  Sin atenciones completadas aún
                </span>
              </div>
            )}

            {/* ── Próxima cita reservada ── */}
            <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)', marginTop: 'var(--spacing-xs)' }}>
              Próxima cita
            </div>
            {nextReserved ? (
              <div className="pd-last-apt" style={{ marginBottom: 0, background: 'var(--color-primary-alpha-10)', borderLeft: '3px solid var(--color-primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div className="pd-last-apt__date">{formatDate(nextReserved.apt!.scheduledDate!)}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--color-primary-alpha-10)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', flexShrink: 0 }}>
                    ● Reservada
                  </span>
                </div>
                <div className="pd-last-apt__service">{nextReserved.serviceName}</div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--spacing-sm) var(--spacing-md)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>Sin citas agendadas</span>
                <button className="pd-view-all" style={{ padding: 0, width: 'auto', fontSize: 11 }}
                  onClick={() => navigate(`/appointments/new?patientId=${id}`)}>+ Agendar →</button>
              </div>
            )}
          </div>
        </div>

        {/* CARD — Movimientos de Saldo */}
        <div className="pd-card">
          <div className="pd-card__header">
            <h2 className="pd-card__title">
              <span className="pd-card__icon pd-card__icon--teal">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M8 4.5V8l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              Movimientos de Saldo
            </h2>
            <button
              onClick={() => setShowAddCreditModal(true)}
              className="btn-icon btn-primary"
              title="Agregar saldo"
              style={{ width: 30, height: 30, borderRadius: 'var(--radius-md)', fontSize: 18 }}
            >+</button>
          </div>
          <div className="pd-card__body">
            {creditHistory.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                {creditHistory.slice(0, 5).map(tx => {
                  const isCredit = tx.paymentType === PaymentType.account_credit;
                  return (
                    <div key={tx.id} style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)',
                      padding: '8px 12px', background: 'var(--color-bg-secondary)',
                      borderRadius: 'var(--radius-lg)',
                      borderLeft: `3px solid ${isCredit ? 'var(--color-success)' : 'var(--color-primary)'}`,
                    }}>
                      <span style={{ fontSize: 15, flexShrink: 0 }}>{isCredit ? '💰' : '💳'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {isCredit ? 'Abono' : `Usado en factura${tx.invoiceId ? ` #${tx.invoiceId.slice(0,6).toUpperCase()}` : ''}`}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                          {formatDate(tx.paymentDate)}
                        </div>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 'var(--font-size-xs)', color: isCredit ? 'var(--color-success-dark)' : 'var(--color-primary)', flexShrink: 0 }}>
                        {isCredit ? '+' : '−'}S/. {Number(tx.amountPaid).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="pd-empty">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M2 10h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <p>Sin movimientos de saldo</p>
                <button className="pd-view-all" onClick={() => setShowAddCreditModal(true)}>
                  + Agregar primer saldo
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CARD — Tratamientos Activos */}
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
            {activeOrders.length > 0 && <span className="pd-chip">{activeOrders.length}</span>}
          </div>
          <div className="pd-card__body">
            {activeOrders.length > 0 ? (
              <div className="pd-treatment-list">
                {activeOrders.slice(0, 4).map(order => {
                  const sessions    = order.appointmentServices || [];
                  const total       = order.totalSessions;
                  const attended    = sessions.filter(as => as.appointment?.status === AppointmentStatus.attended).length;
                  const inProgress  = sessions.filter(as => as.appointment?.status === AppointmentStatus.in_progress).length;
                  const reserved    = sessions.filter(as => as.appointment?.status === AppointmentStatus.reserved).length;

                  const pctAttended   = total > 0 ? (attended   / total) * 100 : 0;
                  const pctInProgress = total > 0 ? (inProgress / total) * 100 : 0;
                  const pctReserved   = total > 0 ? (reserved   / total) * 100 : 0;

                  // Primer segmento no-cero para darle border-radius izquierdo
                  const firstSeg = attended > 0 ? 'attended' : inProgress > 0 ? 'inProgress' : reserved > 0 ? 'reserved' : 'none';

                  return (
                    <div key={order.id} className="pd-treatment">
                      {/* Encabezado: nombre + contador */}
                      <div className="pd-treatment__header">
                        <h3 className="pd-treatment__name">{order.service?.name || 'Servicio'}</h3>
                        <span className="pd-treatment__sessions">{attended}/{total} ses.</span>
                      </div>

                      {/* Barra tricolor: verde | ámbar | teal */}
                      <div style={{ height: 7, background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden', display: 'flex' }}>
                        {/* Completadas - verde */}
                        <div style={{ width: `${pctAttended}%`, background: 'var(--color-success)', transition: 'width 0.4s', borderRadius: firstSeg === 'attended' ? 'var(--radius-full) 0 0 var(--radius-full)' : '0' }} />
                        {/* En atención - ámbar (pulsante) */}
                        {inProgress > 0 && (
                          <div style={{ width: `${pctInProgress}%`, background: 'var(--color-warning)', transition: 'width 0.4s', borderRadius: firstSeg === 'inProgress' ? 'var(--radius-full) 0 0 var(--radius-full)' : '0', animation: 'pulse-bar 1.8s ease-in-out infinite' }} />
                        )}
                        {/* Reservadas - teal */}
                        <div style={{ width: `${pctReserved}%`, background: 'var(--color-primary)', opacity: 0.6, transition: 'width 0.4s', borderRadius: firstSeg === 'reserved' ? 'var(--radius-full) 0 0 var(--radius-full)' : '0' }} />
                      </div>

                      {/* Botón concluir tratamiento — solo si hay al menos 1 sesión atendida */}
                      {attended > 0 && (
                      <div style={{ marginTop: 6, display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => { setConcludingOrderId(order.id); setConcludeReason(''); }}
                          title="Concluir este tratamiento anticipadamente"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '3px 10px', borderRadius: 'var(--radius-md)',
                            background: 'transparent',
                            border: '1.5px solid var(--color-border-primary)',
                            color: 'var(--color-text-tertiary)',
                            fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-warning)'; e.currentTarget.style.color = 'var(--color-warning)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border-primary)'; e.currentTarget.style.color = 'var(--color-text-tertiary)'; }}
                        >
                          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                            <path d="M2 8h12M8 2v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" transform="rotate(45 8 8)"/>
                          </svg>
                          Concluir tratamiento
                        </button>
                      </div>
                      )}

                      {/* Puntos por sesión */}
                      <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                        {Array.from({ length: total }).map((_, i) => {
                          const svc    = sessions.find(as => as.sessionNumber === i + 1);
                          const status = svc?.appointment?.status;
                          type Dot = { bg: string; border: string; title: string; pulse?: boolean; opacity?: number };
                          const dot: Dot = { bg: 'transparent', border: 'var(--color-border-primary)', title: `Sesión ${i + 1} — sin agendar` };

                          if (status === AppointmentStatus.attended) {
                            dot.bg = 'var(--color-success)'; dot.border = 'var(--color-success)'; dot.title = `Sesión ${i + 1} — completada`;
                          } else if (status === AppointmentStatus.in_progress) {
                            dot.bg = 'var(--color-warning)'; dot.border = 'var(--color-warning)'; dot.title = `Sesión ${i + 1} — en atención`; dot.pulse = true;
                          } else if (status === AppointmentStatus.reserved) {
                            dot.bg = 'var(--color-primary)'; dot.border = 'var(--color-primary)'; dot.title = `Sesión ${i + 1} — reservada`;
                          } else if (status === AppointmentStatus.cancelled || status === AppointmentStatus.no_show) {
                            dot.bg = 'var(--color-error-alpha-10)'; dot.border = 'var(--color-error-light)'; dot.opacity = 0.4;
                            dot.title = `Sesión ${i + 1} — ${status === AppointmentStatus.cancelled ? 'cancelada' : 'no asistió'}`;
                          }

                          return (
                            <div key={i} title={dot.title} style={{
                              width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                              background: dot.bg, border: `1.5px solid ${dot.border}`,
                              opacity: dot.opacity ?? 1,
                              boxShadow: dot.pulse ? '0 0 0 2px var(--color-warning-alpha-10)' : 'none',
                            }} />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Leyenda */}
                <div style={{ display: 'flex', gap: 'var(--spacing-md)', paddingTop: 'var(--spacing-sm)', marginTop: 'var(--spacing-xs)', borderTop: '1px solid var(--color-border-secondary)', flexWrap: 'wrap' }}>
                  {[
                    { color: 'var(--color-success)',  border: 'var(--color-success)',        label: 'Completada'   },
                    { color: 'var(--color-warning)',  border: 'var(--color-warning)',         label: 'En atención'  },
                    { color: 'var(--color-primary)',  border: 'var(--color-primary)',         label: 'Reservada'    },
                    { color: 'transparent',           border: 'var(--color-border-primary)',  label: 'Sin agendar'  },
                  ].map(({ color, border, label }) => (
                    <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, border: `1.5px solid ${border}`, flexShrink: 0 }} />
                      {label}
                    </span>
                  ))}
                </div>

                {activeOrders.length > 4 && (
                  <button className="pd-view-all" onClick={() => navigate(`/patients/${id}/history`)}>
                    Ver todos ({activeOrders.length}) →
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 'var(--spacing-sm) var(--spacing-md)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: 'var(--color-text-disabled)' }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3"/>
                  <path d="M9 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Sin tratamientos activos</span>
              </div>
            )}
          </div>
        </div>

        {/* CARD — Tratamientos Completados (solo si hay datos) */}
        {completedOrders.length > 0 && (
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
              <span className="pd-chip">{completedOrders.length}</span>
            </div>
            <div className="pd-card__body">
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
            </div>
          </div>
        )}

      </div>

      {/* ══ ACCIONES RÁPIDAS (franja horizontal) ══════════════════════════ */}
      <div style={{
        marginTop: 'var(--spacing-lg)',
        background: 'var(--color-bg-primary)',
        border: '1px solid var(--color-border-secondary)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-sm)',
        padding: 'var(--spacing-md) var(--spacing-lg)',
      }}>
        <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-tertiary)', marginBottom: 'var(--spacing-md)' }}>
          Acciones rápidas
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-sm)' }}>
          {[
            {
              icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2a7 7 0 100 14A7 7 0 009 2zM9 5v4l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
              label: 'Historial Médico',
              desc: 'Registros y evolución',
              action: () => navigate(`/patients/${id}/history`),
              color: 'teal',
            },
            {
              icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="3" y="2" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><path d="M6 6h6M6 9h6M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
              label: 'Facturación',
              desc: 'Facturas y pagos',
              action: () => navigate(`/patients/${id}/invoices`),
              color: 'amber',
            },
            {
              icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="3" width="14" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><path d="M2 8h14M6 1v3M12 1v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
              label: hasActivePendingApt ? 'Cita ya agendada' : 'Nueva Cita',
              desc: hasActivePendingApt
                ? (currentInProgress ? 'En atención actualmente' : 'Ya tiene una cita reservada')
                : 'Agendar sesión',
              action: hasActivePendingApt ? () => {} : () => navigate(`/appointments/new?patientId=${id}`),
              color: 'teal',
            },
            {
              icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M13 2.5a1.77 1.77 0 112.5 2.5L5.5 15.5l-3 .5.5-3L13 2.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
              label: 'Editar Datos',
              desc: 'Actualizar información',
              action: () => setShowEditModal(true),
              color: 'purple',
            },
          ].map(item => (
            <button key={item.label} className="pd-action" onClick={item.action}>
              <span className={`pd-action__icon`}>{item.icon}</span>
              <div>
                <p className="pd-action__title">{item.label}</p>
                <p className="pd-action__desc">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ══ MODALS ══════════════════════════════════════════════════════════ */}
      {patient && (
        <AddCreditModal
          isOpen={showAddCreditModal}
          onClose={() => setShowAddCreditModal(false)}
          patientId={patient.id}
          patientName={`${patient.firstName} ${patient.lastName}`}
          currentBalance={accountBalance}
          onSuccess={newBalance => {
            setAccountBalance(newBalance);
            if (id) creditsService.getCreditHistory(id).then(d => setCreditHistory(d.credits));
            setShowAddCreditModal(false);
          }}
        />
      )}

      <CreatePatientModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onUpdated={updated => {
          setPatient(prev => prev ? { ...prev, ...updated } : updated);
          setShowEditModal(false);
        }}
        patientId={id}
      />

      {showDeleteModal && (
        <Modal isOpen={showDeleteModal} title="Confirmar Eliminación" onClose={() => setShowDeleteModal(false)}>
          <div style={{ padding: '4px 0' }}>
            <p style={{ marginBottom: 12, color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              ¿Estás seguro que deseas eliminar a{' '}
              <strong style={{ color: 'var(--color-text-primary)' }}>{patient?.firstName} {patient?.lastName}</strong>?
            </p>
            <p style={{ marginBottom: 24, color: 'var(--color-error)', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
              Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>Cancelar</Button>
              <Button variant="danger"    onClick={handleDelete}                    disabled={isDeleting}>
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL CONCLUIR TRATAMIENTO ── */}
      {concludingOrderId && (() => {
        const order = activeOrders.find(o => o.id === concludingOrderId);
        if (!order) return null;
        const attended = countAttended(order);
        const remaining = order.totalSessions - attended;
        return (
          <Modal isOpen={true} title="Concluir tratamiento" onClose={() => setConcludingOrderId(null)}>
            <div style={{ padding: '4px 0' }}>

              {/* ── Banner de advertencia ── */}
              <div style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                padding: 'var(--spacing-md)',
                background: 'var(--color-error-alpha-10)',
                border: '2px solid var(--color-error)',
                borderRadius: 'var(--radius-lg)',
                marginBottom: 'var(--spacing-md)',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: 'var(--color-error)', marginTop: 1 }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--color-error)', fontSize: 'var(--font-size-sm)', marginBottom: 3 }}>
                    Esta acción no se puede deshacer fácilmente
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                    Las <strong>{remaining} sesión{remaining > 1 ? 'es' : ''} restante{remaining > 1 ? 's' : ''}</strong> del tratamiento quedarán bloqueadas y no podrán agendarse. Solo un administrador puede reabrir el tratamiento.
                  </div>
                </div>
              </div>

              {/* Info del tratamiento */}
              <div style={{ padding: 'var(--spacing-sm) var(--spacing-md)', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-secondary)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--spacing-md)' }}>
                <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 2 }}>
                  {order.service?.name || 'Servicio'}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                  <span style={{ color: 'var(--color-success-dark)', fontWeight: 600 }}>✓ {attended} completada{attended !== 1 ? 's' : ''}</span>
                  {remaining > 0 && (
                    <span style={{ color: 'var(--color-error)', fontWeight: 600 }}>
                      {' '}· ✕ {remaining} sin completar
                    </span>
                  )}
                  {' '}de {order.totalSessions} sesiones totales
                </div>
              </div>

              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--spacing-sm)' }}>
                  Motivo <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--color-text-disabled)' }}>(opcional)</span>
                </label>
                <textarea
                  className="adet-note-textarea"
                  value={concludeReason}
                  onChange={e => setConcludeReason(e.target.value)}
                  placeholder="Ej: El paciente solicitó no continuar, se realizó devolución parcial..."
                  rows={3}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <Button variant="secondary" onClick={() => setConcludingOrderId(null)} disabled={isConcluding}>
                  Cancelar
                </Button>
                <Button variant="danger" onClick={handleConclude} disabled={isConcluding}>
                  {isConcluding ? 'Concluyendo...' : 'Concluir tratamiento'}
                </Button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};

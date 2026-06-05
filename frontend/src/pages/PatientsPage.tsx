import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientsService, GetPatientsParams } from '../services/patients.service';
import { Patient, Sex } from '../types';
import { Pagination } from '../components/Pagination';
import { Loading } from '../components/Loading';
import { CreatePatientModal } from '../components/CreatePatientModal';
import { formatDate } from '../utils/dateUtils';

// ── Helpers ───────────────────────────────────────────────────────────────────

const buildWaUrl = (phone: string, firstName: string) => {
  const digits = phone.replace(/\D/g, '');
  const number = digits.startsWith('51') ? digits : `51${digits}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(`Hola ${firstName}, le contactamos desde DermicaPro.`)}`;
};

const calculateAge = (dob: string): string => {
  const birth = new Date(dob);
  const now   = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (months < 12) return months <= 0 ? '< 1 mes' : `${months} m`;
  const years = Math.floor(months / 12);
  return `${years} años`;
};

// Hash determinista → índice de color (6 paletas)
const AVATAR_PALETTES = [
  'linear-gradient(135deg,var(--color-primary-light),var(--color-primary-dark))',
  'linear-gradient(135deg,var(--color-accent-light),var(--color-accent-dark))',
  'linear-gradient(135deg,var(--color-info-light),var(--color-info-dark))',
  'linear-gradient(135deg,var(--color-warning-light),var(--color-warning-dark))',
  'linear-gradient(135deg,var(--color-success-light),var(--color-success-dark))',
  'linear-gradient(135deg,#a78bfa,#7c3aed)',
];
const avatarPalette = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_PALETTES[Math.abs(h) % AVATAR_PALETTES.length];
};

const SEX_CONFIG: Record<Sex, { label: string; color: string; bg: string }> = {
  M:     { label: 'Masculino', color: 'var(--color-info-dark)',       bg: 'var(--color-info-alpha-10)' },
  F:     { label: 'Femenino',  color: 'var(--color-accent)',          bg: 'var(--color-accent-alpha-10)' },
  Other: { label: 'Otro',      color: 'var(--color-text-secondary)',  bg: 'var(--color-bg-tertiary)' },
};

// ── Patient Card ──────────────────────────────────────────────────────────────
const PatientCard: React.FC<{ patient: Patient; onClick: () => void }> = ({ patient, onClick }) => {
  const navigate = useNavigate();
  const sex      = SEX_CONFIG[patient.sex] || SEX_CONFIG.Other;
  const initials = `${patient.firstName[0] || ''}${patient.lastName[0] || ''}`.toUpperCase();
  const palette  = avatarPalette(`${patient.firstName}${patient.lastName}`);
  const age      = calculateAge(patient.dateOfBirth);
  const hasBalance = (patient.accountBalance ?? 0) > 0;

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--color-bg-primary)',
        border: '1px solid var(--color-border-secondary)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'box-shadow var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border-primary)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border-secondary)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      {/* ── Cuerpo ── */}
      <div style={{ padding: 'var(--spacing-md) var(--spacing-lg)', flex: 1 }}>

        {/* Avatar + Nombre */}
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
            background: patient.photoUrl ? 'transparent' : palette,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 'var(--font-size-lg)',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
          }}>
            {patient.photoUrl
              ? <img src={patient.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {patient.firstName} {patient.lastName}
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 1 }}>
              DNI {patient.dni}
            </div>
          </div>

          {/* Badge saldo a favor */}
          {hasBalance && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 'var(--radius-full)', background: 'var(--color-primary-alpha-10)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', flexShrink: 0, whiteSpace: 'nowrap' }}>
              S/.{Number(patient.accountBalance).toFixed(0)} saldo
            </span>
          )}
        </div>

        {/* Chips: sexo + edad */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 'var(--spacing-sm)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 600, color: sex.color, background: sex.bg }}>
            {sex.label}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', background: 'var(--color-bg-tertiary)' }}>
            {age}
          </span>
        </div>

        {/* Teléfono */}
        {patient.phone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 3 }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <path d="M14 10.67c0 .27-.06.53-.19.77-.13.25-.31.48-.54.67-.38.33-.79.5-1.22.5-.31 0-.64-.07-.99-.21a10.6 10.6 0 01-1.01-.54 16.6 16.6 0 01-.95-.76 16.3 16.3 0 01-.77-.95 10.6 10.6 0 01-.52-1c-.14-.35-.21-.68-.21-1 0-.3.06-.6.19-.87.13-.27.33-.52.6-.73l.8-.59c.24-.19.47-.29.68-.29.27 0 .54.14.79.41l1.06 1.25c.25.27.37.52.37.75 0 .27-.09.54-.29.81l-.44.59c-.01.04-.02.08-.02.11 0 .07.03.14.07.23.09.19.26.42.48.67.23.26.46.49.71.68.23.19.41.31.57.38.08.04.14.06.2.06.04 0 .08-.02.11-.03l.58-.43c.27-.19.54-.28.81-.28.23 0 .47.12.74.37l1.25 1.06c.27.24.41.51.41.79z" stroke="currentColor" strokeWidth="1.4"/>
            </svg>
            {patient.phone}
          </div>
        )}

        {/* Última atención */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 'var(--font-size-xs)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: patient.lastAttendedDate ? 'var(--color-success)' : 'var(--color-text-disabled)', flexShrink: 0 }} />
          <span style={{ color: patient.lastAttendedDate ? 'var(--color-success-dark)' : 'var(--color-text-disabled)' }}>
            {patient.lastAttendedDate
              ? `Últ. atención ${formatDate(patient.lastAttendedDate)}`
              : 'Sin atenciones'}
          </span>
        </div>
      </div>

      {/* ── Footer: acciones ── */}
      <div style={{
        padding: 'var(--spacing-sm) var(--spacing-md)',
        borderTop: '1px solid var(--color-border-secondary)',
        background: 'var(--color-bg-secondary)',
        display: 'flex', gap: 6, alignItems: 'center',
      }}>
        {/* WhatsApp — ícono compacto */}
        {patient.phone && (
          <a
            href={buildWaUrl(patient.phone, patient.firstName)}
            target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            title="Enviar WhatsApp"
            style={{
              width: 32, height: 32, borderRadius: 'var(--radius-md)', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(37,211,102,0.12)', border: '1.5px solid rgba(37,211,102,0.35)',
              color: '#25D366', textDecoration: 'none',
              transition: 'background var(--transition-fast)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,211,102,0.25)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(37,211,102,0.12)')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </a>
        )}

        {/* + Cita */}
        <button
          onClick={e => { e.stopPropagation(); navigate(`/appointments/new?patientId=${patient.id}`); }}
          title="Nueva cita"
          style={{
            flex: 1, padding: '6px 0', borderRadius: 'var(--radius-md)',
            border: '1.5px solid var(--color-border-primary)',
            background: 'transparent', color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-xs)', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all var(--transition-fast)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border-primary)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
        >
          + Cita
        </button>

        {/* Ver perfil */}
        <button
          onClick={e => { e.stopPropagation(); navigate(`/patients/${patient.id}`); }}
          style={{
            flex: 2, padding: '6px 0', borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
            border: 'none', color: 'var(--color-on-primary)',
            fontSize: 'var(--font-size-xs)', fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Ver perfil →
        </button>
      </div>
    </div>
  );
};

// ── Sort helper ───────────────────────────────────────────────────────────────
type SortKey = 'name' | 'lastAttended' | 'createdAt';
const sortPatients = (list: Patient[], key: SortKey): Patient[] => {
  return [...list].sort((a, b) => {
    if (key === 'name') return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    if (key === 'lastAttended') {
      const da = a.lastAttendedDate ? new Date(a.lastAttendedDate).getTime() : 0;
      const db = b.lastAttendedDate ? new Date(b.lastAttendedDate).getTime() : 0;
      return db - da;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const PatientsPage: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients]         = useState<Patient[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [search, setSearch]             = useState('');
  const [sexFilter, setSexFilter]       = useState<Sex | ''>('');
  const [sortKey, setSortKey]           = useState<SortKey>('createdAt');
  const [currentPage, setCurrentPage]   = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [total, setTotal]               = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const limit = 12;

  const loadPatients = useCallback(async (q: string, sex: Sex | '', page: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const params: GetPatientsParams = { page, limit, search: q || undefined, sex: sex || undefined };
      const response = await patientsService.getPatients(params);
      setPatients(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar pacientes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce en búsqueda por texto
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setCurrentPage(1);
      loadPatients(search, sexFilter, 1);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, sexFilter]);

  // Recarga al cambiar página (sin debounce)
  useEffect(() => { loadPatients(search, sexFilter, currentPage); }, [currentPage]);

  const clearFilters = () => { setSearch(''); setSexFilter(''); setCurrentPage(1); };
  const hasFilters   = !!(search || sexFilter);
  const sorted       = sortPatients(patients, sortKey);

  return (
    <div className="page-container">

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--spacing-xl)', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', margin: 0 }}>
            Pacientes
          </h1>
          <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)', margin: '4px 0 0' }}>
            {isLoading ? '…' : `${total} paciente${total !== 1 ? 's' : ''} registrado${total !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '9px 20px', borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
            border: 'none', color: 'var(--color-on-primary)',
            fontSize: 'var(--font-size-sm)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
          Nuevo Paciente
        </button>
      </div>

      {/* ── Barra de filtros y orden ── */}
      <div className="glass-card" style={{ marginBottom: 'var(--spacing-xl)', padding: 'var(--spacing-md) var(--spacing-lg)' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap', alignItems: 'center' }}>

          {/* Search con debounce */}
          <div style={{ flex: '1 1 240px', position: 'relative' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
              <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Nombre, DNI, teléfono…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', paddingLeft: 34, paddingRight: search ? 32 : 12, paddingTop: 8, paddingBottom: 8,
                border: '1.5px solid var(--color-border-primary)', borderRadius: 'var(--radius-lg)',
                background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-sm)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                transition: 'border-color var(--transition-fast)',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--color-primary)')}
              onBlur={e => (e.target.style.borderColor = 'var(--color-border-primary)')}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer', padding: 2, fontSize: 16, lineHeight: 1 }}>×</button>
            )}
          </div>

          {/* Sexo — pills */}
          <div style={{ display: 'flex', gap: 3, background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', padding: 3, flexShrink: 0 }}>
            {([['', 'Todos'], ['F', '♀ F'], ['M', '♂ M']] as [Sex | '', string][]).map(([val, lbl]) => (
              <button key={val} type="button"
                onClick={() => { setSexFilter(val); setCurrentPage(1); }}
                style={{
                  padding: '5px 12px', borderRadius: 'var(--radius-md)', border: 'none',
                  background: sexFilter === val ? 'var(--color-primary)' : 'transparent',
                  color: sexFilter === val ? 'var(--color-on-primary)' : 'var(--color-text-secondary)',
                  fontSize: 'var(--font-size-xs)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all var(--transition-fast)',
                }}
              >{lbl}</button>
            ))}
          </div>

          {/* Ordenar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-text-tertiary)' }}>
              <path d="M3 6h18M7 12h10M11 18h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value as SortKey)}
              style={{
                padding: '6px 10px', border: '1.5px solid var(--color-border-primary)',
                borderRadius: 'var(--radius-lg)', background: 'var(--color-bg-primary)',
                color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)',
                fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="createdAt">Más reciente</option>
              <option value="name">Nombre A–Z</option>
              <option value="lastAttended">Última atención</option>
            </select>
          </div>

          {hasFilters && (
            <button onClick={clearFilters} style={{ padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--color-border-primary)', background: 'transparent', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              × Limpiar
            </button>
          )}
        </div>
      </div>

      {/* ── Contenido ── */}
      {error && <div className="alert alert-error" style={{ marginBottom: 'var(--spacing-lg)' }}>{error}</div>}

      {isLoading ? (
        <Loading text="Cargando pacientes..." />
      ) : sorted.length === 0 ? (
        <div className="pd-empty" style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border-secondary)', borderRadius: 'var(--radius-xl)', padding: 'var(--spacing-3xl)' }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="18" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3"/>
            <path d="M8 42a16 16 0 0132 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 3"/>
          </svg>
          <p>{hasFilters ? 'No se encontraron pacientes con esos filtros' : 'Aún no hay pacientes registrados'}</p>
          {hasFilters && (
            <button onClick={clearFilters} style={{ marginTop: 8, padding: '7px 16px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--color-border-primary)', background: 'transparent', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
            {sorted.map(p => (
              <PatientCard key={p.id} patient={p} onClick={() => navigate(`/patients/${p.id}`)} />
            ))}
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      )}

      <CreatePatientModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={patient => { setPatients(prev => [patient, ...prev]); setTotal(prev => prev + 1); setShowCreateModal(false); }}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersService, GetUsersParams } from '../services/users.service';
import api from '../services/api';
import { User } from '../types';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Pagination } from '../components/Pagination';
import { Loading } from '../components/Loading';
import { EmployeeFormModal } from '../components/EmployeeFormModal';
import '../styles/employees-page.css';

interface RoleOption {
  id: string;
  name: string;
  displayName: string;
}

// ── Avatar helpers ─────────────────────────────────────────────────────────────

const AVATAR_PALETTES = [
  'linear-gradient(135deg,var(--color-primary-light),var(--color-primary-dark))',
  'linear-gradient(135deg,var(--color-accent-light),var(--color-accent-dark))',
  'linear-gradient(135deg,var(--color-info-light),var(--color-info-dark))',
  'linear-gradient(135deg,var(--color-warning-light),var(--color-warning-dark))',
  'linear-gradient(135deg,var(--color-success-light),var(--color-success-dark))',
  'linear-gradient(135deg,#a78bfa,#7c3aed)',
];

const avatarPalette = (name: string): string => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_PALETTES[Math.abs(h) % AVATAR_PALETTES.length];
};

// ── Role config ────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  admin:         { label: 'Administrador',     color: 'var(--color-error-dark)',   bg: 'var(--color-error-alpha-10)',   icon: '🔑' },
  medical_staff: { label: 'Personal Médico',   color: 'var(--color-info-dark)',    bg: 'var(--color-info-alpha-10)',    icon: '🩺' },
  assistant:     { label: 'Personal Asistente',color: 'var(--color-warning-dark)', bg: 'var(--color-warning-alpha-10)', icon: '📋' },
  sales:         { label: 'Vendedor',          color: 'var(--color-success-dark)', bg: 'var(--color-success-alpha-10)', icon: '💼' },
};

const getRoleConfig = (roleName: string) =>
  ROLE_CONFIG[roleName] ?? { label: roleName, color: 'var(--color-text-secondary)', bg: 'var(--color-bg-tertiary)', icon: '👤' };

// ── Helpers ────────────────────────────────────────────────────────────────────

const getUserRoleName = (user: User): string => {
  if (!user.role) return '';
  if (typeof user.role === 'string') return user.role;
  return user.role.name;
};

const getUserRoleDisplay = (user: User): string => {
  if (!user.role) return 'Sin rol';
  if (typeof user.role === 'string') return getRoleConfig(user.role).label;
  return user.role.displayName;
};

// ── Employee Card ──────────────────────────────────────────────────────────────

const SEX_LABELS: Record<string, string> = { M: 'Masculino', F: 'Femenino', Other: 'Otro' };

const EmployeeCard: React.FC<{ user: User; onClick: () => void }> = ({ user, onClick }) => {
  const roleName = getUserRoleName(user);
  const role     = getRoleConfig(roleName);
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();
  const palette  = avatarPalette(`${user.firstName}${user.lastName}`);

  return (
    <div className="employee-card" onClick={onClick}>
      {/* Status strip */}
      <div className={`employee-card__strip ${user.isActive ? 'employee-card__strip--active' : 'employee-card__strip--inactive'}`} />

      <div className="employee-card__body">
        {/* Avatar */}
        <div
          className="employee-card__avatar"
          style={{ background: user.photoUrl ? 'transparent' : palette }}
        >
          {user.photoUrl
            ? <img src={user.photoUrl} alt={initials} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initials}
        </div>

        {/* Info — fixed 3-row structure so all cards align */}
        <div className="employee-card__info">
          {/* Row 1: name */}
          <div className="employee-card__name">{user.firstName} {user.lastName}</div>

          {/* Row 2: email */}
          <div className="employee-card__email">{user.email}</div>

          {/* Row 3: role badge (always its own line) */}
          <span
            className="employee-card__badge"
            style={{ color: role.color, background: role.bg }}
          >
            {role.icon} {getUserRoleDisplay(user)}
          </span>

          {/* Row 4: status + sex on the same line */}
          <div className="employee-card__meta-row">
            <span className={`badge ${user.isActive ? 'badge-success' : 'badge-error'}`}>
              {user.isActive ? 'Activo' : 'Inactivo'}
            </span>
            {user.sex && (
              <span className="employee-card__sex">{SEX_LABELS[user.sex] ?? user.sex}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────

export const EmployeesPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers]               = useState<User[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [search, setSearch]           = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [roleFilter, setRoleFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [total, setTotal]             = useState(0);

  const limit = 12;

  const loadRoles = async () => {
    try {
      const { data } = await api.get<RoleOption[]>('/roles');
      setAvailableRoles(data);
    } catch (err) {
      console.error('Error loading roles:', err);
    }
  };

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params: GetUsersParams = {
        page: currentPage,
        limit,
        search: activeSearch || undefined,
        roleId: roleFilter || undefined,
        isActive: statusFilter || undefined,
      };

      const response = await usersService.getUsers(params);
      setUsers(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar empleados');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadRoles(); }, []);
  useEffect(() => { loadUsers(); }, [currentPage, roleFilter, statusFilter, activeSearch]);

  const handleSearch = () => { setActiveSearch(search); setCurrentPage(1); };
  const handleSearchKeyPress = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSearch(); };
  const handleClearFilters = () => {
    setSearch(''); setActiveSearch(''); setRoleFilter(''); setStatusFilter(''); setCurrentPage(1);
  };

  const hasActiveFilters = !!(search || activeSearch || roleFilter || statusFilter);

  return (
    <div className="page-container employees-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Gestión de Empleados</h1>
          <p className="employees-page__subtitle">Administra el equipo de la clínica</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          + Nuevo Empleado
        </Button>
      </div>

      {/* Filters */}
      <div className="filters employees-page__filters">
        <div className="employees-page__filters-grid">
          <Input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={handleSearchKeyPress}
          />
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={availableRoles.map(r => ({ value: r.id, label: r.displayName }))}
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'true',  label: 'Activos' },
              { value: 'false', label: 'Inactivos' },
            ]}
          />
          <div className="employees-page__filter-actions">
            <Button variant="primary" onClick={handleSearch}>Buscar</Button>
            {hasActiveFilters && (
              <Button variant="secondary" onClick={handleClearFilters}>Limpiar</Button>
            )}
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Results bar */}
      <div className="results-info-modern">
        <div className="results-count">
          <span className="count-number">{total}</span>
          <span className="count-label">empleados</span>
        </div>
        {hasActiveFilters && (
          <span className="employees-page__filter-tag">Filtros activos</span>
        )}
      </div>

      {/* Grid / Loading / Empty */}
      {isLoading ? (
        <Loading text="Cargando empleados..." />
      ) : users.length === 0 ? (
        <div className="employees-page__empty">
          <div className="employees-page__empty-icon">👥</div>
          <p>No se encontraron empleados</p>
          {hasActiveFilters && (
            <Button variant="secondary" onClick={handleClearFilters}>Limpiar filtros</Button>
          )}
        </div>
      ) : (
        <>
          <div className="employees-grid">
            {users.map(user => (
              <EmployeeCard
                key={user.id}
                user={user}
                onClick={() => navigate(`/employees/${user.id}`)}
              />
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      <EmployeeFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSaved={(user) => {
          setUsers(prev => [user, ...prev]);
          setTotal(prev => prev + 1);
          setShowCreateModal(false);
        }}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersService, GetUsersParams } from '../services/users.service';
import { User } from '../types';
import { Table, Column } from '../components/Table';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Pagination } from '../components/Pagination';
import { Loading } from '../components/Loading';
import { EmployeeFormModal } from '../components/EmployeeFormModal';
import { formatDate } from '../utils/dateUtils';

interface RoleOption {
  id: string;
  name: string;
  displayName: string;
}

export const EmployeesPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filtros y paginación
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>(''); // Ahora guarda ID del rol
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const limit = 10;

  const loadRoles = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/roles', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      const data = await response.json();
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

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [currentPage, roleFilter, statusFilter, activeSearch]);

  const handleSearch = () => {
    setActiveSearch(search);
    setCurrentPage(1);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setActiveSearch('');
    setRoleFilter('');
    setStatusFilter('');
    setCurrentPage(1);
  };

  const handleCreateEmployee = () => setShowCreateModal(true);

  const handleRowClick = (user: User) => {
    navigate(`/employees/${user.id}`);
  };

  const getRoleBadgeStyle = (roleName: string): React.CSSProperties => {
    const map: Record<string, { bg: string; color: string }> = {
      admin:         { bg: 'var(--color-error-alpha-10)',   color: 'var(--color-error-dark)' },
      medical_staff: { bg: 'var(--color-info-alpha-10)',    color: 'var(--color-info-dark)' },
      assistant:     { bg: 'var(--color-warning-alpha-10)', color: 'var(--color-warning-dark)' },
      sales:         { bg: 'var(--color-success-alpha-10)', color: 'var(--color-success-dark)' },
    };
    const s = map[roleName] ?? { bg: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' };
    return {
      padding: 'var(--spacing-xs) var(--spacing-sm)',
      borderRadius: 'var(--radius-full)',
      backgroundColor: s.bg,
      color: s.color,
      fontSize: 'var(--font-size-xs)',
      fontWeight: 'var(--font-weight-semibold)',
    };
  };

  const getRoleLabel = (roleName: string): string => {
    const roleLabels: Record<string, string> = {
      admin:         'Administrador',
      medical_staff: 'Personal Médico',
      assistant:     'Personal Asistente',
      sales:         'Vendedor',
    };
    return roleLabels[roleName] || roleName;
  };

  const getUserRoleName = (user: User): string => {
    if (!user.role) return 'Sin rol';
    if (typeof user.role === 'string') return user.role;
    return user.role.name;
  };

  const getUserRoleDisplay = (user: User): string => {
    if (!user.role) return 'Sin rol';
    if (typeof user.role === 'string') return getRoleLabel(user.role);
    return user.role.displayName;
  };

  const columns: Column<User>[] = [
    {
      key: 'firstName',
      header: 'Nombres',
    },
    {
      key: 'lastName',
      header: 'Apellidos',
    },
    {
      key: 'email',
      header: 'Correo Electrónico',
    },
    {
      key: 'role',
      header: 'Rol',
      render: (user) => (
        <span style={getRoleBadgeStyle(getUserRoleName(user))}>
          {getUserRoleDisplay(user)}
        </span>
      ),
    },
    {
      key: 'sex',
      header: 'Sexo',
      render: (user) => {
        if (!user.sex) return '-';
        const sexLabels = {
          M: 'Masculino',
          F: 'Femenino',
          Other: 'Otro',
        };
        return sexLabels[user.sex];
      },
    },
    {
      key: 'dateOfBirth',
      header: 'Fecha de Nacimiento',
      render: (user) =>
        user.dateOfBirth
          ? formatDate(user.dateOfBirth)
          : '-',
    },
    {
      key: 'isActive',
      header: 'Estado',
      render: (user) => (
        <span className={user.isActive ? 'badge badge-success' : 'badge badge-error'}>
          {user.isActive ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Fecha de Registro',
      render: (user) => formatDate(user.createdAt),
    },
  ];


  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Gestión de Empleados</h1>
        <Button variant="primary" onClick={handleCreateEmployee}>
          + Nuevo Empleado
        </Button>
      </div>

      <div className="filters-container">
        <div className="filters-row">
          <Input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={handleSearchKeyPress}
            className="search-input"
          />

          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={availableRoles.map(role => ({
              value: role.id,
              label: role.displayName,
            }))}
            className="filter-select"
          />

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'true', label: 'Activos' },
              { value: 'false', label: 'Inactivos' },
            ]}
            className="filter-select"
          />

          <Button variant="primary" onClick={handleSearch}>
            Buscar
          </Button>

          {(search || activeSearch || roleFilter || statusFilter) && (
            <Button variant="secondary" onClick={handleClearFilters}>
              Limpiar filtros
            </Button>
          )}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="results-info-modern">
        <div className="results-count">
          <span className="count-number">{total}</span>
          <span className="count-label">empleados</span>
        </div>
      </div>

      {isLoading ? (
        <Loading text="Cargando empleados..." />
      ) : (
        <>
          <Table
            columns={columns}
            data={users}
            onRowClick={handleRowClick}
            emptyMessage="No se encontraron empleados"
          />

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

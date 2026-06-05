import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usersService, UserStats } from '../services/users.service';
import { User, Role, RoleInfo } from '../types';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';
import { Modal } from '../components/Modal';
import { EmployeeFormModal } from '../components/EmployeeFormModal';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/dateUtils';

export const EmployeeDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();

  const [employee, setEmployee] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (id) {
      loadEmployee(id);
      loadStats(id);
    }
  }, [id]);

  const loadEmployee = async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await usersService.getUser(userId);
      setEmployee(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar empleado');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async (userId: string) => {
    try {
      const data = await usersService.getUserStats(userId);
      setStats(data);
    } catch (err: any) {
      console.error('Error loading stats:', err);
    }
  };

  const handleEdit = () => setShowEditModal(true);

  const handleToggleActive = async () => {
    if (!id || !employee) return;

    try {
      setIsProcessing(true);
      if (employee.isActive) {
        await usersService.deactivateUser(id);
      } else {
        await usersService.activateUser(id);
      }
      await loadEmployee(id);
      setShowDeactivateModal(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cambiar estado del usuario');
      setShowDeactivateModal(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    navigate('/employees');
  };


  if (isLoading) {
    return <Loading text="Cargando información del empleado..." />;
  }

  if (error || !employee) {
    return (
      <div className="page-container">
        <div className="error-banner">{error || 'Empleado no encontrado'}</div>
        <Button onClick={handleBack}>Volver</Button>
      </div>
    );
  }

  const resolveRoleName = (role: RoleInfo | Role | null | undefined): string => {
    if (!role) return '';
    if (typeof role === 'string') return role;
    return role.name;
  };

  const getRoleLabel = (role: RoleInfo | Role | null | undefined): string => {
    if (!role) return 'Sin rol';
    if (typeof role === 'object') return role.displayName;
    const roleLabels: Record<string, string> = {
      admin:         'Administrador',
      medical_staff: 'Personal Médico',
      assistant:     'Personal Asistente',
      sales:         'Vendedor',
    };
    return roleLabels[role] ?? role;
  };

  const getRoleBadgeColor = (role: RoleInfo | Role | null | undefined): string => {
    const name = resolveRoleName(role);
    switch (name) {
      case Role.admin:         return '#e74c3c';
      case Role.medical_staff: return '#3498db';
      case Role.assistant:     return '#f39c12';
      case Role.sales:         return '#2ecc71';
      default:                 return '#95a5a6';
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <Button variant="secondary" onClick={handleBack}>
            ← Volver
          </Button>
          <h1>Detalle del Empleado</h1>
        </div>
        <div className="header-actions">
          <Button variant="secondary" onClick={handleEdit}>
            Editar
          </Button>
          {employee.id !== currentUser?.id && (
            <Button
              variant={employee.isActive ? 'danger' : 'primary'}
              onClick={() => setShowDeactivateModal(true)}
            >
              {employee.isActive ? 'Desactivar' : 'Activar'}
            </Button>
          )}
        </div>
      </div>

      <div className="detail-container">
        <div className="detail-section">
          <h2>Información Personal</h2>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Nombres:</label>
              <span>{employee.firstName}</span>
            </div>
            <div className="detail-item">
              <label>Apellidos:</label>
              <span>{employee.lastName}</span>
            </div>
            <div className="detail-item">
              <label>Correo Electrónico:</label>
              <span>{employee.email}</span>
            </div>
            <div className="detail-item">
              <label>Rol:</label>
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: '12px',
                  backgroundColor: getRoleBadgeColor(employee.role),
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                {getRoleLabel(employee.role)}
              </span>
            </div>
            <div className="detail-item">
              <label>Sexo:</label>
              <span>
                {employee.sex
                  ? { M: 'Masculino', F: 'Femenino', Other: 'Otro' }[employee.sex]
                  : '-'}
              </span>
            </div>
            <div className="detail-item">
              <label>Fecha de Nacimiento:</label>
              <span>
                {employee.dateOfBirth
                  ? formatDate(employee.dateOfBirth)
                  : '-'}
              </span>
            </div>
            <div className="detail-item">
              <label>Estado:</label>
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: '12px',
                  backgroundColor: employee.isActive ? '#2ecc71' : '#95a5a6',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                {employee.isActive ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <div className="detail-item">
              <label>Fecha de Registro:</label>
              <span>{formatDate(employee.createdAt)}</span>
            </div>
          </div>
        </div>

        {stats && (
          <div className="detail-section">
            <h2>Estadísticas</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{stats.counts.patientsCreated}</div>
                <div className="stat-label">Pacientes Registrados</div>
              </div>

              {resolveRoleName(employee.role) === Role.sales && (
                <>
                  <div className="stat-card">
                    <div className="stat-value">{stats.counts.appointmentsCreated}</div>
                    <div className="stat-label">Citas Creadas</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.commissionCount || 0}</div>
                    <div className="stat-label">Comisiones Generadas</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">
                      S/. {Number(stats.totalCommissions || 0).toFixed(2)}
                    </div>
                    <div className="stat-label">Total en Comisiones</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">
                      S/. {Number(stats.paidCommissions || 0).toFixed(2)}
                    </div>
                    <div className="stat-label">Comisiones Pagadas</div>
                  </div>
                </>
              )}

              {resolveRoleName(employee.role) === Role.medical_staff && (
                <>
                  <div className="stat-card">
                    <div className="stat-value">{stats.counts.appointmentsAttended}</div>
                    <div className="stat-label">Citas Atendidas</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.counts.patientRecords}</div>
                    <div className="stat-label">Registros Médicos</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.appointmentsLast30Days || 0}</div>
                    <div className="stat-label">Citas Últimos 30 Días</div>
                  </div>
                </>
              )}

              {resolveRoleName(employee.role) === Role.admin && (
                <>
                  <div className="stat-card">
                    <div className="stat-value">{stats.counts.appointmentsCreated}</div>
                    <div className="stat-label">Citas Creadas</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.counts.appointmentsAttended}</div>
                    <div className="stat-label">Citas Atendidas</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.counts.patientRecords}</div>
                    <div className="stat-label">Registros Médicos</div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={showDeactivateModal}
        onClose={() => setShowDeactivateModal(false)}
        title={employee.isActive ? 'Desactivar Usuario' : 'Activar Usuario'}
      >
        <p>
          {employee.isActive
            ? `¿Estás seguro que deseas desactivar a ${employee.firstName} ${employee.lastName}? El usuario no podrá iniciar sesión.`
            : `¿Estás seguro que deseas activar a ${employee.firstName} ${employee.lastName}? El usuario podrá iniciar sesión nuevamente.`}
        </p>
        <div className="modal-actions">
          <Button
            variant="secondary"
            onClick={() => setShowDeactivateModal(false)}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button
            variant={employee.isActive ? 'danger' : 'primary'}
            onClick={handleToggleActive}
            isLoading={isProcessing}
            disabled={isProcessing}
          >
            {employee.isActive ? 'Desactivar' : 'Activar'}
          </Button>
        </div>
      </Modal>

      <EmployeeFormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSaved={(updated) => {
          setEmployee(updated);
          setShowEditModal(false);
        }}
        userId={id}
      />
    </div>
  );
};

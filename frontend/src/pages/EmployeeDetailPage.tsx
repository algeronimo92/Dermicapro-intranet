import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Users, Calendar, FileText, Award, DollarSign, CreditCard, Activity, Camera, ImageIcon } from 'lucide-react';
import { CameraCapture } from '../components/CameraCapture';
import { usersService, UserStats } from '../services/users.service';
import { User, Role, RoleInfo } from '../types';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';
import { Modal } from '../components/Modal';
import { EmployeeFormModal } from '../components/EmployeeFormModal';
import { StatCard } from '../components/dashboard/widgets/StatCard';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/dateUtils';
import './EmployeeDetailPage.css'; // v2

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
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

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

  const handleBack = () => navigate('/employees');

  const handlePhotoBadgeClick = () => {
    if (!isUploadingPhoto) setShowPhotoSheet(true);
  };

  const handleUploadFile = async (file: File) => {
    if (!id) return;
    setShowPhotoSheet(false);
    setShowCamera(false);
    try {
      setIsUploadingPhoto(true);
      const updated = await usersService.uploadPhoto(id, file);
      setEmployee(prev => prev ? { ...prev, photoUrl: updated.photoUrl } : prev);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al subir la foto');
    } finally {
      setIsUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleUploadFile(file);
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

  // ── Helpers ──────────────────────────────────────────────────────────────

  const resolveRoleName = (role: RoleInfo | Role | null | undefined): string => {
    if (!role) return '';
    if (typeof role === 'string') return role;
    return role.name;
  };

  const getRoleLabel = (role: RoleInfo | Role | null | undefined): string => {
    if (!role) return 'Sin rol';
    if (typeof role === 'object') return role.displayName;
    const labels: Record<string, string> = {
      admin:         'Administrador',
      medical_staff: 'Personal Médico',
      assistant:     'Personal Asistente',
      sales:         'Vendedor',
    };
    return labels[role] ?? role;
  };

  const getRoleClass = (role: RoleInfo | Role | null | undefined): string => {
    switch (resolveRoleName(role)) {
      case Role.admin:         return 'admin';
      case Role.medical_staff: return 'medical';
      case Role.assistant:     return 'assistant';
      case Role.sales:         return 'sales';
      default:                 return 'default';
    }
  };

  const roleName = resolveRoleName(employee.role);
  const roleClass = getRoleClass(employee.role);
  const initials = `${employee.firstName?.[0] ?? ''}${employee.lastName?.[0] ?? ''}`.toUpperCase();

  const sexLabel = employee.sex
    ? ({ M: 'Masculino', F: 'Femenino', Other: 'Otro' } as Record<string, string>)[employee.sex] ?? employee.sex
    : '—';

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="page-container">

      {/* Top bar */}
      <div className="employee-top-bar">
        <nav className="employee-breadcrumb">
          <button className="employee-breadcrumb__back" onClick={handleBack}>
            ← Empleados
          </button>
          <span className="employee-breadcrumb__separator">/</span>
          <span className="employee-breadcrumb__current">
            {employee.firstName} {employee.lastName}
          </span>
        </nav>
        <div className="employee-top-bar__actions">
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

      {/* Hidden file input — gallery only (no capture) */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {/* Full-screen camera */}
      {showCamera && (
        <CameraCapture
          onCapture={handleUploadFile}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Photo action sheet */}
      {showPhotoSheet && (
        <div className="photo-action-sheet" onClick={() => setShowPhotoSheet(false)}>
          <div className="photo-action-sheet__panel" onClick={e => e.stopPropagation()}>
            <div className="photo-action-sheet__header">
              <p className="photo-action-sheet__title">Foto de perfil</p>
              <p className="photo-action-sheet__subtitle">Elige cómo agregar la foto</p>
            </div>
            <div className="photo-action-sheet__options">
              <button
                className="photo-action-sheet__option"
                onClick={() => { setShowPhotoSheet(false); setShowCamera(true); }}
              >
                <span className="photo-action-sheet__option-icon photo-action-sheet__option-icon--camera">
                  <Camera size={22} />
                </span>
                <span className="photo-action-sheet__option-text">
                  <span className="photo-action-sheet__option-label">Tomar foto</span>
                  <span className="photo-action-sheet__option-desc">Usa la cámara trasera o frontal del iPad</span>
                </span>
              </button>
              <button
                className="photo-action-sheet__option"
                onClick={() => { setShowPhotoSheet(false); photoInputRef.current?.click(); }}
              >
                <span className="photo-action-sheet__option-icon photo-action-sheet__option-icon--gallery">
                  <ImageIcon size={22} />
                </span>
                <span className="photo-action-sheet__option-text">
                  <span className="photo-action-sheet__option-label">Subir imagen</span>
                  <span className="photo-action-sheet__option-desc">Elige una foto de tu galería o archivos</span>
                </span>
              </button>
            </div>
            <button className="photo-action-sheet__cancel" onClick={() => setShowPhotoSheet(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Profile hero */}
      <div className="employee-hero">
        <div className="employee-avatar-wrapper">
          <div className={`employee-avatar employee-avatar--${roleClass}`}>
            {employee.photoUrl
              ? <img src={employee.photoUrl} alt={`${employee.firstName} ${employee.lastName}`} />
              : initials
            }
          </div>
          <button
            type="button"
            className="employee-avatar-camera-btn"
            onClick={handlePhotoBadgeClick}
            disabled={isUploadingPhoto}
            title="Cambiar foto de perfil"
            aria-label="Cambiar foto de perfil"
          >
            {isUploadingPhoto
              ? <span className="spinner spinner-xs" />
              : <Camera size={13} />
            }
          </button>
        </div>
        <div className="employee-hero__info">
          <h1 className="employee-hero__name">
            {employee.firstName} {employee.lastName}
          </h1>
          <div className="employee-hero__badges">
            <span className={`role-badge role-badge--${roleClass}`}>
              {getRoleLabel(employee.role)}
            </span>
            <span className={`status-badge ${employee.isActive ? 'status-badge--active' : 'status-badge--inactive'}`}>
              <span className="status-badge__dot" />
              {employee.isActive ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <div className="employee-hero__email">{employee.email}</div>
        </div>
      </div>

      {/* Personal info */}
      <div className="employee-card">
        <div className="employee-card__header">
          <h2 className="employee-card__title">Información Personal</h2>
        </div>
        <div className="employee-info-grid">
          <div className="employee-info-item">
            <span className="employee-info-item__label">Sexo</span>
            <span className="employee-info-item__value">{sexLabel}</span>
          </div>
          <div className="employee-info-item">
            <span className="employee-info-item__label">Fecha de Nacimiento</span>
            <span className="employee-info-item__value">
              {employee.dateOfBirth ? formatDate(employee.dateOfBirth) : '—'}
            </span>
          </div>
          <div className="employee-info-item">
            <span className="employee-info-item__label">Correo Electrónico</span>
            <span className="employee-info-item__value">{employee.email}</span>
          </div>
          <div className="employee-info-item">
            <span className="employee-info-item__label">Fecha de Registro</span>
            <span className="employee-info-item__value">{formatDate(employee.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="employee-card">
          <div className="employee-card__header">
            <h2 className="employee-card__title">Estadísticas</h2>
            <p className="employee-card__subtitle">Como {getRoleLabel(employee.role)}</p>
          </div>
          <div className="employee-stats-grid">

            <StatCard
              title="Pacientes Registrados"
              value={stats.counts.patientsCreated}
              icon={<Users size={20} />}
              color="primary"
              variant="soft"
            />

            {roleName === Role.sales && (
              <>
                <StatCard
                  title="Citas Creadas"
                  value={stats.counts.appointmentsCreated}
                  icon={<Calendar size={20} />}
                  color="info"
                  variant="soft"
                />
                <StatCard
                  title="Comisiones Generadas"
                  value={stats.commissionCount ?? 0}
                  icon={<Award size={20} />}
                  color="warning"
                  variant="soft"
                />
                <StatCard
                  title="Total en Comisiones"
                  value={`S/. ${Number(stats.totalCommissions ?? 0).toFixed(2)}`}
                  icon={<DollarSign size={20} />}
                  color="success"
                  variant="soft"
                />
                <StatCard
                  title="Comisiones Pagadas"
                  value={`S/. ${Number(stats.paidCommissions ?? 0).toFixed(2)}`}
                  icon={<CreditCard size={20} />}
                  color="success"
                  variant="soft"
                />
              </>
            )}

            {roleName === Role.medical_staff && (
              <>
                <StatCard
                  title="Citas Atendidas"
                  value={stats.counts.appointmentsAttended}
                  icon={<Calendar size={20} />}
                  color="info"
                  variant="soft"
                />
                <StatCard
                  title="Registros Médicos"
                  value={stats.counts.patientRecords}
                  icon={<FileText size={20} />}
                  color="info"
                  variant="soft"
                />
                <StatCard
                  title="Citas Últimos 30 Días"
                  value={stats.appointmentsLast30Days ?? 0}
                  icon={<Activity size={20} />}
                  color="warning"
                  variant="soft"
                />
              </>
            )}

            {roleName === Role.admin && (
              <>
                <StatCard
                  title="Citas Creadas"
                  value={stats.counts.appointmentsCreated}
                  icon={<Calendar size={20} />}
                  color="info"
                  variant="soft"
                />
                <StatCard
                  title="Citas Atendidas"
                  value={stats.counts.appointmentsAttended}
                  icon={<Calendar size={20} />}
                  color="success"
                  variant="soft"
                />
                <StatCard
                  title="Registros Médicos"
                  value={stats.counts.patientRecords}
                  icon={<FileText size={20} />}
                  color="info"
                  variant="soft"
                />
              </>
            )}

            {roleName === Role.assistant && (
              <>
                <StatCard
                  title="Citas Atendidas"
                  value={stats.counts.appointmentsAttended}
                  icon={<Calendar size={20} />}
                  color="info"
                  variant="soft"
                />
                <StatCard
                  title="Registros Médicos"
                  value={stats.counts.patientRecords}
                  icon={<FileText size={20} />}
                  color="info"
                  variant="soft"
                />
              </>
            )}

          </div>
        </div>
      )}

      {/* Deactivate/Activate modal */}
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

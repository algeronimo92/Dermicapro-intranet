import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { usersService, CreateUserDto, UpdateUserDto } from '../services/users.service';
import api from '../services/api';
import { Modal } from './Modal';
import { Input } from './Input';
import { Select } from './Select';
import { DatePicker } from './DatePicker';
import { utcToLocalDate } from '../utils/dateUtils';

interface RoleOption {
  id: string;
  name: string;
  displayName: string;
}

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (user: User) => void;
  userId?: string;
}

const EMPTY_FORM = {
  email: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  lastName: '',
  roleId: '',
  sex: '' as '' | 'M' | 'F' | 'Other',
  dateOfBirth: '',
  isActive: true,
};

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  userId,
}) => {
  const isEdit = !!userId;
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadRoles();
      if (!isEdit) {
        setForm(EMPTY_FORM);
        setErrors({});
        setError(null);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && isEdit && userId && availableRoles.length > 0) {
      loadUser(userId);
    }
  }, [isOpen, userId, availableRoles.length]);

  const loadRoles = async () => {
    try {
      const { data } = await api.get<RoleOption[]>('/roles');
      setAvailableRoles(data);
    } catch {
      console.error('Error loading roles');
    }
  };

  const loadUser = async (id: string) => {
    try {
      setIsLoadingData(true);
      const user = await usersService.getUser(id);
      let roleId = '';
      if (user.role) {
        if (typeof user.role === 'string') {
          roleId = availableRoles.find(r => r.name === user.role)?.id || '';
        } else {
          roleId = user.role.id;
        }
      }
      setForm({
        email: user.email,
        password: '',
        confirmPassword: '',
        firstName: user.firstName,
        lastName: user.lastName,
        roleId,
        sex: user.sex || '',
        dateOfBirth: user.dateOfBirth ? utcToLocalDate(user.dateOfBirth) : '',
        isActive: user.isActive,
      });
    } catch {
      setError('Error al cargar datos del empleado');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setForm(prev => ({ ...prev, [name]: finalValue }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'El nombre es requerido';
    if (!form.lastName.trim()) e.lastName = 'El apellido es requerido';
    if (!form.email.trim()) e.email = 'El correo electrónico es requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'El correo no es válido';
    if (!isEdit) {
      if (!form.password) e.password = 'La contraseña es requerida';
      else if (form.password.length < 6) e.password = 'Mínimo 6 caracteres';
      if (form.password !== form.confirmPassword) e.confirmPassword = 'Las contraseñas no coinciden';
    } else if (form.password) {
      if (form.password.length < 6) e.password = 'Mínimo 6 caracteres';
      if (form.password !== form.confirmPassword) e.confirmPassword = 'Las contraseñas no coinciden';
    }
    if (!form.roleId) e.roleId = 'El rol es requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    try {
      setIsSaving(true);

      let saved: User;
      if (isEdit && userId) {
        const data: UpdateUserDto = {
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          roleId: form.roleId,
          sex: form.sex || undefined,
          dateOfBirth: form.dateOfBirth || undefined,
          isActive: form.isActive,
        };
        if (form.password) data.password = form.password;
        saved = await usersService.updateUser(userId, data);
      } else {
        const data: CreateUserDto = {
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          roleId: form.roleId,
          sex: form.sex || undefined,
          dateOfBirth: form.dateOfBirth || undefined,
        };
        saved = await usersService.createUser(data);
      }

      onClose();
      onSaved(saved);
    } catch (err: any) {
      setError(err.response?.data?.error || `Error al ${isEdit ? 'actualizar' : 'crear'} empleado`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Editar Empleado' : 'Nuevo Empleado'}
      size="large"
    >
      {isLoadingData ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-xl)' }}>
          <div className="spinner" />
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="alert alert-error" style={{ marginBottom: 'var(--spacing-md)' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
            {/* Columna izquierda — Info personal */}
            <div>
              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-md)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Información Personal
              </div>
              <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                <Input label="Nombres *" name="firstName" value={form.firstName} onChange={handleChange} error={errors.firstName} placeholder="Juan Carlos" />
                <Input label="Apellidos *" name="lastName" value={form.lastName} onChange={handleChange} error={errors.lastName} placeholder="Pérez García" />
                <Input label="Correo Electrónico *" type="email" name="email" value={form.email} onChange={handleChange} error={errors.email} placeholder="ejemplo@dermicapro.com" />
                <Select
                  label="Sexo"
                  name="sex"
                  value={form.sex}
                  onChange={handleChange}
                  options={[
                    { value: '', label: 'Seleccionar...' },
                    { value: 'M', label: 'Masculino' },
                    { value: 'F', label: 'Femenino' },
                    { value: 'Other', label: 'Otro' },
                  ]}
                />
                <DatePicker
                  label="Fecha de Nacimiento"
                  value={form.dateOfBirth}
                  onChange={(v) => setForm(prev => ({ ...prev, dateOfBirth: v }))}
                  maxDate={new Date()}
                />
              </div>
            </div>

            {/* Columna derecha — Info de acceso */}
            <div>
              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-md)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Información de Acceso
              </div>
              <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                <Select
                  label="Rol *"
                  name="roleId"
                  value={form.roleId}
                  onChange={handleChange}
                  error={errors.roleId}
                  options={availableRoles.map(r => ({ value: r.id, label: r.displayName }))}
                />
                <Input
                  label={isEdit ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  error={errors.password}
                  placeholder="••••••••"
                />
                <Input
                  label={isEdit ? 'Confirmar Nueva Contraseña' : 'Confirmar Contraseña *'}
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  error={errors.confirmPassword}
                  placeholder="••••••••"
                />
                {isEdit && (
                  <label className="checkbox-modern" style={{ marginTop: 'var(--spacing-sm)' }}>
                    <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} />
                    <span className="checkbox-custom" />
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>Usuario Activo</span>
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="action-btn secondary" onClick={onClose} disabled={isSaving}>
              Cancelar
            </button>
            <button type="submit" className="action-btn primary" disabled={isSaving}>
              {isSaving ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Empleado'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usersService, CreateUserDto, UpdateUserDto } from '../services/users.service';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Loading } from '../components/Loading';
import { useAuth } from '../contexts/AuthContext';
import { hasRole } from '../utils/roleHelpers';
import { Role } from '../types';
import { utcToLocalDate } from '../utils/dateUtils';

interface RoleOption {
  id: string;
  name: string;
  displayName: string;
}

export const EmployeeFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const isEditMode = !!id;

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    roleId: '', // Ahora guardamos el ID del rol
    sex: '' as '' | 'M' | 'F' | 'Other',
    dateOfBirth: '',
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    if (isEditMode && id) {
      loadUser(id);
    }
  }, [id, availableRoles]); // Agregar availableRoles como dependencia

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

  const loadUser = async (userId: string) => {
    try {
      setIsLoading(true);
      const user = await usersService.getUser(userId);

      // Extraer el ID del rol del usuario
      let roleId = '';
      if (user.role) {
        if (typeof user.role === 'string') {
          // Formato legacy - buscar el rol por nombre
          const foundRole = availableRoles.find(r => r.name === user.role);
          roleId = foundRole?.id || '';
        } else {
          // Nuevo formato - usar el ID directamente
          roleId = user.role.id;
        }
      }

      setFormData({
        email: user.email,
        password: '',
        confirmPassword: '',
        firstName: user.firstName,
        lastName: user.lastName,
        roleId: roleId,
        sex: user.sex || '',
        dateOfBirth: user.dateOfBirth ? utcToLocalDate(user.dateOfBirth) : '',
        isActive: user.isActive,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar empleado');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const finalValue =
      type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: finalValue,
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'El nombre es requerido';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'El apellido es requerido';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'El correo electrónico es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El correo electrónico no es válido';
    }

    if (!isEditMode) {
      // En modo creación, la contraseña es requerida
      if (!formData.password) {
        newErrors.password = 'La contraseña es requerida';
      } else if (formData.password.length < 6) {
        newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Las contraseñas no coinciden';
      }
    } else {
      // En modo edición, validar solo si se ingresó contraseña
      if (formData.password) {
        if (formData.password.length < 6) {
          newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
        }
        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Las contraseñas no coinciden';
        }
      }
    }

    if (!formData.roleId) {
      newErrors.roleId = 'El rol es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      // Encontrar el nombre del rol por su ID para compatibilidad con backend
      const selectedRole = availableRoles.find(r => r.id === formData.roleId);
      const roleName = selectedRole?.name as Role;

      if (isEditMode && id) {
        const updateData: UpdateUserDto = {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: roleName,
          sex: formData.sex || undefined,
          dateOfBirth: formData.dateOfBirth || undefined,
          isActive: formData.isActive,
        };

        // Solo incluir password si se proporcionó uno nuevo
        if (formData.password) {
          updateData.password = formData.password;
        }

        await usersService.updateUser(id, updateData);
      } else {
        const createData: CreateUserDto = {
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: roleName,
          sex: formData.sex || undefined,
          dateOfBirth: formData.dateOfBirth || undefined,
        };

        await usersService.createUser(createData);
      }

      navigate('/employees');
    } catch (err: any) {
      setError(
        err.response?.data?.error || 'Error al guardar empleado'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/employees');
  };

  // Solo admins pueden acceder
  if (!hasRole(currentUser, 'admin')) {
    return (
      <div className="page-container">
        <div className="error-banner">
          No tienes permisos para ver esta página
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <Loading text="Cargando datos del empleado..." />;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{isEditMode ? 'Editar Empleado' : 'Nuevo Empleado'}</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={handleSubmit} className="form-container">
        <div className="form-grid">
          <div className="form-column">
            <h3>Información Personal</h3>

            <Input
              label="Nombres *"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              error={errors.firstName}
              placeholder="Juan Carlos"
            />

            <Input
              label="Apellidos *"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              error={errors.lastName}
              placeholder="Pérez García"
            />

            <Input
              label="Correo Electrónico *"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              placeholder="ejemplo@dermicapro.com"
            />

            <Select
              label="Sexo"
              name="sex"
              value={formData.sex}
              onChange={handleChange}
              error={errors.sex}
              options={[
                { value: '', label: 'Seleccionar...' },
                { value: 'M', label: 'Masculino' },
                { value: 'F', label: 'Femenino' },
                { value: 'Other', label: 'Otro' },
              ]}
            />

            <Input
              label="Fecha de Nacimiento"
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              error={errors.dateOfBirth}
            />
          </div>

          <div className="form-column">
            <h3>Información de Acceso</h3>

            <Select
              label="Rol *"
              name="roleId"
              value={formData.roleId}
              onChange={handleChange}
              error={errors.roleId}
              options={availableRoles.map(role => ({
                value: role.id,
                label: role.displayName,
              }))}
            />

            <Input
              label={isEditMode ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              placeholder="••••••••"
            />

            <Input
              label={isEditMode ? 'Confirmar Nueva Contraseña' : 'Confirmar Contraseña *'}
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              placeholder="••••••••"
            />

            {isEditMode && (
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                  />
                  <span>Usuario Activo</span>
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="form-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSaving}
            disabled={isSaving}
          >
            {isEditMode ? 'Guardar Cambios' : 'Crear Empleado'}
          </Button>
        </div>
      </form>
    </div>
  );
};

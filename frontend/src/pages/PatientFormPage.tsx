import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { patientsService, CreatePatientDto } from '../services/patients.service';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Loading } from '../components/Loading';

export const PatientFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreatePatientDto>({
    firstName: '',
    lastName: '',
    dni: '',
    dateOfBirth: '',
    sex: 'M',
    phone: '',
    email: '',
    address: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEditMode && id) {
      loadPatient(id);
    }
  }, [id]);

  const loadPatient = async (patientId: string) => {
    try {
      setIsLoading(true);
      const patient = await patientsService.getPatient(patientId);
      setFormData({
        firstName: patient.firstName,
        lastName: patient.lastName,
        dni: patient.dni,
        dateOfBirth: patient.dateOfBirth.split('T')[0], // Format for input type="date"
        sex: patient.sex,
        phone: patient.phone || '',
        email: patient.email || '',
        address: patient.address || ''
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar paciente');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
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
    if (!formData.dni.trim()) {
      newErrors.dni = 'El DNI es requerido';
    } else if (!/^\d{8}$/.test(formData.dni)) {
      newErrors.dni = 'El DNI debe tener 8 dígitos';
    }
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'La fecha de nacimiento es requerida';
    }
    if (!formData.sex) {
      newErrors.sex = 'El sexo es requerido';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El correo electrónico no es válido';
    }
    if (formData.phone && !/^\d{9}$/.test(formData.phone)) {
      newErrors.phone = 'El teléfono debe tener 9 dígitos';
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

      if (isEditMode && id) {
        await patientsService.updatePatient(id, formData);
      } else {
        await patientsService.createPatient(formData);
      }

      navigate('/patients');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar paciente');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/patients');
  };

  if (isLoading) {
    return <Loading text="Cargando datos del paciente..." />;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{isEditMode ? 'Editar Paciente' : 'Nuevo Paciente'}</h1>
      </div>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

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
              label="DNI *"
              name="dni"
              value={formData.dni}
              onChange={handleChange}
              error={errors.dni}
              placeholder="12345678"
              maxLength={8}
            />

            <Input
              label="Fecha de Nacimiento *"
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              error={errors.dateOfBirth}
            />

            <Select
              label="Sexo *"
              name="sex"
              value={formData.sex}
              onChange={handleChange}
              error={errors.sex}
              options={[
                { value: 'M', label: 'Masculino' },
                { value: 'F', label: 'Femenino' },
                { value: 'Other', label: 'Otro' }
              ]}
            />
          </div>

          <div className="form-column">
            <h3>Información de Contacto</h3>

            <Input
              label="Teléfono"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              error={errors.phone}
              placeholder="987654321"
              maxLength={9}
            />

            <Input
              label="Correo Electrónico"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              placeholder="ejemplo@correo.com"
            />

            <Input
              label="Dirección"
              name="address"
              value={formData.address}
              onChange={handleChange}
              error={errors.address}
              placeholder="Av. Principal 123, Trujillo"
            />
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
            {isEditMode ? 'Guardar Cambios' : 'Crear Paciente'}
          </Button>
        </div>
      </form>
    </div>
  );
};

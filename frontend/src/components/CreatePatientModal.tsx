import React, { useState } from 'react';
import { Patient } from '../types';
import { patientsService, CreatePatientDto } from '../services/patients.service';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';
import { DatePicker } from './DatePicker';

interface CreatePatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (patient: Patient) => void;
}

const EMPTY_FORM: CreatePatientDto = {
  firstName: '',
  lastName: '',
  dni: '',
  dateOfBirth: '',
  sex: 'F',
  phone: '',
  email: '',
  address: '',
};

export const CreatePatientModal: React.FC<CreatePatientModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [form, setForm] = useState<CreatePatientDto>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setCreateError(null);
    onClose();
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'El nombre es requerido';
    if (!form.lastName.trim()) e.lastName = 'El apellido es requerido';
    if (!form.dni.trim()) e.dni = 'El DNI es requerido';
    else if (!/^\d{8}$/.test(form.dni)) e.dni = 'El DNI debe tener 8 dígitos';
    if (!form.dateOfBirth) e.dateOfBirth = 'La fecha de nacimiento es requerida';
    if (!form.phone?.trim()) e.phone = 'El teléfono es requerido';
    else if (!/^\d{9}$/.test(form.phone)) e.phone = 'El teléfono debe tener 9 dígitos';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      setIsCreating(true);
      setCreateError(null);
      const created = await patientsService.createPatient(form);
      handleClose();
      onCreated(created);
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Error al crear paciente');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Crear Nuevo Paciente">
      <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
        {createError && (
          <div className="error-banner">{createError}</div>
        )}
        <Input
          label="Nombre *"
          name="firstName"
          value={form.firstName}
          onChange={handleChange}
          error={errors.firstName}
          placeholder="Ingrese el nombre"
        />
        <Input
          label="Apellido *"
          name="lastName"
          value={form.lastName}
          onChange={handleChange}
          error={errors.lastName}
          placeholder="Ingrese el apellido"
        />
        <Input
          label="DNI *"
          name="dni"
          value={form.dni}
          onChange={handleChange}
          error={errors.dni}
          placeholder="12345678"
          maxLength={8}
        />
        <DatePicker
          label="Fecha de Nacimiento *"
          value={form.dateOfBirth}
          onChange={(v) => {
            setForm(prev => ({ ...prev, dateOfBirth: v }));
            if (errors.dateOfBirth) setErrors(prev => ({ ...prev, dateOfBirth: '' }));
          }}
          error={errors.dateOfBirth}
          maxDate={new Date()}
        />
        <Select
          label="Sexo *"
          name="sex"
          value={form.sex}
          onChange={handleChange}
          options={[
            { value: 'F', label: 'Femenino' },
            { value: 'M', label: 'Masculino' },
          ]}
        />
        <Input
          label="Teléfono *"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          error={errors.phone}
          placeholder="987654321"
          maxLength={9}
        />
        <Input
          label="Email"
          type="email"
          name="email"
          value={form.email || ''}
          onChange={handleChange}
          error={errors.email}
          placeholder="ejemplo@correo.com"
        />
        <Input
          label="Dirección"
          name="address"
          value={form.address || ''}
          onChange={handleChange}
          placeholder="Dirección completa"
        />
      </div>
      <div className="modal-actions">
        <Button type="button" variant="secondary" onClick={handleClose} disabled={isCreating}>
          Cancelar
        </Button>
        <Button type="button" variant="primary" onClick={handleSubmit} isLoading={isCreating} disabled={isCreating}>
          Crear Paciente
        </Button>
      </div>
    </Modal>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Patient } from '../types';
import { patientsService, CreatePatientDto } from '../services/patients.service';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';
import { Modal } from './Modal';

interface PatientSelectorProps {
  value: string;
  onChange: (patientId: string) => void;
  error?: string;
  disabled?: boolean;
}

export const PatientSelector: React.FC<PatientSelectorProps> = ({
  value,
  onChange,
  error,
  disabled
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [newPatient, setNewPatient] = useState<CreatePatientDto>({
    firstName: '',
    lastName: '',
    dni: '',
    dateOfBirth: '',
    sex: 'F',
    phone: '',
    email: '',
    address: ''
  });

  const [patientErrors, setPatientErrors] = useState<Record<string, string>>({});
  const dropdownContentRef = useRef<HTMLDivElement>(null);

  const selectedPatient = patients.find(p => p.id === value);

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    // Filtrar pacientes basado en el término de búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const filtered = patients.filter(p =>
        p.firstName.toLowerCase().includes(term) ||
        p.lastName.toLowerCase().includes(term) ||
        p.dni.includes(term) ||
        (p.phone && p.phone.includes(term)) ||
        (p.email && p.email.toLowerCase().includes(term))
      );
      setFilteredPatients(filtered);
    } else {
      setFilteredPatients(patients);
    }
  }, [searchTerm, patients]);

  useEffect(() => {
    // Cerrar dropdown al hacer clic fuera
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Verificar si el clic fue fuera del input Y fuera del dropdown
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        dropdownContentRef.current &&
        !dropdownContentRef.current.contains(target)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadPatients = async () => {
    try {
      setIsLoadingPatients(true);
      const response = await patientsService.getPatients({ limit: 1000 });
      setPatients(response.data);
      setFilteredPatients(response.data);
    } catch (err) {
      console.error('Error loading patients:', err);
    } finally {
      setIsLoadingPatients(false);
    }
  };

  const handleSelectPatient = (patientId: string) => {
    onChange(patientId);
    setIsDropdownOpen(false);
    setSearchTerm('');
  };

  const handleClearSelection = () => {
    onChange('');
    setSearchTerm('');
  };

  const validateNewPatient = (): boolean => {
    const errors: Record<string, string> = {};

    if (!newPatient.firstName.trim()) {
      errors.firstName = 'El nombre es requerido';
    }
    if (!newPatient.lastName.trim()) {
      errors.lastName = 'El apellido es requerido';
    }
    if (!newPatient.dni.trim()) {
      errors.dni = 'El DNI es requerido';
    } else if (!/^\d{8}$/.test(newPatient.dni)) {
      errors.dni = 'El DNI debe tener 8 dígitos';
    }
    if (!newPatient.dateOfBirth) {
      errors.dateOfBirth = 'La fecha de nacimiento es requerida';
    }
    if (!newPatient.phone || !newPatient.phone.trim()) {
      errors.phone = 'El teléfono es requerido';
    } else if (!/^\d{9}$/.test(newPatient.phone)) {
      errors.phone = 'El teléfono debe tener 9 dígitos';
    }
    if (newPatient.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newPatient.email)) {
      errors.email = 'Email inválido';
    }

    setPatientErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreatePatient = async () => {
    if (!validateNewPatient()) {
      return;
    }

    try {
      setIsCreating(true);
      setCreateError(null);
      const created = await patientsService.createPatient(newPatient);

      // Actualizar lista de pacientes
      setPatients(prev => [created, ...prev]);

      // Seleccionar el paciente recién creado
      onChange(created.id);

      // Cerrar modal y resetear formulario
      setShowCreateModal(false);
      setNewPatient({
        firstName: '',
        lastName: '',
        dni: '',
        dateOfBirth: '',
        sex: 'F',
        phone: '',
        email: '',
        address: ''
      });
      setPatientErrors({});
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Error al crear paciente');
    } finally {
      setIsCreating(false);
    }
  };

  const handleNewPatientChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewPatient(prev => ({ ...prev, [name]: value }));
    if (patientErrors[name]) {
      setPatientErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="patient-selector">
      <label className="input-label">
        Paciente *
      </label>

      <div className="patient-selector-controls">
        {selectedPatient ? (
          <div className="patient-selected">
            <div className="patient-info">
              <strong>{selectedPatient.firstName} {selectedPatient.lastName}</strong>
              <span className="patient-details">DNI: {selectedPatient.dni} | Tel: {selectedPatient.phone}</span>
            </div>
            <button
              type="button"
              className="btn-clear-patient"
              onClick={handleClearSelection}
              disabled={disabled}
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="patient-search-container" ref={dropdownRef}>
            <input
              type="text"
              className={`input ${error ? 'input-error' : ''}`}
              placeholder="Buscar por nombre, DNI o teléfono..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              disabled={disabled}
            />

            {isDropdownOpen && dropdownRef.current && createPortal(
              <div
                ref={dropdownContentRef}
                className="patient-dropdown"
                style={{
                  position: 'fixed',
                  top: `${dropdownRef.current.getBoundingClientRect().bottom + 4}px`,
                  left: `${dropdownRef.current.getBoundingClientRect().left}px`,
                  width: `${dropdownRef.current.getBoundingClientRect().width}px`,
                  zIndex: 9999
                }}
              >
                {isLoadingPatients ? (
                  <div className="patient-dropdown-item patient-dropdown-loading">
                    Cargando pacientes...
                  </div>
                ) : filteredPatients.length > 0 ? (
                  <>
                    {filteredPatients.slice(0, 10).map(patient => (
                      <div
                        key={patient.id}
                        className="patient-dropdown-item"
                        onClick={() => handleSelectPatient(patient.id)}
                      >
                        <div className="patient-dropdown-name">
                          {patient.firstName} {patient.lastName}
                        </div>
                        <div className="patient-dropdown-details">
                          DNI: {patient.dni} | Tel: {patient.phone}
                        </div>
                      </div>
                    ))}
                    {filteredPatients.length > 10 && (
                      <div className="patient-dropdown-item patient-dropdown-info">
                        Mostrando 10 de {filteredPatients.length} resultados. Refina tu búsqueda.
                      </div>
                    )}
                  </>
                ) : (
                  <div className="patient-dropdown-item patient-dropdown-empty">
                    No se encontraron pacientes
                  </div>
                )}

                <div className="patient-dropdown-divider" />

                <div
                  className="patient-dropdown-item patient-dropdown-create"
                  onClick={() => {
                    setShowCreateModal(true);
                    setIsDropdownOpen(false);
                  }}
                >
                  + Crear nuevo paciente
                </div>
              </div>,
              document.body
            )}
          </div>
        )}

        <Button
          type="button"
          variant="success"
          onClick={() => setShowCreateModal(true)}
          disabled={disabled}
          style={{ marginLeft: '10px' }}
        >
          + Nuevo Paciente
        </Button>
      </div>

      {error && <span className="input-error-message">{error}</span>}

      {/* Modal para crear nuevo paciente */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setCreateError(null);
          setPatientErrors({});
        }}
        title="Crear Nuevo Paciente"
      >
        <div className="modal-content" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {createError && (
            <div className="error-banner" style={{ marginBottom: '15px' }}>
              {createError}
            </div>
          )}

          <div style={{ display: 'grid', gap: '15px' }}>
            <Input
              label="Nombre *"
              name="firstName"
              value={newPatient.firstName}
              onChange={handleNewPatientChange}
              error={patientErrors.firstName}
              placeholder="Ingrese el nombre"
            />

            <Input
              label="Apellido *"
              name="lastName"
              value={newPatient.lastName}
              onChange={handleNewPatientChange}
              error={patientErrors.lastName}
              placeholder="Ingrese el apellido"
            />

            <Input
              label="DNI *"
              name="dni"
              value={newPatient.dni}
              onChange={handleNewPatientChange}
              error={patientErrors.dni}
              placeholder="12345678"
              maxLength={8}
            />

            <Input
              label="Fecha de Nacimiento *"
              type="date"
              name="dateOfBirth"
              value={newPatient.dateOfBirth}
              onChange={handleNewPatientChange}
              error={patientErrors.dateOfBirth}
            />

            <Select
              label="Sexo *"
              name="sex"
              value={newPatient.sex}
              onChange={handleNewPatientChange}
              options={[
                { value: 'F', label: 'Femenino' },
                { value: 'M', label: 'Masculino' }
              ]}
            />

            <Input
              label="Teléfono *"
              name="phone"
              value={newPatient.phone}
              onChange={handleNewPatientChange}
              error={patientErrors.phone}
              placeholder="987654321"
              maxLength={9}
            />

            <Input
              label="Email"
              type="email"
              name="email"
              value={newPatient.email}
              onChange={handleNewPatientChange}
              error={patientErrors.email}
              placeholder="ejemplo@correo.com"
            />

            <Input
              label="Dirección"
              name="address"
              value={newPatient.address}
              onChange={handleNewPatientChange}
              placeholder="Dirección completa"
            />
          </div>

          <div className="modal-actions" style={{ marginTop: '20px' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false);
                setCreateError(null);
                setPatientErrors({});
              }}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleCreatePatient}
              isLoading={isCreating}
              disabled={isCreating}
            >
              Crear Paciente
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

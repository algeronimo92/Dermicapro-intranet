import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Patient } from '../types';
import { patientsService } from '../services/patients.service';
import { Button } from './Button';
import { CreatePatientModal } from './CreatePatientModal';

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
  const dropdownRef = useRef<HTMLDivElement>(null);
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

  const handlePatientCreated = (created: Patient) => {
    setPatients(prev => [created, ...prev]);
    onChange(created.id);
    setShowCreateModal(false);
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

      <CreatePatientModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handlePatientCreated}
      />
    </div>
  );
};

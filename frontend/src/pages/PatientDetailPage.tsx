import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { patientsService } from '../services/patients.service';
import { Patient, Sex, Role } from '../types';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';
import { Modal } from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';

export const PatientDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      loadPatient(id);
    }
  }, [id]);

  const loadPatient = async (patientId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await patientsService.getPatient(patientId);
      setPatient(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar paciente');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/patients/${id}/edit`);
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      setIsDeleting(true);
      await patientsService.deletePatient(id);
      navigate('/patients');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar paciente');
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBack = () => {
    navigate('/patients');
  };

  const handleViewHistory = () => {
    navigate(`/patients/${id}/history`);
  };

  const handleCreateAppointment = () => {
    navigate(`/appointments/new?patientId=${id}`);
  };

  if (isLoading) {
    return <Loading text="Cargando información del paciente..." />;
  }

  if (error || !patient) {
    return (
      <div className="page-container">
        <div className="error-banner">
          {error || 'Paciente no encontrado'}
        </div>
        <Button onClick={handleBack}>Volver</Button>
      </div>
    );
  }

  const sexLabels: Record<Sex, string> = {
    M: 'Masculino',
    F: 'Femenino',
    Other: 'Otro'
  };

  const canDelete = user?.role === Role.admin;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <Button variant="secondary" onClick={handleBack}>
            ← Volver
          </Button>
          <h1>Detalle del Paciente</h1>
        </div>
        <div className="header-actions">
          <Button variant="primary" onClick={handleCreateAppointment}>
            + Nueva Cita
          </Button>
          <Button variant="secondary" onClick={handleEdit}>
            Editar
          </Button>
          {canDelete && (
            <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
              Eliminar
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
              <span>{patient.firstName}</span>
            </div>
            <div className="detail-item">
              <label>Apellidos:</label>
              <span>{patient.lastName}</span>
            </div>
            <div className="detail-item">
              <label>DNI:</label>
              <span>{patient.dni}</span>
            </div>
            <div className="detail-item">
              <label>Fecha de Nacimiento:</label>
              <span>{new Date(patient.dateOfBirth).toLocaleDateString('es-PE')}</span>
            </div>
            <div className="detail-item">
              <label>Edad:</label>
              <span>
                {Math.floor(
                  (new Date().getTime() - new Date(patient.dateOfBirth).getTime()) /
                  (365.25 * 24 * 60 * 60 * 1000)
                )} años
              </span>
            </div>
            <div className="detail-item">
              <label>Sexo:</label>
              <span>{sexLabels[patient.sex]}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h2>Información de Contacto</h2>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Teléfono:</label>
              <span>{patient.phone || 'No registrado'}</span>
            </div>
            <div className="detail-item">
              <label>Correo Electrónico:</label>
              <span>{patient.email || 'No registrado'}</span>
            </div>
            <div className="detail-item full-width">
              <label>Dirección:</label>
              <span>{patient.address || 'No registrada'}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h2>Información del Sistema</h2>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Fecha de Registro:</label>
              <span>{new Date(patient.createdAt).toLocaleString('es-PE')}</span>
            </div>
            <div className="detail-item">
              <label>ID del Sistema:</label>
              <span className="text-muted">{patient.id}</span>
            </div>
          </div>
        </div>

        <div className="detail-actions">
          <Button variant="primary" onClick={handleViewHistory}>
            Ver Historial Médico
          </Button>
        </div>
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirmar Eliminación"
      >
        <div className="modal-content">
          <p>
            ¿Está seguro que desea eliminar al paciente{' '}
            <strong>{patient.firstName} {patient.lastName}</strong>?
          </p>
          <p className="text-danger">
            Esta acción no se puede deshacer y eliminará toda la información
            asociada al paciente.
          </p>
          <div className="modal-actions">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={isDeleting}
              disabled={isDeleting}
            >
              Eliminar Paciente
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

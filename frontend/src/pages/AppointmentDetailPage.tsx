import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { appointmentsService } from '../services/appointments.service';
import { Appointment, AppointmentStatus, Role } from '../types';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';
import { Modal } from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { addToGoogleCalendar, downloadICSFile } from '../utils/googleCalendar';

// Helper function to get full URL for receipt
const getReceiptUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  // If it's already a full URL, return it
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // Otherwise, prepend the API base URL (without /api)
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  const serverUrl = baseUrl.replace('/api', '');
  return `${serverUrl}${path}`;
};

export const AppointmentDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    if (id) {
      loadAppointment(id);
    }
  }, [id]);

  const loadAppointment = async (appointmentId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await appointmentsService.getAppointment(appointmentId);
      setAppointment(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar cita');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/appointments/${id}/edit`);
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      setIsDeleting(true);
      await appointmentsService.deleteAppointment(id);
      navigate('/appointments');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar cita');
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMarkAsAttended = async () => {
    if (!id) return;

    try {
      const updated = await appointmentsService.markAsAttended(id);
      setAppointment(updated);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al marcar como atendida');
    }
  };

  const handleStatusChange = async (newStatus: AppointmentStatus) => {
    if (!id || !appointment) return;

    try {
      setIsUpdatingStatus(true);
      setError(null);
      const updated = await appointmentsService.updateAppointment(id, { status: newStatus });
      setAppointment(updated);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al actualizar estado');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleUploadReceipt = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setError('Solo se permiten archivos JPG, PNG o PDF');
      return;
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo no debe superar los 5MB');
      return;
    }

    try {
      setIsUploadingReceipt(true);
      setError(null);
      setUploadSuccess(false);
      const updated = await appointmentsService.uploadReceipt(id, file);
      setAppointment(updated);
      setUploadSuccess(true);
      // Hide success message after 3 seconds
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al subir recibo');
    } finally {
      setIsUploadingReceipt(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleBack = () => {
    navigate('/appointments');
  };

  const handleViewPatient = () => {
    if (appointment?.patientId) {
      navigate(`/patients/${appointment.patientId}`);
    }
  };

  if (isLoading) {
    return <Loading text="Cargando información de la cita..." />;
  }

  if (error && !appointment) {
    return (
      <div className="page-container">
        <div className="error-banner">
          {error}
        </div>
        <Button onClick={handleBack}>Volver</Button>
      </div>
    );
  }

  if (!appointment) {
    return <div className="page-container"><p>Cita no encontrada</p></div>;
  }

  const statusLabels: Record<AppointmentStatus, string> = {
    reserved: 'Reservada',
    attended: 'Atendida',
    cancelled: 'Cancelada',
    no_show: 'No asistió'
  };

  const statusColors: Record<AppointmentStatus, string> = {
    reserved: 'status-reserved',
    attended: 'status-attended',
    cancelled: 'status-cancelled',
    no_show: 'status-no-show'
  };

  const canDelete = user?.role === Role.admin;
  const canMarkAttended = user?.role === Role.admin || user?.role === Role.nurse;
  const canEdit = user?.role === Role.admin || user?.role === Role.sales;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <Button variant="secondary" onClick={handleBack}>
            ← Volver
          </Button>
          <h1>Detalle de la Cita</h1>
        </div>
        <div className="header-actions">
          {appointment.status === 'reserved' && canMarkAttended && (
            <Button variant="success" onClick={handleMarkAsAttended}>
              Marcar como Atendida
            </Button>
          )}
          {canEdit && (
            <Button variant="secondary" onClick={handleEdit}>
              Editar
            </Button>
          )}
          {canDelete && (
            <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
              Eliminar
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      <div className="detail-container">
        <div className="detail-section">
          <h2>Información de la Cita</h2>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Estado:</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className={`status-badge ${statusColors[appointment.status]}`}>
                  {statusLabels[appointment.status]}
                </span>
                {canMarkAttended && (
                  <select
                    value={appointment.status}
                    onChange={(e) => handleStatusChange(e.target.value as AppointmentStatus)}
                    disabled={isUpdatingStatus}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      fontSize: '14px',
                      cursor: 'pointer',
                      backgroundColor: isUpdatingStatus ? '#f5f5f5' : 'white'
                    }}
                  >
                    <option value="reserved">Reservada</option>
                    <option value="attended">Atendida</option>
                    <option value="cancelled">Cancelada</option>
                    <option value="no_show">No asistió</option>
                  </select>
                )}
              </div>
            </div>
            <div className="detail-item">
              <label>Fecha y Hora:</label>
              <span>{new Date(appointment.scheduledDate).toLocaleString('es-PE')}</span>
            </div>
            <div className="detail-item">
              <label>Paciente:</label>
              <span>
                {appointment.patient
                  ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
                  : '-'}
              </span>
            </div>
            <div className="detail-item">
              <label>Servicio:</label>
              <span>{appointment.service?.name || '-'}</span>
            </div>
            <div className="detail-item">
              <label>Precio del Servicio:</label>
              <span>
                {appointment.service?.basePrice
                  ? `S/. ${Number(appointment.service.basePrice).toFixed(2)}`
                  : 'S/. 0.00'}
              </span>
            </div>
            <div className="detail-item full-width">
              <label>Notas:</label>
              <span>{appointment.notes || 'Sin notas'}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h2>Información de Pago</h2>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Monto de Reserva:</label>
              <span>
                {appointment.reservationAmount
                  ? `S/. ${Number(appointment.reservationAmount).toFixed(2)}`
                  : 'No se pagó reserva'}
              </span>
            </div>
            <div className="detail-item full-width">
              <label>Recibo:</label>
              {appointment.reservationReceiptUrl ? (
                <div style={{ marginTop: '10px' }}>
                  {/* Preview for images */}
                  {(appointment.reservationReceiptUrl.toLowerCase().endsWith('.jpg') ||
                    appointment.reservationReceiptUrl.toLowerCase().endsWith('.jpeg') ||
                    appointment.reservationReceiptUrl.toLowerCase().endsWith('.png')) && (
                    <div style={{ marginBottom: '10px' }}>
                      <img
                        src={getReceiptUrl(appointment.reservationReceiptUrl) || ''}
                        alt="Recibo"
                        style={{
                          maxWidth: '300px',
                          maxHeight: '300px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                        onClick={() => window.open(getReceiptUrl(appointment.reservationReceiptUrl) || '', '_blank')}
                      />
                    </div>
                  )}
                  <a
                    href={getReceiptUrl(appointment.reservationReceiptUrl) || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      padding: '8px 16px',
                      backgroundColor: '#3498db',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  >
                    📄 Ver recibo en nueva pestaña
                  </a>
                </div>
              ) : (
                <span>No subido</span>
              )}
            </div>
          </div>

          {uploadSuccess && (
            <div style={{
              marginTop: '15px',
              padding: '10px 15px',
              backgroundColor: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: '4px',
              color: '#155724'
            }}>
              ✓ Recibo subido exitosamente
            </div>
          )}

          {!appointment.reservationReceiptUrl && appointment.status === 'reserved' && (
            <div style={{ marginTop: '15px' }}>
              <Button
                variant="primary"
                onClick={handleUploadReceipt}
                isLoading={isUploadingReceipt}
                disabled={isUploadingReceipt}
              >
                {isUploadingReceipt ? 'Subiendo...' : 'Subir Recibo'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,application/pdf"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <p style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '10px' }}>
                Formatos permitidos: JPG, PNG, PDF (máx. 5MB)
              </p>
            </div>
          )}

          {appointment.reservationReceiptUrl && appointment.status === 'reserved' && (
            <div style={{ marginTop: '15px' }}>
              <Button
                variant="secondary"
                onClick={handleUploadReceipt}
                isLoading={isUploadingReceipt}
                disabled={isUploadingReceipt}
              >
                {isUploadingReceipt ? 'Subiendo...' : 'Reemplazar Recibo'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,application/pdf"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          )}
        </div>

        <div className="detail-section">
          <h2>Información del Sistema</h2>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Creado por:</label>
              <span>
                {appointment.createdBy
                  ? `${appointment.createdBy.firstName} ${appointment.createdBy.lastName}`
                  : '-'}
              </span>
            </div>
            <div className="detail-item">
              <label>Fecha de Creación:</label>
              <span>{new Date(appointment.createdAt).toLocaleString('es-PE')}</span>
            </div>
            {appointment.attendedBy && (
              <div className="detail-item">
                <label>Atendido por:</label>
                <span>
                  {`${appointment.attendedBy.firstName} ${appointment.attendedBy.lastName}`}
                </span>
              </div>
            )}
            {appointment.attendedAt && (
              <div className="detail-item">
                <label>Fecha de Atención:</label>
                <span>{new Date(appointment.attendedAt).toLocaleString('es-PE')}</span>
              </div>
            )}
            <div className="detail-item">
              <label>ID del Sistema:</label>
              <span className="text-muted">{appointment.id}</span>
            </div>
          </div>
        </div>

        <div className="detail-actions">
          <Button variant="primary" onClick={handleViewPatient}>
            Ver Información del Paciente
          </Button>
          <Button variant="success" onClick={() => addToGoogleCalendar(appointment)}>
            📅 Agregar a Google Calendar
          </Button>
          <Button variant="secondary" onClick={() => downloadICSFile(appointment)}>
            📥 Descargar Evento (.ics)
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
            ¿Está seguro que desea eliminar esta cita?
          </p>
          <p className="text-danger">
            Esta acción no se puede deshacer.
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
              Eliminar Cita
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

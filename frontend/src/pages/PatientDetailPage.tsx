import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { patientsService } from '../services/patients.service';
import { Patient, Sex, Role, InvoiceStatus } from '../types';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';
import { Modal } from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, calculateAge } from '../utils/dateUtils';

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

  const handleViewInvoices = () => {
    navigate(`/patients/${id}/invoices`);
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

  const age = calculateAge(patient.dateOfBirth);

  // Calcular estadísticas de órdenes/tratamientos
  const allOrders = patient.orders || [];

  const activeOrders = allOrders.filter(order => {
    const sessionsCompleted = order.appointmentServices?.length || 0;
    return sessionsCompleted < order.totalSessions;
  });

  const completedOrders = allOrders.filter(order => {
    const sessionsCompleted = order.appointmentServices?.length || 0;
    return sessionsCompleted >= order.totalSessions;
  });

  // Obtener última cita atendida desde las órdenes que tienen servicios
  // Si hay tratamientos (activos o completados), significa que hay citas atendidas
  const appointmentsFromOrders = allOrders
    .flatMap(order =>
      (order.appointmentServices || []).map(as => as.appointment)
    )
    .filter((apt): apt is NonNullable<typeof apt> => apt != null)
    .sort((a, b) => {
      const dateA = new Date(a.scheduledDate).getTime();
      const dateB = new Date(b.scheduledDate).getTime();
      return dateB - dateA; // Más reciente primero
    });

  // Deduplicar citas (una cita puede tener múltiples servicios)
  const uniqueAppointments = appointmentsFromOrders.filter((apt, index, self) =>
    index === self.findIndex(a => a.id === apt.id)
  );

  const lastAppointment = uniqueAppointments.length > 0 ? uniqueAppointments[0] : null;

  // Calcular facturas únicas (deduplicadas)
  const uniqueInvoices = allOrders
    .filter(order => order.invoice)
    .map(order => order.invoice!)
    .filter((invoice, index, self) =>
      // Deduplicar facturas (varias órdenes pueden tener la misma factura)
      index === self.findIndex(i => i.id === invoice.id)
    );

  // Facturas pendientes y montos
  const pendingInvoices = uniqueInvoices.filter(
    invoice => invoice.status === InvoiceStatus.pending || invoice.status === InvoiceStatus.partial
  );

  const totalPendingAmount = pendingInvoices.reduce((sum, invoice) => {
    const totalPaid = (invoice.payments || []).reduce((paid, payment) => paid + payment.amountPaid, 0);
    return sum + (invoice.totalAmount - totalPaid);
  }, 0);

  return (
    <div className="page-container">
      {/* Hero Section - Patient Header */}
      <div className="patient-hero">
        <div className="patient-hero-content">
          <button onClick={handleBack} className="back-button-hero">
            ← Volver a Pacientes
          </button>

          <div className="patient-hero-main">
            <div className="patient-avatar">
              {patient.firstName[0]}{patient.lastName[0]}
            </div>

            <div className="patient-hero-info">
              <h1 className="patient-hero-name">
                {patient.firstName} {patient.lastName}
              </h1>
              <div className="patient-hero-meta">
                <span className="meta-item">
                  <span className="meta-icon">🆔</span>
                  DNI: {patient.dni}
                </span>
                <span className="meta-separator">•</span>
                <span className="meta-item">
                  <span className="meta-icon">🎂</span>
                  {age} años
                </span>
                <span className="meta-separator">•</span>
                <span className="meta-item">
                  <span className="meta-icon">{patient.sex === 'M' ? '♂' : patient.sex === 'F' ? '♀' : '⚧'}</span>
                  {sexLabels[patient.sex]}
                </span>
              </div>
            </div>
          </div>

          <div className="patient-hero-actions">
            <Button onClick={handleEdit} variant="primary">
              ✏️ Editar
            </Button>
            <Button onClick={handleCreateAppointment} variant="success">
              📅 Nueva Cita
            </Button>
            {canDelete && (
              <Button onClick={() => setShowDeleteModal(true)} variant="danger">
                🗑️
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="patient-dashboard">

        {/* Card 1: Información de Contacto */}
        <div className="dashboard-card info-card">
          <div className="card-header">
            <h2 className="card-title">
              <span className="card-icon">👤</span>
              Información de Contacto
            </h2>
          </div>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Teléfono</span>
                <span className="info-value">
                  {patient.phone ? (
                    <a href={`tel:${patient.phone}`} className="info-link">
                      📞 {patient.phone}
                    </a>
                  ) : (
                    <span className="info-empty">No registrado</span>
                  )}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Email</span>
                <span className="info-value">
                  {patient.email ? (
                    <a href={`mailto:${patient.email}`} className="info-link">
                      ✉️ {patient.email}
                    </a>
                  ) : (
                    <span className="info-empty">No registrado</span>
                  )}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Fecha de Nacimiento</span>
                <span className="info-value">{formatDate(patient.dateOfBirth)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Dirección</span>
                <span className="info-value">
                  {patient.address || <span className="info-empty">No registrada</span>}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Última Atención & Estado */}
        <div className="dashboard-card activity-card">
          <div className="card-header">
            <h2 className="card-title">
              <span className="card-icon">📋</span>
              Última Atención
            </h2>
          </div>
          <div className="card-body">
            {lastAppointment ? (
              <div className="activity-content">
                <div className="last-appointment">
                  <div className="last-appointment-header">
                    Fecha de Atención
                  </div>
                  <div className="last-appointment-details">
                    <div className="last-appointment-date">
                      📅 {formatDate(lastAppointment.scheduledDate)}
                    </div>
                    {(() => {
                      // Buscar los servicios de esta cita desde las órdenes
                      const servicesInAppointment = allOrders
                        .flatMap(order =>
                          (order.appointmentServices || [])
                            .filter(as => as.appointment?.id === lastAppointment.id)
                            .map(as => order.service?.name)
                        )
                        .filter(Boolean);

                      return servicesInAppointment.length > 0 && (
                        <div className="last-appointment-service">
                          {servicesInAppointment.join(', ')}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="activity-stats">
                  <div className="stat-item">
                    <span className="stat-number">{allOrders.length}</span>
                    <span className="stat-label">Total Tratamientos</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{activeOrders.length}</span>
                    <span className="stat-label">Activos</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{completedOrders.length}</span>
                    <span className="stat-label">Completados</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state-simple">
                <div className="empty-state-simple-icon">📭</div>
                <p>Sin atenciones registradas</p>
                <Button onClick={handleCreateAppointment} variant="primary" size="sm">
                  Agendar Primera Cita
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Tratamientos Activos */}
        <div className="dashboard-card treatments-card">
          <div className="card-header">
            <h2 className="card-title">
              <span className="card-icon">💊</span>
              Tratamientos Activos
            </h2>
          </div>
          <div className="card-body">
            {activeOrders.length > 0 ? (
              <div className="treatments-list">
                {activeOrders.slice(0, 4).map((order) => {
                  const sessionsCompleted = order.appointmentServices?.length || 0;
                  const progress = order.totalSessions > 0
                    ? (sessionsCompleted / order.totalSessions) * 100
                    : 0;

                  return (
                    <div key={order.id} className="treatment-item">
                      <div className="treatment-header">
                        <h3 className="treatment-name">
                          {order.service?.name || 'Servicio'}
                        </h3>
                        <span className="treatment-sessions">
                          {sessionsCompleted}/{order.totalSessions}
                        </span>
                      </div>
                      <div className="treatment-progress-container">
                        <div className="treatment-progress-bar">
                          <div
                            className="treatment-progress-fill"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <span className="treatment-progress-text">
                          {Math.round(progress)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
                {activeOrders.length > 4 && (
                  <button
                    className="view-all-link"
                    onClick={handleViewHistory}
                  >
                    Ver todos ({activeOrders.length}) →
                  </button>
                )}
              </div>
            ) : (
              <div className="empty-state-simple">
                <div className="empty-state-simple-icon">💊</div>
                <p>Sin tratamientos activos</p>
              </div>
            )}
          </div>
        </div>

        {/* Card 4: Tratamientos Completados */}
        <div className="dashboard-card completed-card">
          <div className="card-header">
            <h2 className="card-title">
              <span className="card-icon">✅</span>
              Tratamientos Completados
            </h2>
          </div>
          <div className="card-body">
            {completedOrders.length > 0 ? (
              <div className="completed-list">
                {completedOrders.slice(0, 4).map((order) => (
                  <div key={order.id} className="completed-item">
                    <div className="completed-icon">✓</div>
                    <div className="completed-content">
                      <div className="completed-name">
                        {order.service?.name || 'Servicio'}
                      </div>
                      <div className="completed-sessions">
                        {order.totalSessions} sesiones completadas
                      </div>
                    </div>
                  </div>
                ))}
                {completedOrders.length > 4 && (
                  <button
                    className="view-all-link"
                    onClick={handleViewHistory}
                  >
                    Ver todos ({completedOrders.length}) →
                  </button>
                )}
              </div>
            ) : (
              <div className="empty-state-simple">
                <div className="empty-state-simple-icon">📊</div>
                <p>Sin tratamientos completados</p>
              </div>
            )}
          </div>
        </div>

        {/* Card 5: Facturas Pendientes */}
        <div className="dashboard-card invoices-card">
          <div className="card-header">
            <h2 className="card-title">
              <span className="card-icon">💰</span>
              Facturas Pendientes
            </h2>
            {pendingInvoices.length > 0 && (
              <span className="card-badge warning">{pendingInvoices.length}</span>
            )}
          </div>
          <div className="card-body">
            {pendingInvoices.length > 0 ? (
              <div className="invoices-content">
                <div className="pending-amount-banner">
                  <div className="amount-label">Total Pendiente</div>
                  <div className="amount-value">
                    S/ {totalPendingAmount.toFixed(2)}
                  </div>
                </div>

                <div className="invoices-list">
                  {pendingInvoices.slice(0, 3).map((invoice) => {
                    const totalPaid = (invoice.payments || []).reduce((sum, p) => sum + p.amountPaid, 0);
                    const remaining = invoice.totalAmount - totalPaid;

                    return (
                      <div key={invoice.id} className="invoice-item">
                        <div className="invoice-header">
                          <span className="invoice-date">
                            {formatDate(invoice.createdAt)}
                          </span>
                          <span className={`invoice-status ${invoice.status}`}>
                            {invoice.status === InvoiceStatus.pending && '⏳ Pendiente'}
                            {invoice.status === InvoiceStatus.partial && '⚠️ Parcial'}
                          </span>
                        </div>
                        <div className="invoice-amount">
                          <span className="amount-label">Deuda:</span>
                          <span className="amount-value">S/ {remaining.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                  {pendingInvoices.length > 3 && (
                    <button
                      className="view-all-link"
                      onClick={handleViewInvoices}
                    >
                      Ver todas ({pendingInvoices.length}) →
                    </button>
                  )}
                </div>

                <Button
                  onClick={handleViewInvoices}
                  variant="primary"
                  style={{ width: '100%', marginTop: '12px' }}
                >
                  Gestionar Pagos
                </Button>
              </div>
            ) : (
              <div className="empty-state-simple">
                <div className="empty-state-simple-icon">✅</div>
                <p>Sin facturas pendientes</p>
                <p style={{ fontSize: '13px', color: '#95a5a6', marginTop: '6px' }}>
                  Todas las facturas están al día
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Card 6: Acciones Rápidas */}
        <div className="dashboard-card actions-card">
          <div className="card-header">
            <h2 className="card-title">
              <span className="card-icon">⚡</span>
              Acciones Rápidas
            </h2>
          </div>
          <div className="card-body">
            <div className="quick-actions">
              <button
                className="quick-action-item"
                onClick={handleViewHistory}
              >
                <div className="action-icon">🩺</div>
                <div className="action-content">
                  <h3 className="action-title">Historial Médico</h3>
                  <p className="action-description">
                    Ver registros y evolución
                  </p>
                </div>
              </button>

              <button
                className="quick-action-item"
                onClick={handleViewInvoices}
              >
                <div className="action-icon">🧾</div>
                <div className="action-content">
                  <h3 className="action-title">Facturación</h3>
                  <p className="action-description">
                    Gestionar facturas y pagos
                  </p>
                </div>
              </button>

              <button
                className="quick-action-item"
                onClick={handleCreateAppointment}
              >
                <div className="action-icon">📅</div>
                <div className="action-content">
                  <h3 className="action-title">Nueva Cita</h3>
                  <p className="action-description">
                    Agendar próxima sesión
                  </p>
                </div>
              </button>

              <button
                className="quick-action-item"
                onClick={handleEdit}
              >
                <div className="action-icon">✏️</div>
                <div className="action-content">
                  <h3 className="action-title">Editar Datos</h3>
                  <p className="action-description">
                    Actualizar información
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <Modal
          title="Confirmar Eliminación"
          onClose={() => setShowDeleteModal(false)}
        >
          <div style={{ padding: '1rem' }}>
            <p style={{ marginBottom: '1rem' }}>
              ¿Está seguro que desea eliminar al paciente{' '}
              <strong>{patient.firstName} {patient.lastName}</strong>?
            </p>
            <p style={{ marginBottom: '1.5rem', color: '#e74c3c' }}>
              Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <Button
                onClick={() => setShowDeleteModal(false)}
                variant="outline"
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDelete}
                variant="danger"
                disabled={isDeleting}
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

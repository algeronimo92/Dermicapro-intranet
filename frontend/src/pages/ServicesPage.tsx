import React, { useState, useEffect } from 'react';
import { servicesService } from '../services/services.service';
import { Service } from '../types';
import { Modal } from '../components/Modal';
import { ServiceFormModal } from '../components/ServiceFormModal';

export function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  const [createModal, setCreateModal] = useState(false);
  const [editServiceId, setEditServiceId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    loadServices();
  }, [showDeleted]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await servicesService.getServices(showDeleted);
      setServices(data);
    } catch {
      setError('Error al cargar servicios');
    } finally {
      setLoading(false);
    }
  };

  const handleSaved = (saved: Service) => {
    setServices(prev => {
      const exists = prev.find(s => s.id === saved.id);
      return exists
        ? prev.map(s => (s.id === saved.id ? saved : s))
        : [saved, ...prev];
    });
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await servicesService.deleteService(deleteModal.id);
      setServices(prev => prev.filter(s => s.id !== deleteModal.id));
      setDeleteModal(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al eliminar servicio');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await servicesService.restoreService(id);
      await loadServices();
    } catch {
      alert('Error al restaurar servicio');
    }
  };

  const handleToggleActive = async (service: Service) => {
    try {
      const updated = await servicesService.updateService(service.id, { isActive: !service.isActive });
      setServices(prev => prev.map(s => (s.id === service.id ? updated : s)));
    } catch {
      alert('Error al actualizar servicio');
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(price);

  const formatCommission = (service: Service) => {
    if (service.commissionType === 'percentage' && service.commissionRate) {
      return `${(parseFloat(service.commissionRate.toString()) * 100).toFixed(0)}%`;
    }
    if (service.commissionType === 'fixed' && service.commissionFixedAmount) {
      return formatPrice(service.commissionFixedAmount);
    }
    return '-';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Cargando servicios...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Servicios</h1>
        <div className="header-actions">
          <label className="checkbox-modern" style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
            />
            <span className="checkbox-custom" />
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              Mostrar eliminados
            </span>
          </label>
          <button className="action-btn primary" onClick={() => setCreateModal(true)}>
            + Nuevo Servicio
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th style={{ textAlign: 'right' }}>Precio Base</th>
              <th style={{ textAlign: 'center' }}>Comisión</th>
              <th style={{ textAlign: 'center' }}>Sesiones</th>
              <th style={{ textAlign: 'center' }}>Estado</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {services.length === 0 ? (
              <tr>
                <td colSpan={7} className="table-empty">No hay servicios registrados</td>
              </tr>
            ) : (
              services.map((service) => {
                const isDeleted = !!service.deletedAt;
                return (
                  <tr key={service.id} className={isDeleted ? 'row-deleted' : ''}>
                    <td>
                      <strong>{service.name}</strong>
                      {isDeleted && (
                        <span className="badge badge-error" style={{ marginLeft: 'var(--spacing-sm)' }}>
                          ELIMINADO
                        </span>
                      )}
                    </td>
                    <td className="text-secondary">{service.description || '-'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'var(--font-weight-bold)' }}>
                      {formatPrice(service.basePrice)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge" style={{ background: 'var(--color-info-alpha-10)', color: 'var(--color-info-dark)' }}>
                        {formatCommission(service)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge badge-info">
                        {service.defaultSessions} {service.defaultSessions === 1 ? 'sesión' : 'sesiones'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={service.isActive ? 'badge badge-success' : 'badge badge-error'}>
                        {service.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        {isDeleted ? (
                          <button className="btn btn-success btn-sm" onClick={() => handleRestore(service.id)}>
                            Restaurar
                          </button>
                        ) : (
                          <>
                            <button
                              className="btn btn-sm"
                              style={{ background: 'var(--color-warning)', color: 'var(--color-text-inverse)' }}
                              onClick={() => setEditServiceId(service.id)}
                            >
                              Editar
                            </button>
                            <button
                              className={service.isActive ? 'btn btn-secondary btn-sm' : 'btn btn-success btn-sm'}
                              onClick={() => handleToggleActive(service)}
                            >
                              {service.isActive ? 'Desactivar' : 'Activar'}
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => setDeleteModal({ id: service.id, name: service.name })}
                            >
                              Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal crear */}
      <ServiceFormModal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        onSaved={(service) => { handleSaved(service); setCreateModal(false); }}
      />

      {/* Modal editar */}
      <ServiceFormModal
        isOpen={!!editServiceId}
        onClose={() => setEditServiceId(null)}
        onSaved={(service) => { handleSaved(service); setEditServiceId(null); }}
        serviceId={editServiceId ?? undefined}
      />

      {/* Modal eliminar */}
      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Confirmar Eliminación"
        size="small"
      >
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
          ¿Estás seguro de que deseas eliminar el servicio?
        </p>
        <p style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-sm)' }}>
          {deleteModal?.name}
        </p>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
          Esta acción se puede revertir más tarde.
        </p>
        <div className="modal-actions">
          <button className="action-btn secondary" onClick={() => setDeleteModal(null)}>
            Cancelar
          </button>
          <button
            className="action-btn"
            style={{ background: 'linear-gradient(135deg, var(--color-error) 0%, var(--color-error-dark) 100%)', color: 'var(--color-text-inverse)' }}
            onClick={handleDelete}
          >
            Eliminar Servicio
          </button>
        </div>
      </Modal>
    </div>
  );
}

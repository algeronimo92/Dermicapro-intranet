import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { servicesService } from '../services/services.service';
import { Service } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { hasRole } from '../utils/roleHelpers';

export function ServicesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);

  useEffect(() => {
    loadServices();
  }, [showDeleted]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await servicesService.getServices(showDeleted);
      setServices(data);
    } catch (err: any) {
      setError('Error al cargar servicios');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await servicesService.deleteService(id);
      await loadServices();
      setDeleteConfirm(null);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Error al eliminar servicio';
      alert(errorMsg);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await servicesService.restoreService(id);
      await loadServices();
    } catch (err: any) {
      alert('Error al restaurar servicio');
    }
  };

  const handleToggleActive = async (service: Service) => {
    try {
      const updated = await servicesService.updateService(service.id, {
        isActive: !service.isActive,
      });
      setServices(services.map((s) => (s.id === service.id ? updated : s)));
    } catch (err: any) {
      alert('Error al actualizar servicio');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(price);
  };

  const isAdmin = hasRole(user, 'admin');

  if (loading) {
    return <div className="loading-container">Cargando servicios...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Servicios</h1>
        <div className="header-actions">
          {isAdmin && (
            <>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showDeleted}
                  onChange={(e) => setShowDeleted(e.target.checked)}
                  className="checkbox-input"
                />
                Mostrar eliminados
              </label>
              <button onClick={() => navigate('/services/new')} className="btn btn-primary">
                Nuevo Servicio
              </button>
            </>
          )}
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
              <th style={{ textAlign: 'center' }}>Sesiones</th>
              <th style={{ textAlign: 'center' }}>Estado</th>
              {isAdmin && <th style={{ textAlign: 'center' }}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {services.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="table-empty">
                  No hay servicios registrados
                </td>
              </tr>
            ) : (
              services.map((service) => {
                const isDeleted = !!service.deletedAt;
                return (
                  <tr
                    key={service.id}
                    className={isDeleted ? 'row-deleted' : ''}
                  >
                    <td>
                      <strong>{service.name}</strong>
                      {isDeleted && (
                        <span className="badge badge-error" style={{ marginLeft: '8px' }}>
                          ELIMINADO
                        </span>
                      )}
                    </td>
                    <td className="text-secondary">
                      {service.description || '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                      {formatPrice(service.basePrice)}
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
                    {isAdmin && (
                      <td>
                        <div className="table-actions">
                          {isDeleted ? (
                            <button
                              onClick={() => handleRestore(service.id)}
                              className="btn btn-success btn-sm"
                            >
                              Restaurar
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => navigate(`/services/${service.id}/edit`)}
                                className="btn btn-sm"
                                style={{ background: 'var(--color-warning)', color: 'white' }}
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleToggleActive(service)}
                                className={service.isActive ? 'btn btn-secondary btn-sm' : 'btn btn-success btn-sm'}
                              >
                                {service.isActive ? 'Desactivar' : 'Activar'}
                              </button>
                              {deleteConfirm === service.id ? (
                                <>
                                  <button
                                    onClick={() => handleDelete(service.id)}
                                    className="btn btn-danger btn-sm"
                                  >
                                    Confirmar
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="btn btn-secondary btn-sm"
                                  >
                                    Cancelar
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirm(service.id)}
                                  className="btn btn-danger btn-sm"
                                >
                                  Eliminar
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

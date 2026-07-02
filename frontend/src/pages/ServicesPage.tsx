import { Fragment, useState, useEffect, useMemo } from 'react';
import { servicesService } from '../services/services.service';
import { Service, ServicePackage } from '../types';
import { Modal } from '../components/Modal';
import { ServiceFormModal } from '../components/ServiceFormModal';
import { ServicePackageFormModal } from '../components/ServicePackageFormModal';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { PageListLayout } from '../components/templates';

export function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [createModal, setCreateModal] = useState(false);
  const [editServiceId, setEditServiceId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string } | null>(null);

  const [packageModal, setPackageModal] = useState<{ service: Service; editingPackage?: ServicePackage } | null>(null);
  const [deletePackageModal, setDeletePackageModal] = useState<{ id: string; label: string } | null>(null);

  const filteredServices = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return services;
    return services.filter(s => s.name.toLowerCase().includes(q));
  }, [services, search]);

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

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaved = (saved: Service) => {
    setServices(prev => {
      const exists = prev.find(s => s.id === saved.id);
      return exists
        ? prev.map(s => (s.id === saved.id ? { ...s, ...saved, packages: s.packages } : s))
        : [{ ...saved, packages: [] }, ...prev];
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
      setServices(prev => prev.map(s => (s.id === service.id ? { ...s, ...updated, packages: s.packages } : s)));
    } catch {
      alert('Error al actualizar servicio');
    }
  };

  const handlePackageSaved = (saved: ServicePackage) => {
    setServices(prev => prev.map(s => {
      if (s.id !== saved.serviceId) return s;
      const packages = s.packages ?? [];
      const exists = packages.find(p => p.id === saved.id);
      return {
        ...s,
        packages: exists
          ? packages.map(p => (p.id === saved.id ? saved : p))
          : [...packages, saved].sort((a, b) => a.sessions - b.sessions),
      };
    }));
  };

  const handleDeletePackage = async () => {
    if (!deletePackageModal) return;
    try {
      await servicesService.deletePackage(deletePackageModal.id);
      setServices(prev => prev.map(s => ({
        ...s,
        packages: s.packages?.filter(p => p.id !== deletePackageModal.id),
      })));
      setDeletePackageModal(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al eliminar paquete');
    }
  };

  const handleRestorePackage = async (id: string) => {
    try {
      const restored = await servicesService.restorePackage(id);
      handlePackageSaved(restored);
    } catch {
      alert('Error al restaurar paquete');
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(price);

  const formatCommission = (source: { commissionType?: string | null; commissionRate?: number | null; commissionFixedAmount?: number | null }) => {
    if (source.commissionType === 'percentage' && source.commissionRate) {
      return `${(parseFloat(source.commissionRate.toString()) * 100).toFixed(0)}%`;
    }
    if (source.commissionType === 'fixed' && source.commissionFixedAmount) {
      return formatPrice(source.commissionFixedAmount);
    }
    return '-';
  };

  return (
    <PageListLayout
      title="Servicios"
      actions={
        <Button variant="primary" onClick={() => setCreateModal(true)}>
          + Nuevo Servicio
        </Button>
      }
      filters={
        <>
          <Input
            type="text"
            placeholder="Buscar servicio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          <label className="checkbox-modern" style={{ cursor: 'pointer', flexShrink: 0 }}>
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
            />
            <span className="checkbox-custom" />
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
              Mostrar eliminados
            </span>
          </label>
        </>
      }
      total={filteredServices.length}
      totalLabel="servicios"
      isLoading={loading}
      loadingText="Cargando servicios..."
      error={error}
    >
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 32 }} />
              <th>Nombre</th>
              <th>Descripción</th>
              <th style={{ textAlign: 'center' }}>Comisión Default</th>
              <th style={{ textAlign: 'center' }}>Paquetes</th>
              <th style={{ textAlign: 'center' }}>Estado</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredServices.length === 0 ? (
              <tr>
                <td colSpan={7} className="table-empty">
                  {search ? `Sin resultados para "${search}"` : 'No hay servicios registrados'}
                </td>
              </tr>
            ) : (
              filteredServices.map((service) => {
                const isDeleted = !!service.deletedAt;
                const isExpanded = expandedIds.has(service.id);
                const packages = service.packages ?? [];
                return (
                  <Fragment key={service.id}>
                    <tr className={isDeleted ? 'row-deleted' : ''}>
                      <td>
                        <button
                          type="button"
                          onClick={() => toggleExpanded(service.id)}
                          aria-label={isExpanded ? 'Contraer paquetes' : 'Expandir paquetes'}
                          aria-expanded={isExpanded}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 4,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--color-text-tertiary)',
                          }}
                        >
                          <svg
                            width="18" height="18" viewBox="0 0 20 20" fill="none"
                            style={{ transition: 'transform 0.2s ease', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                          >
                            <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </td>
                      <td>
                        <strong>{service.name}</strong>
                        {isDeleted && (
                          <span className="badge badge-error" style={{ marginLeft: 'var(--spacing-sm)' }}>
                            ELIMINADO
                          </span>
                        )}
                      </td>
                      <td className="text-secondary">{service.description || '-'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge" style={{ background: 'var(--color-info-alpha-10)', color: 'var(--color-info-dark)' }}>
                          {formatCommission(service)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-info">
                          {packages.length} {packages.length === 1 ? 'paquete' : 'paquetes'}
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
                    {isExpanded && (
                      <tr key={`${service.id}-packages`} className="row-nested">
                        <td />
                        <td colSpan={6} style={{ padding: 0 }}>
                          <div style={{ padding: 'var(--spacing-sm) var(--spacing-lg) var(--spacing-lg)', background: 'rgba(0, 0, 0, 0.16)' }}>
                            <div
                              style={{
                                border: '1px solid var(--color-border-secondary)',
                                borderLeft: '3px solid var(--color-primary)',
                                borderRadius: 'var(--radius-lg)',
                                overflow: 'hidden',
                              }}
                            >
                              {packages.length === 0 ? (
                                <div className="table-empty" style={{ padding: 'var(--spacing-lg)' }}>Sin paquetes</div>
                              ) : (
                                <div>
                                  <div
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns: '1.4fr 0.8fr 0.9fr 1.1fr 0.8fr 1.4fr',
                                      gap: 'var(--spacing-sm)',
                                      padding: 'var(--spacing-xs) var(--spacing-md)',
                                      background: 'rgba(0, 0, 0, 0.22)',
                                      fontSize: 'var(--font-size-xs)',
                                      fontWeight: 'var(--font-weight-semibold)',
                                      color: 'var(--color-text-tertiary)',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.03em',
                                    }}
                                  >
                                    <span>Etiqueta</span>
                                    <span style={{ textAlign: 'center' }}>Sesiones</span>
                                    <span style={{ textAlign: 'right' }}>Precio</span>
                                    <span style={{ textAlign: 'center' }}>Comisión</span>
                                    <span style={{ textAlign: 'center' }}>Estado</span>
                                    <span style={{ textAlign: 'center' }}>Acciones</span>
                                  </div>
                                  {packages.map((pkg) => {
                                    const pkgDeleted = !!pkg.deletedAt;
                                    const hasOverride = !!pkg.commissionType;
                                    return (
                                      <div
                                        key={pkg.id}
                                        className={pkgDeleted ? 'row-deleted' : ''}
                                        style={{
                                          display: 'grid',
                                          gridTemplateColumns: '1.4fr 0.8fr 0.9fr 1.1fr 0.8fr 1.4fr',
                                          gap: 'var(--spacing-sm)',
                                          alignItems: 'center',
                                          padding: 'var(--spacing-sm) var(--spacing-md)',
                                          borderTop: '1px solid var(--color-border-secondary)',
                                          fontSize: 'var(--font-size-sm)',
                                        }}
                                      >
                                        <span>{pkg.label || 'Individual'}</span>
                                        <span style={{ textAlign: 'center' }}>{pkg.sessions}</span>
                                        <span style={{ textAlign: 'right', fontWeight: 'var(--font-weight-bold)' }}>{formatPrice(pkg.price)}</span>
                                        <span style={{ textAlign: 'center' }}>
                                          {hasOverride ? (
                                            <span className="badge" style={{ background: 'var(--color-warning-alpha-10)', color: 'var(--color-warning-dark)' }}>
                                              {formatCommission(pkg)}
                                            </span>
                                          ) : (
                                            <span className="badge" style={{ background: 'var(--color-info-alpha-10)', color: 'var(--color-info-dark)' }}>
                                              Hereda ({formatCommission(service)})
                                            </span>
                                          )}
                                        </span>
                                        <span style={{ textAlign: 'center' }}>
                                          <span className={pkg.isActive ? 'badge badge-success' : 'badge badge-error'}>
                                            {pkg.isActive ? 'Activo' : 'Inactivo'}
                                          </span>
                                        </span>
                                        <span className="table-actions" style={{ justifyContent: 'center' }}>
                                          {pkgDeleted ? (
                                            <button className="btn btn-success btn-sm" onClick={() => handleRestorePackage(pkg.id)}>
                                              Restaurar
                                            </button>
                                          ) : (
                                            <>
                                              <button
                                                className="btn btn-sm"
                                                style={{ background: 'var(--color-warning)', color: 'var(--color-text-inverse)' }}
                                                onClick={() => setPackageModal({ service, editingPackage: pkg })}
                                              >
                                                Editar
                                              </button>
                                              <button
                                                className="btn btn-danger btn-sm"
                                                onClick={() => setDeletePackageModal({ id: pkg.id, label: pkg.label || 'Individual' })}
                                              >
                                                Eliminar
                                              </button>
                                            </>
                                          )}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {!isDeleted && (
                                <div style={{ padding: 'var(--spacing-sm) var(--spacing-md)', borderTop: '1px solid var(--color-border-secondary)' }}>
                                  <button
                                    type="button"
                                    onClick={() => setPackageModal({ service })}
                                    style={{
                                      width: '100%',
                                      padding: 'var(--spacing-sm)',
                                      background: 'rgba(0, 0, 0, 0.12)',
                                      border: '1px dashed var(--color-border-primary)',
                                      borderRadius: 'var(--radius-md)',
                                      color: 'var(--color-primary)',
                                      fontSize: 'var(--font-size-sm)',
                                      fontWeight: 'var(--font-weight-medium)',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    + Agregar Paquete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ServiceFormModal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        onSaved={(service) => { handleSaved(service); setCreateModal(false); }}
      />

      <ServiceFormModal
        isOpen={!!editServiceId}
        onClose={() => setEditServiceId(null)}
        onSaved={(service) => { handleSaved(service); setEditServiceId(null); }}
        serviceId={editServiceId ?? undefined}
      />

      <ServicePackageFormModal
        isOpen={!!packageModal}
        onClose={() => setPackageModal(null)}
        onSaved={(pkg) => { handlePackageSaved(pkg); setPackageModal(null); }}
        service={packageModal?.service ?? null}
        editingPackage={packageModal?.editingPackage}
      />

      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Confirmar Eliminación"
        size="small"
      >
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
          ¿Estás seguro de que deseas eliminar el servicio? Se eliminarán también todos sus paquetes.
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

      <Modal
        isOpen={!!deletePackageModal}
        onClose={() => setDeletePackageModal(null)}
        title="Confirmar Eliminación"
        size="small"
      >
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
          ¿Estás seguro de que deseas eliminar el paquete?
        </p>
        <p style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-sm)' }}>
          {deletePackageModal?.label}
        </p>
        <div className="modal-actions">
          <button className="action-btn secondary" onClick={() => setDeletePackageModal(null)}>
            Cancelar
          </button>
          <button
            className="action-btn"
            style={{ background: 'linear-gradient(135deg, var(--color-error) 0%, var(--color-error-dark) 100%)', color: 'var(--color-text-inverse)' }}
            onClick={handleDeletePackage}
          >
            Eliminar Paquete
          </button>
        </div>
      </Modal>
    </PageListLayout>
  );
}

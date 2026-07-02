import React, { useState, useEffect } from 'react';
import { Service, ServicePackage } from '../types';
import { servicesService } from '../services/services.service';
import { Modal } from './Modal';

interface ServicePackageFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (servicePackage: ServicePackage) => void;
  service: Service | null;
  editingPackage?: ServicePackage | null;
}

const EMPTY_FORM = {
  sessions: '1',
  price: '',
  label: '',
  useOwnCommission: false,
  commissionType: 'percentage' as 'percentage' | 'fixed',
  commissionRate: '',
  commissionFixedAmount: '',
  isActive: true,
};

export const ServicePackageFormModal: React.FC<ServicePackageFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  service,
  editingPackage,
}) => {
  const isEdit = !!editingPackage;
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && editingPackage) {
      setForm({
        sessions: editingPackage.sessions.toString(),
        price: editingPackage.price.toString(),
        label: editingPackage.label || '',
        useOwnCommission: !!editingPackage.commissionType,
        commissionType: (editingPackage.commissionType || 'percentage') as 'percentage' | 'fixed',
        commissionRate: editingPackage.commissionRate
          ? (parseFloat(editingPackage.commissionRate.toString()) * 100).toString()
          : '',
        commissionFixedAmount: editingPackage.commissionFixedAmount
          ? editingPackage.commissionFixedAmount.toString()
          : '',
        isActive: editingPackage.isActive,
      });
    }
    if (!isOpen) {
      setForm(EMPTY_FORM);
      setError('');
    }
  }, [isOpen, editingPackage]);

  const validate = (): boolean => {
    const sessions = parseInt(form.sessions);
    if (isNaN(sessions) || sessions < 1) { setError('El número de sesiones debe ser al menos 1'); return false; }
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) { setError('El precio debe ser un número válido mayor o igual a 0'); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!service) return;
    if (!validate()) return;

    try {
      setLoading(true);
      const data = {
        sessions: parseInt(form.sessions),
        price: parseFloat(form.price),
        label: form.label.trim() || undefined,
        isActive: form.isActive,
        commissionType: form.useOwnCommission ? form.commissionType : null,
        commissionRate:
          form.useOwnCommission && form.commissionType === 'percentage' && form.commissionRate
            ? parseFloat(form.commissionRate) / 100
            : null,
        commissionFixedAmount:
          form.useOwnCommission && form.commissionType === 'fixed' && form.commissionFixedAmount
            ? parseFloat(form.commissionFixedAmount)
            : null,
      };

      const saved = isEdit && editingPackage
        ? await servicesService.updatePackage(editingPackage.id, data)
        : await servicesService.createPackage(service.id, data);

      onClose();
      onSaved(saved);
    } catch (err: any) {
      setError(err.response?.data?.message || `Error al ${isEdit ? 'actualizar' : 'crear'} paquete`);
    } finally {
      setLoading(false);
    }
  };

  const set = (field: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : e.target.value;
      setForm(prev => ({ ...prev, [field]: value }));
      if (error) setError('');
    };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Editar Paquete' : 'Nuevo Paquete'}
      size="medium"
    >
      <form onSubmit={handleSubmit}>
        {service && (
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--spacing-md)' }}>
            Paquete de <strong>{service.name}</strong>
          </p>
        )}

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 'var(--spacing-md)' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
            <div>
              <label className="field-label">Número de Sesiones *</label>
              <input
                type="number"
                min="1"
                value={form.sessions}
                onChange={set('sessions')}
                placeholder="1"
                className="filter-select-modern"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label className="field-label">Precio (S/) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={set('price')}
                placeholder="0.00"
                className="filter-select-modern"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <label className="field-label">Etiqueta</label>
            <input
              type="text"
              value={form.label}
              onChange={set('label')}
              placeholder="Ej: Individual, x6, Paquete Premium"
              className="filter-select-modern"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{
            padding: 'var(--spacing-md)',
            background: 'var(--color-bg-secondary)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-border-secondary)',
          }}>
            <label className="checkbox-modern" style={{ marginBottom: form.useOwnCommission ? 'var(--spacing-md)' : 0 }}>
              <input
                type="checkbox"
                checked={form.useOwnCommission}
                onChange={set('useOwnCommission')}
              />
              <span className="checkbox-custom" />
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontWeight: 'var(--font-weight-medium)' }}>
                Este paquete tiene su propia comisión
              </span>
            </label>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 4, marginBottom: form.useOwnCommission ? 'var(--spacing-md)' : 0 }}>
              Si no se marca, hereda la comisión por defecto del servicio.
            </p>

            {form.useOwnCommission && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                  {(['percentage', 'fixed'] as const).map((type) => (
                    <label
                      key={type}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)',
                        padding: 'var(--spacing-sm) var(--spacing-md)',
                        border: `2px solid ${form.commissionType === type ? 'var(--color-primary)' : 'var(--color-border-secondary)'}`,
                        borderRadius: 'var(--radius-lg)',
                        background: form.commissionType === type ? 'var(--color-primary-alpha-10)' : 'var(--color-bg-primary)',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="packageCommissionType"
                        value={type}
                        checked={form.commissionType === type}
                        onChange={set('commissionType')}
                        style={{ accentColor: 'var(--color-primary)' }}
                      />
                      <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: form.commissionType === type ? 'var(--font-weight-semibold)' : 'normal', color: form.commissionType === type ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>
                        {type === 'percentage' ? 'Porcentaje (%)' : 'Monto Fijo (S/)'}
                      </span>
                    </label>
                  ))}
                </div>

                {form.commissionType === 'percentage' ? (
                  <div>
                    <label className="field-label">Porcentaje de Comisión (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={form.commissionRate}
                      onChange={set('commissionRate')}
                      placeholder="10.00"
                      className="filter-select-modern"
                      style={{ width: '100%' }}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="field-label">Monto Fijo de Comisión (S/)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.commissionFixedAmount}
                      onChange={set('commissionFixedAmount')}
                      placeholder="50.00"
                      className="filter-select-modern"
                      style={{ width: '100%' }}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <label className="checkbox-modern" style={{ alignSelf: 'start' }}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={set('isActive')}
            />
            <span className="checkbox-custom" />
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontWeight: 'var(--font-weight-medium)' }}>
              Paquete activo
            </span>
          </label>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="action-btn secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="action-btn primary"
            disabled={loading}
          >
            {loading ? 'Guardando...' : isEdit ? 'Actualizar Paquete' : 'Crear Paquete'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

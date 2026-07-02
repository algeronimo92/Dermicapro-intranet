import React, { useState, useEffect } from 'react';
import { Service } from '../types';
import { servicesService } from '../services/services.service';
import { Modal } from './Modal';

interface ServiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (service: Service) => void;
  serviceId?: string;
}

const EMPTY_FORM = {
  name: '',
  description: '',
  commissionType: 'percentage' as 'percentage' | 'fixed',
  commissionRate: '',
  commissionFixedAmount: '',
  commissionNotes: '',
  isActive: true,
};

export const ServiceFormModal: React.FC<ServiceFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  serviceId,
}) => {
  const isEdit = !!serviceId;
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && isEdit && serviceId) {
      loadService(serviceId);
    }
    if (!isOpen) {
      setForm(EMPTY_FORM);
      setError('');
    }
  }, [isOpen, serviceId]);

  const loadService = async (id: string) => {
    try {
      setLoadingData(true);
      const service = await servicesService.getService(id);
      setForm({
        name: service.name,
        description: service.description || '',
        commissionType: (service.commissionType || 'percentage') as 'percentage' | 'fixed',
        commissionRate: service.commissionRate
          ? (parseFloat(service.commissionRate.toString()) * 100).toString()
          : '',
        commissionFixedAmount: service.commissionFixedAmount
          ? service.commissionFixedAmount.toString()
          : '',
        commissionNotes: service.commissionNotes || '',
        isActive: service.isActive,
      });
    } catch {
      setError('Error al cargar el servicio');
    } finally {
      setLoadingData(false);
    }
  };

  const validate = (): boolean => {
    if (!form.name.trim()) { setError('El nombre es requerido'); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    try {
      setLoading(true);
      const data = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        commissionType: form.commissionType,
        commissionRate:
          form.commissionType === 'percentage' && form.commissionRate
            ? parseFloat(form.commissionRate) / 100
            : undefined,
        commissionFixedAmount:
          form.commissionType === 'fixed' && form.commissionFixedAmount
            ? parseFloat(form.commissionFixedAmount)
            : undefined,
        commissionNotes: form.commissionNotes.trim() || undefined,
        isActive: form.isActive,
      };

      const saved = isEdit && serviceId
        ? await servicesService.updateService(serviceId, data)
        : await servicesService.createService(data);

      onClose();
      onSaved(saved);
    } catch (err: any) {
      setError(err.response?.data?.message || `Error al ${isEdit ? 'actualizar' : 'crear'} servicio`);
    } finally {
      setLoading(false);
    }
  };

  const set = (field: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
      title={isEdit ? 'Editar Servicio' : 'Nuevo Servicio'}
      size="medium"
    >
      {loadingData ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-xl)' }}>
          <div className="spinner" />
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="alert alert-error" style={{ marginBottom: 'var(--spacing-md)' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
            {/* Nombre */}
            <div>
              <label className="field-label">Nombre del Servicio *</label>
              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                placeholder="Ej: HIFU, Láser, Depilación"
                className="filter-select-modern"
                style={{ width: '100%' }}
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="field-label">Descripción</label>
              <textarea
                value={form.description}
                onChange={set('description')}
                placeholder="Descripción del servicio (opcional)"
                rows={2}
                className="notes-textarea"
              />
            </div>

            {/* Sección comisiones */}
            <div style={{
              padding: 'var(--spacing-md)',
              background: 'var(--color-bg-secondary)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--color-border-secondary)',
            }}>
              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-xs)' }}>
                Comisión por defecto
              </div>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--spacing-md)' }}>
                Se aplica a todos los paquetes de este servicio, salvo que un paquete defina su propia comisión.
              </p>

              {/* Tipo de comisión */}
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
                      transition: 'all var(--transition-base)',
                    }}
                  >
                    <input
                      type="radio"
                      name="commissionType"
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

              {/* Valor de comisión */}
              {form.commissionType === 'percentage' && (
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
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 4, display: 'block' }}>
                    Ej: 10 = 10%. Dejar vacío si no aplica comisión.
                  </span>
                </div>
              )}
              {form.commissionType === 'fixed' && (
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
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 4, display: 'block' }}>
                    Ej: 50 = S/ 50.00. Dejar vacío si no aplica comisión.
                  </span>
                </div>
              )}

              {/* Notas de comisión */}
              <div style={{ marginTop: 'var(--spacing-md)' }}>
                <label className="field-label">Notas de Comisión</label>
                <textarea
                  value={form.commissionNotes}
                  onChange={set('commissionNotes')}
                  placeholder="Notas sobre el cálculo (opcional)"
                  rows={2}
                  className="notes-textarea"
                />
              </div>
            </div>

            {/* Activo */}
            <label className="checkbox-modern" style={{ alignSelf: 'start' }}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={set('isActive')}
              />
              <span className="checkbox-custom" />
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontWeight: 'var(--font-weight-medium)' }}>
                Servicio activo
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
              {loading ? 'Guardando...' : isEdit ? 'Actualizar Servicio' : 'Crear Servicio'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

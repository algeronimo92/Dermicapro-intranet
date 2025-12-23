import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { servicesService } from '../services/services.service';
import { Service } from '../types';

export function ServiceFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basePrice: '',
    defaultSessions: '1',
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit && id) {
      loadService(id);
    }
  }, [id, isEdit]);

  const loadService = async (serviceId: string) => {
    try {
      setLoading(true);
      const service = await servicesService.getService(serviceId);
      setFormData({
        name: service.name,
        description: service.description || '',
        basePrice: service.basePrice.toString(),
        defaultSessions: service.defaultSessions.toString(),
        isActive: service.isActive,
      });
    } catch (err: any) {
      setError('Error al cargar servicio');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('El nombre es requerido');
      return;
    }

    const price = parseFloat(formData.basePrice);
    if (isNaN(price) || price < 0) {
      setError('El precio debe ser un número válido mayor o igual a 0');
      return;
    }

    const sessions = parseInt(formData.defaultSessions);
    if (isNaN(sessions) || sessions < 1) {
      setError('El número de sesiones debe ser al menos 1');
      return;
    }

    try {
      setLoading(true);
      const data = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        basePrice: price,
        defaultSessions: sessions,
        isActive: formData.isActive,
      };

      if (isEdit && id) {
        await servicesService.updateService(id, data);
      } else {
        await servicesService.createService(data);
      }

      navigate('/services');
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || `Error al ${isEdit ? 'actualizar' : 'crear'} servicio`;
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/services');
  };

  if (loading && isEdit) {
    return <div>Cargando...</div>;
  }

  return (
    <div>
      <h1>{isEdit ? 'Editar Servicio' : 'Nuevo Servicio'}</h1>

      <div style={{ background: 'white', borderRadius: '8px', padding: '20px', maxWidth: '600px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ padding: '10px', background: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '20px' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Nombre del Servicio <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: HIFU, Láser, Depilación"
              required
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción del servicio (opcional)"
              rows={3}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Precio Base (S/) <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.basePrice}
              onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
              placeholder="0.00"
              required
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
            <small style={{ color: '#666', fontSize: '12px' }}>
              Ingrese el precio base del servicio en soles
            </small>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Número de Sesiones <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="number"
              min="1"
              value={formData.defaultSessions}
              onChange={(e) => setFormData({ ...formData, defaultSessions: e.target.value })}
              placeholder="1"
              required
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
            <small style={{ color: '#666', fontSize: '12px' }}>
              ¿Cuántas sesiones incluye este servicio? (Ej: Hollywood Peel puede ser 3 sesiones)
            </small>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                style={{ marginRight: '8px', width: '18px', height: '18px' }}
              />
              <span style={{ fontWeight: 'bold' }}>Servicio activo</span>
            </label>
            <small style={{ color: '#666', fontSize: '12px', display: 'block', marginLeft: '26px' }}>
              Los servicios inactivos no aparecerán al crear nuevas citas
            </small>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                background: loading ? '#95a5a6' : '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
              }}
            >
              {loading ? 'Guardando...' : isEdit ? 'Actualizar Servicio' : 'Crear Servicio'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                background: 'white',
                color: '#333',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>

      {isEdit && (
        <div style={{ marginTop: '20px', padding: '15px', background: '#fff3cd', borderRadius: '4px', maxWidth: '600px' }}>
          <strong>Nota:</strong> Si este servicio tiene citas asociadas, no podrás eliminarlo. Solo puedes desactivarlo.
        </div>
      )}
    </div>
  );
}

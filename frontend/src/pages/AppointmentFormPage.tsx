import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { appointmentsService, CreateAppointmentDto } from '../services/appointments.service';
import { servicesService } from '../services/services.service';
import { Service } from '../types';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Loading } from '../components/Loading';
import { PatientSelector } from '../components/PatientSelector';

export const AppointmentFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEditMode = !!id;
  const preselectedPatientId = searchParams.get('patientId');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listas para selects
  const [services, setServices] = useState<Service[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [formData, setFormData] = useState<CreateAppointmentDto>({
    patientId: preselectedPatientId || '',
    serviceId: '',
    scheduledDate: '',
    durationMinutes: 30, // Minimum duration is 30 minutes
    reservationAmount: undefined,
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (isEditMode && id) {
      loadAppointment(id);
    }
  }, [id]);

  const loadInitialData = async () => {
    try {
      setLoadingData(true);
      const servicesData = await servicesService.getActiveServices();
      setServices(servicesData);
    } catch (err: any) {
      setError('Error al cargar datos iniciales');
    } finally {
      setLoadingData(false);
    }
  };

  const loadAppointment = async (appointmentId: string) => {
    try {
      setIsLoading(true);
      const appointment = await appointmentsService.getAppointment(appointmentId);
      setFormData({
        patientId: appointment.patientId,
        serviceId: appointment.serviceId,
        scheduledDate: appointment.scheduledDate.split('.')[0], // Remove milliseconds
        durationMinutes: appointment.durationMinutes,
        reservationAmount: appointment.reservationAmount,
        notes: appointment.notes || ''
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar cita');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'reservationAmount' ? (value ? parseFloat(value) : undefined) :
              name === 'durationMinutes' ? (value ? parseInt(value) : 30) : value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handlePatientChange = (patientId: string) => {
    setFormData(prev => ({ ...prev, patientId }));
    if (errors.patientId) {
      setErrors(prev => ({ ...prev, patientId: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.patientId) {
      newErrors.patientId = 'Debe seleccionar un paciente';
    }
    if (!formData.serviceId) {
      newErrors.serviceId = 'Debe seleccionar un servicio';
    }
    if (!formData.scheduledDate) {
      newErrors.scheduledDate = 'La fecha y hora son requeridas';
    } else {
      const scheduledDate = new Date(formData.scheduledDate);
      if (scheduledDate < new Date()) {
        newErrors.scheduledDate = 'La fecha no puede ser en el pasado';
      }
    }
    if (!formData.durationMinutes || formData.durationMinutes < 30) {
      newErrors.durationMinutes = 'La duración mínima es 30 minutos';
    }
    if (formData.reservationAmount !== undefined && formData.reservationAmount < 0) {
      newErrors.reservationAmount = 'El monto debe ser mayor o igual a 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      if (isEditMode && id) {
        await appointmentsService.updateAppointment(id, formData);
      } else {
        await appointmentsService.createAppointment(formData);
      }

      navigate('/appointments');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar cita');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/appointments');
  };

  if (loadingData || isLoading) {
    return <Loading text="Cargando datos..." />;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <Button variant="secondary" onClick={handleCancel}>
            ← Volver
          </Button>
          <h1>{isEditMode ? 'Editar Cita' : 'Nueva Cita'}</h1>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-container">
        <div className="form-grid">
          <div className="form-column">
            <h3>Información de la Cita</h3>

            <PatientSelector
              value={formData.patientId}
              onChange={handlePatientChange}
              error={errors.patientId}
              disabled={isSaving}
            />

            <Select
              label="Servicio *"
              name="serviceId"
              value={formData.serviceId}
              onChange={handleChange}
              error={errors.serviceId}
              options={services.map(s => ({
                value: s.id,
                label: `${s.name} - S/. ${s.basePrice}`
              }))}
            />

            <Input
              label="Fecha y Hora *"
              type="datetime-local"
              name="scheduledDate"
              value={formData.scheduledDate}
              onChange={handleChange}
              error={errors.scheduledDate}
            />

            <Select
              label="Duración *"
              name="durationMinutes"
              value={formData.durationMinutes?.toString() || '30'}
              onChange={handleChange}
              error={errors.durationMinutes}
              options={[
                { value: '30', label: '30 minutos' },
                { value: '45', label: '45 minutos' },
                { value: '60', label: '1 hora' },
                { value: '90', label: '1.5 horas' },
                { value: '120', label: '2 horas' },
                { value: '150', label: '2.5 horas' },
                { value: '180', label: '3 horas' }
              ]}
            />
          </div>

          <div className="form-column">
            <h3>Información de Pago</h3>

            <Input
              label="Monto de Reserva (S/.)"
              type="number"
              name="reservationAmount"
              value={formData.reservationAmount?.toString() || ''}
              onChange={handleChange}
              error={errors.reservationAmount}
              placeholder="0.00"
              step="0.01"
              min="0"
            />

            <Input
              label="Notas"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Observaciones adicionales..."
            />

            <div className="info-box">
              <p style={{ fontSize: '13px', color: '#7f8c8d', margin: 0 }}>
                💡 <strong>Consejo:</strong> Puedes buscar pacientes por nombre, DNI o teléfono.
                Si el paciente no existe, créalo directamente desde aquí.
              </p>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSaving}
            disabled={isSaving}
          >
            {isEditMode ? 'Guardar Cambios' : 'Crear Cita'}
          </Button>
        </div>
      </form>
    </div>
  );
};

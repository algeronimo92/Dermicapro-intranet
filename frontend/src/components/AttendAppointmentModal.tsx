import React, { useState, useRef, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { appointmentsService, AttendAppointmentDto } from '../services/appointments.service';
import { servicesService } from '../services/services.service';
import { Appointment, Service } from '../types';

interface ConfirmedService {
  appointmentServiceId?: string;
  orderId?: string;
  serviceId: string;
  serviceName: string;
  sessionNumber?: number | null;
  totalSessions?: number;
  confirmed: boolean;
}

interface AttendAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment;
  onSuccess: (updatedAppointment: Appointment) => void;
}

export const AttendAppointmentModal: React.FC<AttendAppointmentModalProps> = ({
  isOpen,
  onClose,
  appointment,
  onSuccess,
}) => {
  const [services, setServices] = useState<Service[]>([]);
  const [confirmedServices, setConfirmedServices] = useState<ConfirmedService[]>([]);

  const [formData, setFormData] = useState({
    treatmentNotes: '',
    weight: '',
    healthNotes: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadServices();
      initializeConfirmedServices();
    }
  }, [isOpen, appointment]);

  const initializeConfirmedServices = () => {
    // Prellenar con los servicios ya programados para esta cita
    const initialServices: ConfirmedService[] = appointment.appointmentServices?.map(appSvc => ({
      appointmentServiceId: appSvc.id,
      orderId: appSvc.orderId,
      serviceId: appSvc.order.serviceId || '',
      serviceName: appSvc.order.service?.name || 'Servicio',
      sessionNumber: appSvc.sessionNumber,
      totalSessions: appSvc.order.totalSessions,
      confirmed: true, // Por defecto confirmados
    })) || [];
    setConfirmedServices(initialServices);
  };

  const loadServices = async () => {
    try {
      const data = await servicesService.getServices();
      setServices(data);
    } catch (err) {
      console.error('Error loading services:', err);
    }
  };

  const [beforePhotos, setBeforePhotos] = useState<File[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<File[]>([]);
  const [beforePreviews, setBeforePreviews] = useState<string[]>([]);
  const [afterPreviews, setAfterPreviews] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState('');

  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBeforePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + beforePhotos.length > 5) {
      setError('Máximo 5 fotos de antes');
      return;
    }

    // Validar tipo y tamaño
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setError('Solo se permiten imágenes');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Cada imagen debe ser menor a 5MB');
        return;
      }
    }

    setBeforePhotos(prev => [...prev, ...files]);

    // Crear previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBeforePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAfterPhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + afterPhotos.length > 5) {
      setError('Máximo 5 fotos de después');
      return;
    }

    // Validar tipo y tamaño
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setError('Solo se permiten imágenes');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Cada imagen debe ser menor a 5MB');
        return;
      }
    }

    setAfterPhotos(prev => [...prev, ...files]);

    // Crear previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAfterPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeBeforePhoto = (index: number) => {
    setBeforePhotos(prev => prev.filter((_, i) => i !== index));
    setBeforePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeAfterPhoto = (index: number) => {
    setAfterPhotos(prev => prev.filter((_, i) => i !== index));
    setAfterPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validar que todos los servicios estén confirmados
    if (!allServicesConfirmed) {
      setError('Por favor confirma todos los tratamientos realizados');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress('Procesando...');

    try {
      let beforePhotoUrls: string[] = [];
      let afterPhotoUrls: string[] = [];

      // Subir fotos de antes
      if (beforePhotos.length > 0) {
        setUploadProgress('Subiendo fotos de antes...');
        const response = await appointmentsService.uploadTreatmentPhotos(beforePhotos);
        beforePhotoUrls = response.urls;
      }

      // Subir fotos de después
      if (afterPhotos.length > 0) {
        setUploadProgress('Subiendo fotos de después...');
        const response = await appointmentsService.uploadTreatmentPhotos(afterPhotos);
        afterPhotoUrls = response.urls;
      }

      // Marcar como atendida con toda la información
      setUploadProgress('Guardando información...');
      const attendData: AttendAppointmentDto = {
        treatmentNotes: formData.treatmentNotes,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        healthNotes: formData.healthNotes,
        beforePhotoUrls: beforePhotoUrls.length > 0 ? beforePhotoUrls : undefined,
        afterPhotoUrls: afterPhotoUrls.length > 0 ? afterPhotoUrls : undefined,
      };

      const updatedAppointment = await appointmentsService.markAsAttended(appointment.id, attendData);

      setUploadProgress('¡Listo!');
      onSuccess(updatedAppointment);
      onClose();

      // Reset form
      setFormData({ treatmentNotes: '', weight: '', healthNotes: '' });
      setBeforePhotos([]);
      setAfterPhotos([]);
      setBeforePreviews([]);
      setAfterPreviews([]);
      setConfirmedServices([]);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al registrar atención');
      setUploadProgress('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleServiceConfirmation = (index: number) => {
    setConfirmedServices(prev => prev.map((svc, i) =>
      i === index ? { ...svc, confirmed: !svc.confirmed } : svc
    ));
  };

  const allServicesConfirmed = confirmedServices.length > 0 && confirmedServices.every(s => s.confirmed);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Atención Médica">
      <form onSubmit={handleSubmit} style={{ maxWidth: '900px', width: '100%' }}>
        {/* Header con información del paciente */}
        <div style={{
          marginBottom: '24px',
          padding: '20px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          color: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div>
              <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>
                {appointment.patient?.firstName} {appointment.patient?.lastName}
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                {new Date(appointment.scheduledDate).toLocaleDateString('es-PE', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Servicios Programados - Sección destacada */}
        {confirmedServices.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '600',
                color: '#2c3e50',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
                    stroke="#3498db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Tratamientos Programados ({confirmedServices.length})
              </h3>
              {allServicesConfirmed ? (
                <span style={{
                  padding: '6px 12px',
                  background: '#d4edda',
                  color: '#155724',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '600',
                  border: '1px solid #c3e6cb'
                }}>
                  ✓ Todos confirmados
                </span>
              ) : (
                <span style={{
                  padding: '6px 12px',
                  background: '#fff3cd',
                  color: '#856404',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '600',
                  border: '1px solid #ffeeba'
                }}>
                  ⚠ Confirmar tratamientos
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {confirmedServices.map((service, index) => (
                <div
                  key={index}
                  style={{
                    padding: '16px',
                    border: service.confirmed ? '2px solid #27ae60' : '2px solid #e0e0e0',
                    borderRadius: '12px',
                    background: service.confirmed
                      ? 'linear-gradient(135deg, #d4edda 0%, #f0f9ff 100%)'
                      : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative' as const
                  }}
                  onClick={() => toggleServiceConfirmation(index)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Checkbox personalizado */}
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      border: service.confirmed ? '2px solid #27ae60' : '2px solid #bdc3c7',
                      background: service.confirmed ? '#27ae60' : 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.2s ease'
                    }}>
                      {service.confirmed && (
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path d="M15 4.5L6.75 12.75L3 9" stroke="white" strokeWidth="2.5"
                            strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>

                    {/* Información del servicio */}
                    <div style={{ flex: 1 }}>
                      <h4 style={{
                        margin: '0 0 4px 0',
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#2c3e50'
                      }}>
                        {service.serviceName}
                      </h4>
                      {service.sessionNumber && service.totalSessions && (
                        <span style={{
                          fontSize: '13px',
                          color: '#7f8c8d',
                          background: 'rgba(52, 152, 219, 0.1)',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          display: 'inline-block'
                        }}>
                          📦 Sesión {service.sessionNumber} de {service.totalSessions}
                        </span>
                      )}
                      {!service.sessionNumber && (
                        <span style={{
                          fontSize: '13px',
                          color: '#7f8c8d',
                          background: 'rgba(149, 165, 166, 0.1)',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          display: 'inline-block'
                        }}>
                          Sesión independiente
                        </span>
                      )}
                    </div>

                    {/* Indicador de estado */}
                    {service.confirmed && (
                      <div style={{
                        padding: '6px 12px',
                        background: '#27ae60',
                        color: 'white',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        CONFIRMADO
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <p style={{
              margin: '12px 0 0 0',
              fontSize: '13px',
              color: '#7f8c8d',
              fontStyle: 'italic',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 14A6 6 0 108 2a6 6 0 000 12zM8 5.333V8M8 10.667h.007"
                  stroke="#7f8c8d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Haz clic en cada tratamiento para confirmar que fue realizado
            </p>
          </div>
        )}

        {error && (
          <div className="error-banner" style={{ marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {uploadProgress && (
          <div style={{
            marginBottom: '20px',
            padding: '10px 15px',
            backgroundColor: '#d6eaf8',
            border: '1px solid #a9cce3',
            borderRadius: '4px',
            color: '#1a5490'
          }}>
            {uploadProgress}
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#2c3e50' }}>
            Notas del Tratamiento *
          </label>
          <textarea
            name="treatmentNotes"
            value={formData.treatmentNotes}
            onChange={handleChange}
            required
            rows={4}
            placeholder="Describe el procedimiento realizado, observaciones, reacciones del paciente, etc."
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'inherit'
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
          <Input
            label="Peso (kg)"
            type="number"
            name="weight"
            value={formData.weight}
            onChange={handleChange}
            placeholder="Ej: 65.5"
            step="0.1"
          />
          <div />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#2c3e50' }}>
            Notas de Salud / Observaciones
          </label>
          <textarea
            name="healthNotes"
            value={formData.healthNotes}
            onChange={handleChange}
            rows={3}
            placeholder="Alergias, condiciones especiales, recomendaciones..."
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'inherit'
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          {/* Fotos de ANTES */}
          <div>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#2c3e50' }}>
              Fotos de Antes
            </label>
            <Button
              type="button"
              variant="secondary"
              onClick={() => beforeInputRef.current?.click()}
              style={{ width: '100%', marginBottom: '10px' }}
            >
              📷 Agregar Fotos de Antes
            </Button>
            <input
              ref={beforeInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleBeforePhotosChange}
              style={{ display: 'none' }}
            />
            <p style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '10px' }}>
              Máximo 5 fotos, 5MB c/u
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {beforePreviews.map((preview, index) => (
                <div key={index} style={{ position: 'relative' }}>
                  <img
                    src={preview}
                    alt={`Before ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '120px',
                      objectFit: 'cover',
                      borderRadius: '4px',
                      border: '2px solid #3498db'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeBeforePhoto(index)}
                    style={{
                      position: 'absolute',
                      top: '5px',
                      right: '5px',
                      background: '#e74c3c',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Fotos de DESPUÉS */}
          <div>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#2c3e50' }}>
              Fotos de Después
            </label>
            <Button
              type="button"
              variant="secondary"
              onClick={() => afterInputRef.current?.click()}
              style={{ width: '100%', marginBottom: '10px' }}
            >
              📷 Agregar Fotos de Después
            </Button>
            <input
              ref={afterInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleAfterPhotosChange}
              style={{ display: 'none' }}
            />
            <p style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '10px' }}>
              Máximo 5 fotos, 5MB c/u
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {afterPreviews.map((preview, index) => (
                <div key={index} style={{ position: 'relative' }}>
                  <img
                    src={preview}
                    alt={`After ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '120px',
                      objectFit: 'cover',
                      borderRadius: '4px',
                      border: '2px solid #2ecc71'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeAfterPhoto(index)}
                    style={{
                      position: 'absolute',
                      top: '5px',
                      right: '5px',
                      background: '#e74c3c',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: '30px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="success"
            isLoading={isSubmitting}
            disabled={isSubmitting || !allServicesConfirmed}
          >
            {isSubmitting ? 'Guardando...' : allServicesConfirmed ? 'Confirmar Atención' : 'Confirmar todos los tratamientos'}
          </Button>
        </div>

        {!allServicesConfirmed && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            background: '#fff3cd',
            border: '1px solid #ffeeba',
            borderRadius: '8px',
            color: '#856404',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 16.5a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM9 6v3M9 12h.008"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Por favor confirma todos los tratamientos realizados antes de continuar
          </div>
        )}
      </form>
    </Modal>
  );
};

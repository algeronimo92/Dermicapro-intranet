import React, { useState, useRef, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { CameraCapture } from './CameraCapture'; // portal-based
import { appointmentsService, AttendAppointmentDto } from '../services/appointments.service';
import { servicesService } from '../services/services.service';
import { Appointment, Service } from '../types';

interface ConfirmedService {
  appointmentServiceId?: string;
  serviceInstanceId?: string;
  serviceTemplateId: string;
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
  const [_services, setServices] = useState<Service[]>([]);
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
    const initialServices: ConfirmedService[] = appointment.appointmentServices?.map(appSvc => ({
      appointmentServiceId: appSvc.id,
      serviceInstanceId: appSvc.serviceInstanceId,
      serviceTemplateId: appSvc.serviceInstance.serviceTemplateId || '',
      serviceName: appSvc.serviceInstance.service?.name || 'Servicio',
      sessionNumber: appSvc.sessionNumber,
      totalSessions: appSvc.serviceInstance.totalSessions,
      confirmed: true,
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

  // Multi-select state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [beforeSelected, setBeforeSelected] = useState<Set<number>>(new Set());
  const [afterSelected, setAfterSelected] = useState<Set<number>>(new Set());
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drag & drop state (desktop only)
  const [isDraggingBefore, setIsDraggingBefore] = useState(false);
  const [isDraggingAfter, setIsDraggingAfter] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState('');

  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);
  const [cameraTarget, setCameraTarget] = useState<'before' | 'after' | null>(null);

  // Detect desktop (pointer: fine = mouse, hover: hover = hover capable)
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addPhotoFile = (file: File, target: 'before' | 'after') => {
    const limit = 6;
    const current = target === 'before' ? beforePhotos : afterPhotos;
    if (current.length >= limit) { setError(`Máximo ${limit} fotos`); return; }
    if (!file.type.startsWith('image/')) { setError('Solo se permiten imágenes'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Cada imagen debe ser menor a 5MB'); return; }
    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      if (target === 'before') {
        setBeforePhotos(prev => [...prev, file]);
        setBeforePreviews(prev => [...prev, reader.result as string]);
      } else {
        setAfterPhotos(prev => [...prev, file]);
        setAfterPreviews(prev => [...prev, reader.result as string]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = (file: File) => {
    if (cameraTarget) addPhotoFile(file, cameraTarget);
    setCameraTarget(null);
  };

  const handleBeforePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + beforePhotos.length > 6) { setError('Máximo 6 fotos de antes'); return; }
    for (const file of files) {
      if (!file.type.startsWith('image/')) { setError('Solo se permiten imágenes'); return; }
      if (file.size > 5 * 1024 * 1024) { setError('Cada imagen debe ser menor a 5MB'); return; }
    }
    setBeforePhotos(prev => [...prev, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setBeforePreviews(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const handleAfterPhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + afterPhotos.length > 6) { setError('Máximo 6 fotos de después'); return; }
    for (const file of files) {
      if (!file.type.startsWith('image/')) { setError('Solo se permiten imágenes'); return; }
      if (file.size > 5 * 1024 * 1024) { setError('Cada imagen debe ser menor a 5MB'); return; }
    }
    setAfterPhotos(prev => [...prev, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setAfterPreviews(prev => [...prev, reader.result as string]);
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

  // ── Drag & drop (desktop only) ─────────────────────────────────────────────

  const handleDragOver = (e: React.DragEvent, target: 'before' | 'after') => {
    e.preventDefault();
    if (target === 'before') setIsDraggingBefore(true);
    else setIsDraggingAfter(true);
  };

  const handleDragLeave = (target: 'before' | 'after') => {
    if (target === 'before') setIsDraggingBefore(false);
    else setIsDraggingAfter(false);
  };

  const handleDrop = (e: React.DragEvent, target: 'before' | 'after') => {
    e.preventDefault();
    if (target === 'before') setIsDraggingBefore(false);
    else setIsDraggingAfter(false);

    const current = target === 'before' ? beforePhotos : afterPhotos;
    const remaining = 6 - current.length;
    if (remaining <= 0) { setError('Ya tienes el máximo de 6 fotos'); return; }

    const files = Array.from(e.dataTransfer.files)
      .filter(f => f.type.startsWith('image/'))
      .slice(0, remaining);

    if (files.length === 0) { setError('Solo se permiten imágenes'); return; }
    setError(null);
    files.forEach(f => addPhotoFile(f, target));
  };

  // ── Multi-select ────────────────────────────────────────────────────────────

  const toggleSelectMode = () => {
    setIsSelectMode(prev => !prev);
    setBeforeSelected(new Set());
    setAfterSelected(new Set());
  };

  const togglePhotoSelection = (index: number, target: 'before' | 'after') => {
    const setter = target === 'before' ? setBeforeSelected : setAfterSelected;
    setter(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const removeSelectedPhotos = (target: 'before' | 'after') => {
    if (target === 'before') {
      setBeforePhotos(prev => prev.filter((_, i) => !beforeSelected.has(i)));
      setBeforePreviews(prev => prev.filter((_, i) => !beforeSelected.has(i)));
      setBeforeSelected(new Set());
    } else {
      setAfterPhotos(prev => prev.filter((_, i) => !afterSelected.has(i)));
      setAfterPreviews(prev => prev.filter((_, i) => !afterSelected.has(i)));
      setAfterSelected(new Set());
    }
  };

  // Long press to enter select mode on mobile/tablet
  const handlePhotoTouchStart = (index: number, target: 'before' | 'after') => {
    longPressTimer.current = setTimeout(() => {
      setIsSelectMode(true);
      togglePhotoSelection(index, target);
    }, 500);
  };

  const handlePhotoTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const resetPhotoState = () => {
    setBeforePhotos([]);
    setAfterPhotos([]);
    setBeforePreviews([]);
    setAfterPreviews([]);
    setBeforeSelected(new Set());
    setAfterSelected(new Set());
    setIsSelectMode(false);
    setIsDraggingBefore(false);
    setIsDraggingAfter(false);
  };

  const handleClose = () => {
    resetPhotoState();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!allServicesConfirmed) {
      setError('Por favor confirma todos los tratamientos realizados');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress('Procesando...');

    try {
      let beforePhotoUrls: string[] = [];
      let afterPhotoUrls: string[] = [];

      if (beforePhotos.length > 0) {
        setUploadProgress('Subiendo fotos de antes...');
        const response = await appointmentsService.uploadTreatmentPhotos(beforePhotos);
        beforePhotoUrls = response.urls;
      }

      if (afterPhotos.length > 0) {
        setUploadProgress('Subiendo fotos de después...');
        const response = await appointmentsService.uploadTreatmentPhotos(afterPhotos);
        afterPhotoUrls = response.urls;
      }

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

      setFormData({ treatmentNotes: '', weight: '', healthNotes: '' });
      resetPhotoState();
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

  // ── Photo section renderer ──────────────────────────────────────────────────

  const renderPhotoSection = (target: 'before' | 'after') => {
    const isBefore = target === 'before';
    const previews = isBefore ? beforePreviews : afterPreviews;
    const selected = isBefore ? beforeSelected : afterSelected;
    const isDragging = isBefore ? isDraggingBefore : isDraggingAfter;
    const inputRef = isBefore ? beforeInputRef : afterInputRef;
    const accentColor = isBefore ? '#3498db' : '#2ecc71';
    const label = isBefore ? 'Fotos de Antes' : 'Fotos de Después';
    const handleChange = isBefore ? handleBeforePhotosChange : handleAfterPhotosChange;
    const removePhoto = isBefore ? removeBeforePhoto : removeAfterPhoto;

    const hasPhotos = previews.length > 0;
    const selectedCount = selected.size;

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <label style={{ fontWeight: '600', color: '#2c3e50' }}>{label}</label>
          {hasPhotos && (
            <button
              type="button"
              onClick={toggleSelectMode}
              style={{
                background: 'none',
                border: `1px solid ${isSelectMode ? '#e74c3c' : '#bdc3c7'}`,
                borderRadius: '6px',
                padding: '3px 10px',
                fontSize: '12px',
                color: isSelectMode ? '#e74c3c' : '#7f8c8d',
                cursor: 'pointer',
              }}
            >
              {isSelectMode ? 'Cancelar' : 'Seleccionar'}
            </button>
          )}
        </div>

        {/* Drag & drop zone — desktop only */}
        {isDesktop ? (
          <div
            onDragOver={(e) => handleDragOver(e, target)}
            onDragLeave={() => handleDragLeave(target)}
            onDrop={(e) => handleDrop(e, target)}
            style={{
              border: `2px dashed ${isDragging ? accentColor : '#bdc3c7'}`,
              borderRadius: '8px',
              padding: '10px',
              background: isDragging ? `${accentColor}0d` : 'transparent',
              marginBottom: '8px',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                </svg>
                Galería
              </Button>
              <Button type="button" variant="secondary" onClick={() => setCameraTarget(target)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
                </svg>
                Cámara
              </Button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: isDragging ? accentColor : '#7f8c8d', fontSize: '11px', transition: 'color 0.15s' }}>
              {isDragging ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                  </svg>
                  Suelta las fotos aquí
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                  </svg>
                  Arrastra fotos aquí · Máx. 6 fotos, 5MB c/u
                </>
              )}
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: '8px' }}>
            <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()} style={{ width: '100%', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
              </svg>
              Subir de galería
            </Button>
            <Button type="button" variant="secondary" onClick={() => setCameraTarget(target)} style={{ width: '100%', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
              </svg>
              Tomar foto
            </Button>
            <p style={{ fontSize: '11px', color: '#7f8c8d', margin: 0 }}>
              Máximo 6 fotos, 5MB c/u
            </p>
          </div>
        )}

        <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleChange} style={{ display: 'none' }} />

        {/* Delete selected button */}
        {isSelectMode && selectedCount > 0 && (
          <button
            type="button"
            onClick={() => removeSelectedPhotos(target)}
            style={{
              width: '100%',
              marginBottom: '8px',
              padding: '8px',
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '13px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }}>
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
            </svg>
            Eliminar seleccionadas ({selectedCount})
          </button>
        )}

        {/* Photo grid */}
        {hasPhotos && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {previews.map((preview, index) => {
              const isSelected = selected.has(index);
              return (
                <div
                  key={index}
                  style={{ position: 'relative', cursor: isSelectMode ? 'pointer' : 'default' }}
                  onClick={isSelectMode ? () => togglePhotoSelection(index, target) : undefined}
                  onTouchStart={!isDesktop ? () => handlePhotoTouchStart(index, target) : undefined}
                  onTouchEnd={!isDesktop ? handlePhotoTouchEnd : undefined}
                  onTouchMove={!isDesktop ? handlePhotoTouchEnd : undefined}
                >
                  <img
                    src={preview}
                    alt={`${isBefore ? 'Before' : 'After'} ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '120px',
                      objectFit: 'cover',
                      borderRadius: '6px',
                      border: isSelectMode
                        ? `3px solid ${isSelected ? '#e74c3c' : '#bdc3c7'}`
                        : `2px solid ${accentColor}`,
                      opacity: isSelectMode && !isSelected ? 0.55 : 1,
                      transition: 'all 0.15s',
                      display: 'block',
                    }}
                  />

                  {/* Single-delete X — only when NOT in select mode */}
                  {!isSelectMode && (
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
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
                        fontWeight: 'bold',
                        lineHeight: '1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      ×
                    </button>
                  )}

                  {/* Checkbox indicator — only in select mode */}
                  {isSelectMode && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '6px',
                        left: '6px',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        border: `2px solid ${isSelected ? '#e74c3c' : 'white'}`,
                        background: isSelected ? '#e74c3c' : 'rgba(0,0,0,0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                      }}
                    >
                      {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M10 3L5 8.5L2 5.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  )}

                  {/* Mobile hint: long press indicator */}
                  {!isDesktop && !isSelectMode && previews.length > 1 && index === 0 && (
                    <div style={{
                      position: 'absolute',
                      bottom: '4px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(0,0,0,0.5)',
                      color: 'white',
                      fontSize: '9px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                    }}>
                      Mantén para seleccionar
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Registrar Atención Médica">
      <form onSubmit={handleSubmit} style={{ maxWidth: '900px', width: '100%' }}>
        {/* Header */}
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
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Servicios confirmados */}
        {confirmedServices.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#2c3e50', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
                    stroke="#3498db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Tratamientos Programados ({confirmedServices.length})
              </h3>
              {allServicesConfirmed ? (
                <span style={{ padding: '6px 12px', background: '#d4edda', color: '#155724', borderRadius: '20px', fontSize: '13px', fontWeight: '600', border: '1px solid #c3e6cb' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}><path d="M20 6L9 17l-5-5"/></svg>
                  Todos confirmados
                </span>
              ) : (
                <span style={{ padding: '6px 12px', background: '#fff3cd', color: '#856404', borderRadius: '20px', fontSize: '13px', fontWeight: '600', border: '1px solid #ffeeba' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  Confirmar tratamientos
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
                    background: service.confirmed ? 'linear-gradient(135deg, #d4edda 0%, #f0f9ff 100%)' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative' as const,
                  }}
                  onClick={() => toggleServiceConfirmation(index)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '8px',
                      border: service.confirmed ? '2px solid #27ae60' : '2px solid #bdc3c7',
                      background: service.confirmed ? '#27ae60' : 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'all 0.2s ease',
                    }}>
                      {service.confirmed && (
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path d="M15 4.5L6.75 12.75L3 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: '#2c3e50' }}>
                        {service.serviceName}
                      </h4>
                      {service.sessionNumber && service.totalSessions ? (
                        <span style={{ fontSize: '13px', color: '#7f8c8d', background: 'rgba(52, 152, 219, 0.1)', padding: '4px 10px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
                          </svg>
                          Sesión {service.sessionNumber} de {service.totalSessions}
                        </span>
                      ) : (
                        <span style={{ fontSize: '13px', color: '#7f8c8d', background: 'rgba(149, 165, 166, 0.1)', padding: '4px 10px', borderRadius: '12px', display: 'inline-block' }}>
                          Sesión independiente
                        </span>
                      )}
                    </div>
                    {service.confirmed && (
                      <div style={{ padding: '6px 12px', background: '#27ae60', color: 'white', borderRadius: '8px', fontSize: '12px', fontWeight: '600' }}>
                        CONFIRMADO
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <p style={{ margin: '12px 0 0 0', fontSize: '13px', color: '#7f8c8d', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 14A6 6 0 108 2a6 6 0 000 12zM8 5.333V8M8 10.667h.007"
                  stroke="#7f8c8d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Haz clic en cada tratamiento para confirmar que fue realizado
            </p>
          </div>
        )}

        {error && <div className="error-banner" style={{ marginBottom: '20px' }}>{error}</div>}

        {uploadProgress && (
          <div style={{ marginBottom: '20px', padding: '10px 15px', backgroundColor: '#d6eaf8', border: '1px solid #a9cce3', borderRadius: '4px', color: '#1a5490' }}>
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
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', fontFamily: 'inherit' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
          <Input label="Peso (kg)" type="number" name="weight" value={formData.weight} onChange={handleChange} placeholder="Ej: 65.5" step="0.1" />
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
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', fontFamily: 'inherit' }}
          />
        </div>

        {/* Fotos antes / después */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          {renderPhotoSection('before')}
          {renderPhotoSection('after')}
        </div>

        <div className="modal-actions" style={{ marginTop: '30px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="success" isLoading={isSubmitting} disabled={isSubmitting || !allServicesConfirmed}>
            {isSubmitting ? 'Guardando...' : allServicesConfirmed ? 'Confirmar Atención' : 'Confirmar todos los tratamientos'}
          </Button>
        </div>

        {!allServicesConfirmed && (
          <div style={{ marginTop: '12px', padding: '12px', background: '#fff3cd', border: '1px solid #ffeeba', borderRadius: '8px', color: '#856404', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 16.5a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM9 6v3M9 12h.008"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Por favor confirma todos los tratamientos realizados antes de continuar
          </div>
        )}
      </form>

      {cameraTarget && (
        <CameraCapture onClose={() => setCameraTarget(null)} onCapture={handleCameraCapture} />
      )}
    </Modal>
  );
};

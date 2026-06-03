import React, { useState, useRef, useEffect } from 'react';
import { Patient } from '../types';
import { patientsService, CreatePatientDto } from '../services/patients.service';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';
import { DatePicker } from './DatePicker';
import { utcToLocalDate } from '../utils/dateUtils';

interface CreatePatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (patient: Patient) => void;
  onUpdated?: (patient: Patient) => void;
  /** Si se pasa, el modal opera en modo edición */
  patientId?: string;
}

const EMPTY_FORM: CreatePatientDto = {
  firstName: '',
  lastName: '',
  dni: '',
  dateOfBirth: '',
  sex: 'F',
  phone: '',
  email: '',
  address: '',
  photoUrl: null,
};

const MAX_PHOTO_PX = 400;

const resizeToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(cropAndResize(img, img.naturalWidth, img.naturalHeight));
    };
    img.onerror = reject;
    img.src = url;
  });

const cropAndResize = (
  source: HTMLImageElement | HTMLVideoElement,
  srcW: number,
  srcH: number,
): string => {
  const size = Math.min(srcW, srcH);
  const sx = (srcW - size) / 2;
  const sy = (srcH - size) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = MAX_PHOTO_PX;
  canvas.height = MAX_PHOTO_PX;
  canvas.getContext('2d')!.drawImage(source as any, sx, sy, size, size, 0, 0, MAX_PHOTO_PX, MAX_PHOTO_PX);
  return canvas.toDataURL('image/jpeg', 0.82);
};

export const CreatePatientModal: React.FC<CreatePatientModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  onUpdated,
  patientId,
}) => {
  const isEditMode = !!patientId;

  const [form, setForm] = useState<CreatePatientDto>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cargar datos del paciente en modo edición
  useEffect(() => {
    if (isOpen && isEditMode && patientId) {
      loadPatient(patientId);
    }
    if (!isOpen) {
      setForm(EMPTY_FORM);
      setErrors({});
      setSaveError(null);
    }
  }, [isOpen, patientId]);

  const loadPatient = async (id: string) => {
    try {
      setIsLoadingPatient(true);
      setSaveError(null);
      const patient = await patientsService.getPatient(id);
      setForm({
        firstName: patient.firstName,
        lastName: patient.lastName,
        dni: patient.dni,
        dateOfBirth: utcToLocalDate(patient.dateOfBirth),
        sex: patient.sex,
        phone: patient.phone || '',
        email: patient.email || '',
        address: patient.address || '',
        photoUrl: patient.photoUrl ?? null,
      });
    } catch {
      setSaveError('Error al cargar datos del paciente');
    } finally {
      setIsLoadingPatient(false);
    }
  };

  // Conectar stream al video element
  useEffect(() => {
    if (showCamera && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [showCamera]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setShowCamera(false);
    setCameraError(null);
  };

  const handleClose = () => {
    stopCamera();
    setForm(EMPTY_FORM);
    setErrors({});
    setSaveError(null);
    onClose();
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'El nombre es requerido';
    if (!form.lastName.trim()) e.lastName = 'El apellido es requerido';
    if (!form.dni.trim()) e.dni = 'El DNI es requerido';
    else if (!/^\d{8}$/.test(form.dni)) e.dni = 'El DNI debe tener 8 dígitos';
    if (!form.dateOfBirth) e.dateOfBirth = 'La fecha de nacimiento es requerida';
    if (!form.phone?.trim()) e.phone = 'El teléfono es requerido';
    else if (!/^\d{9}$/.test(form.phone)) e.phone = 'El teléfono debe tener 9 dígitos';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setSaveError(null);
      const base64 = await resizeToBase64(file);
      setForm(prev => ({ ...prev, photoUrl: base64 }));
    } catch {
      setSaveError('Error al procesar la imagen');
    }
    e.target.value = '';
  };

  const handleOpenCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
      });
      streamRef.current = stream;
      setShowCamera(true);
    } catch {
      setCameraError('No se pudo acceder a la cámara. Verifica los permisos del navegador.');
    }
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video) return;
    const base64 = cropAndResize(video, video.videoWidth, video.videoHeight);
    setForm(prev => ({ ...prev, photoUrl: base64 }));
    stopCamera();
  };

  const handleRemovePhoto = () => setForm(prev => ({ ...prev, photoUrl: null }));

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      setIsSaving(true);
      setSaveError(null);
      if (isEditMode && patientId) {
        const updated = await patientsService.updatePatient(patientId, form);
        handleClose();
        onUpdated?.(updated);
      } else {
        const created = await patientsService.createPatient(form);
        handleClose();
        onCreated?.(created);
      }
    } catch (err: any) {
      setSaveError(err.response?.data?.message || 'Error al guardar paciente');
    } finally {
      setIsSaving(false);
    }
  };

  const title = isEditMode ? 'Editar Paciente' : 'Crear Nuevo Paciente';
  const submitLabel = isEditMode ? 'Guardar Cambios' : 'Crear Paciente';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      {isLoadingPatient ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          Cargando datos del paciente...
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
          {saveError && <div className="error-banner">{saveError}</div>}

          {/* ── SECCIÓN FOTO ── */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>

            {showCamera ? (
              <div style={{ width: '100%', maxWidth: '320px' }}>
                <div style={{
                  position: 'relative',
                  width: '100%',
                  paddingBottom: '100%',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: '#000',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: 'scaleX(-1)',
                    }}
                  />
                  {/* Guía circular */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                  }}>
                    <div style={{
                      width: '70%',
                      paddingBottom: '70%',
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.6)',
                      boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)',
                    }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                  <button type="button" onClick={stopCamera} style={cancelBtnStyle}>
                    Cancelar
                  </button>
                  <button type="button" onClick={handleCapture} style={captureBtnStyle}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <circle cx="9" cy="9" r="7" stroke="white" strokeWidth="1.8"/>
                      <circle cx="9" cy="9" r="3.5" fill="white"/>
                    </svg>
                    Capturar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div
                  onClick={() => !form.photoUrl && fileInputRef.current?.click()}
                  style={{
                    width: '96px',
                    height: '96px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: form.photoUrl
                      ? '3px solid var(--color-primary, #3b82f6)'
                      : '2px dashed #d1d5db',
                    background: form.photoUrl ? 'transparent' : '#f9fafb',
                    cursor: form.photoUrl ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'border-color 0.2s',
                  }}
                >
                  {form.photoUrl ? (
                    <img
                      src={form.photoUrl}
                      alt="Foto del paciente"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', color: '#9ca3af' }}>
                      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                        <path d="M14 18a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="1.8"/>
                        <path d="M24 21.333A2.667 2.667 0 0021.333 24H6.667A2.667 2.667 0 014 21.333V11.333a2.667 2.667 0 012.667-2.666h2l1.666-2.334h7.334L19.333 8.667h2A2.667 2.667 0 0124 11.333v10z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '0.3px' }}>FOTO</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button type="button" onClick={() => fileInputRef.current?.click()} style={linkBtnStyle('#3b82f6')}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M12.25 8.75v2.333A1.167 1.167 0 0111.083 12.25H2.917A1.167 1.167 0 011.75 11.083V8.75M9.917 4.667L7 1.75m0 0L4.083 4.667M7 1.75v7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {form.photoUrl ? 'Cambiar foto' : 'Subir foto'}
                  </button>

                  <button type="button" onClick={handleOpenCamera} style={linkBtnStyle('#6366f1')}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M7 9a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.4"/>
                      <path d="M12 10.667A1.333 1.333 0 0110.667 12H3.333A1.333 1.333 0 012 10.667V5.667a1.333 1.333 0 011.333-1.334h1l.834-1.166h3.666L9.667 4.333h1A1.333 1.333 0 0112 5.667v5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Tomar foto
                  </button>

                  {form.photoUrl && (
                    <button type="button" onClick={handleRemovePhoto} style={linkBtnStyle('#dc2626')}>
                      Quitar
                    </button>
                  )}
                </div>

                {cameraError && (
                  <p style={{ fontSize: '12px', color: '#dc2626', margin: 0, textAlign: 'center' }}>
                    {cameraError}
                  </p>
                )}

                <span style={{ fontSize: '11px', color: '#9ca3af' }}>Opcional · JPG, PNG o WebP</span>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          <Input label="Nombre *" name="firstName" value={form.firstName} onChange={handleChange} error={errors.firstName} placeholder="Ingrese el nombre" />
          <Input label="Apellido *" name="lastName" value={form.lastName} onChange={handleChange} error={errors.lastName} placeholder="Ingrese el apellido" />
          <Input label="DNI *" name="dni" value={form.dni} onChange={handleChange} error={errors.dni} placeholder="12345678" maxLength={8} disabled={isEditMode} />
          <DatePicker
            label="Fecha de Nacimiento *"
            value={form.dateOfBirth}
            onChange={(v) => {
              setForm(prev => ({ ...prev, dateOfBirth: v }));
              if (errors.dateOfBirth) setErrors(prev => ({ ...prev, dateOfBirth: '' }));
            }}
            error={errors.dateOfBirth}
            maxDate={new Date()}
          />
          <Select
            label="Sexo *"
            name="sex"
            value={form.sex}
            onChange={handleChange}
            options={[
              { value: 'F', label: 'Femenino' },
              { value: 'M', label: 'Masculino' },
            ]}
          />
          <Input label="Teléfono *" name="phone" value={form.phone} onChange={handleChange} error={errors.phone} placeholder="987654321" maxLength={9} />
          <Input label="Email" type="email" name="email" value={form.email || ''} onChange={handleChange} error={errors.email} placeholder="ejemplo@correo.com" />
          <Input label="Dirección" name="address" value={form.address || ''} onChange={handleChange} placeholder="Dirección completa" />
        </div>
      )}

      <div className="modal-actions">
        <Button type="button" variant="secondary" onClick={handleClose} disabled={isSaving}>
          Cancelar
        </Button>
        <Button type="button" variant="primary" onClick={handleSubmit} isLoading={isSaving} disabled={isSaving || isLoadingPatient}>
          {submitLabel}
        </Button>
      </div>
    </Modal>
  );
};

const linkBtnStyle = (color: string): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  fontSize: '12px',
  fontWeight: '600',
  color,
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: '4px 8px',
  borderRadius: '6px',
  fontFamily: 'inherit',
});

const cancelBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px',
  borderRadius: '10px',
  border: '1.5px solid #e5e7eb',
  background: 'white',
  color: '#6b7280',
  fontWeight: '600',
  fontSize: '13px',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const captureBtnStyle: React.CSSProperties = {
  flex: 2,
  padding: '10px',
  borderRadius: '10px',
  border: 'none',
  background: 'linear-gradient(135deg, #10b981, #059669)',
  color: 'white',
  fontWeight: '700',
  fontSize: '14px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
};

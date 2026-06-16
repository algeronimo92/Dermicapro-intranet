import React, { useState, useRef, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { CameraCapture } from './CameraCapture';

const MAX_PHOTOS = 6;

interface UploadPhotosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (files: File[]) => Promise<void>;
  type: 'before' | 'after';
  appointmentId: string;
  existingCount?: number;
}

export const UploadPhotosModal: React.FC<UploadPhotosModalProps> = ({
  isOpen, onClose, onSubmit, type, existingCount = 0,
}) => {
  const [photos, setPhotos]         = useState<File[]>([]);
  const [previews, setPreviews]     = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDesktop, setIsDesktop]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const remaining      = Math.max(0, MAX_PHOTOS - existingCount);
  const availableSlots = remaining - photos.length;
  const slotsFilled    = existingCount + photos.length;

  const addFiles = (files: File[]) => {
    if (files.length + photos.length > remaining) {
      setError(`Puedes agregar hasta ${remaining} foto${remaining !== 1 ? 's' : ''} más (límite: ${MAX_PHOTOS} por tipo)`);
      return;
    }
    for (const f of files) {
      if (!f.type.startsWith('image/')) { setError('Solo se permiten imágenes'); return; }
      if (f.size > 5 * 1024 * 1024)    { setError('Cada imagen debe ser menor a 5 MB'); return; }
    }
    setError(null);
    setPhotos(prev => [...prev, ...files]);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onloadend = () => setPreviews(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const handleFileChange  = (e: React.ChangeEvent<HTMLInputElement>) => addFiles(Array.from(e.target.files || []));
  const handleCameraCapture = (file: File) => { setShowCamera(false); addFiles([file]); };
  const removePhoto = (i: number) => {
    setPhotos(prev => prev.filter((_, j) => j !== i));
    setPreviews(prev => prev.filter((_, j) => j !== i));
  };

  // ── Drag & drop (desktop only) ────────────────────────────────────────────

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (availableSlots > 0) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (availableSlots <= 0) { setError('No hay más slots disponibles'); return; }
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')).slice(0, availableSlots);
    if (files.length === 0) { setError('Solo se permiten imágenes'); return; }
    addFiles(files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photos.length) { setError('Selecciona al menos una foto'); return; }
    setIsUploading(true);
    setError(null);
    try {
      await onSubmit(photos);
      setPhotos([]); setPreviews([]); onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al subir fotos');
    } finally { setIsUploading(false); }
  };

  const handleClose = () => {
    if (!isUploading) { setPhotos([]); setPreviews([]); setError(null); onClose(); }
  };

  const title       = type === 'before' ? 'Agregar Fotos de Antes' : 'Agregar Fotos de Después';
  const accentColor = type === 'before' ? 'var(--color-info)' : 'var(--color-success)';

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title={title}>
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>

          {/* ── Slot counter ── */}
          <div style={{
            background: 'var(--color-bg-secondary)',
            border: `2px solid ${accentColor}`,
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--spacing-sm) var(--spacing-md)',
            marginBottom: 'var(--spacing-md)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: accentColor, flexShrink: 0 }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2"/>
                  <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Fotos usadas
              </span>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: accentColor }}>
                {slotsFilled} / {MAX_PHOTOS}
              </span>
            </div>
            {/* Progress bar segments */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {Array.from({ length: MAX_PHOTOS }).map((_, i) => (
                <div key={i} style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 'var(--radius-full)',
                  background: i < existingCount
                    ? accentColor
                    : i < slotsFilled
                      ? `${accentColor}80`
                      : 'var(--color-border-primary)',
                  transition: 'background 0.2s ease',
                }}/>
              ))}
            </div>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 'var(--spacing-md)' }}>{error}</div>
          )}

          {remaining === 0 ? (
            <div style={{
              padding: 'var(--spacing-lg)',
              textAlign: 'center',
              background: 'var(--color-bg-secondary)',
              borderRadius: 'var(--radius-xl)',
              border: '2px dashed var(--color-border-primary)',
              color: 'var(--color-text-tertiary)',
              fontSize: 'var(--font-size-sm)',
              marginBottom: 'var(--spacing-md)',
            }}>
              Límite de {MAX_PHOTOS} fotos alcanzado para este tipo
            </div>
          ) : (
            <>
              {/* ── Drop zone wrapper (desktop) / plain wrapper (mobile) ── */}
              <div
                onDragOver={isDesktop ? handleDragOver : undefined}
                onDragLeave={isDesktop ? handleDragLeave : undefined}
                onDrop={isDesktop ? handleDrop : undefined}
                style={{
                  border: isDesktop ? `2px dashed ${isDragging ? accentColor : 'var(--color-border-primary)'}` : 'none',
                  borderRadius: isDesktop ? 'var(--radius-xl)' : 0,
                  padding: isDesktop ? 'var(--spacing-md)' : 0,
                  background: isDragging ? `color-mix(in srgb, ${accentColor} 8%, transparent)` : 'transparent',
                  transition: 'all 0.15s',
                  marginBottom: 'var(--spacing-md)',
                }}
              >
                {/* ── Action buttons ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginBottom: isDesktop ? 'var(--spacing-sm)' : 0 }}>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={isUploading}
                    className="upload-receipt-button"
                    style={{ flexDirection: 'row', justifyContent: 'flex-start', padding: 'var(--spacing-sm) var(--spacing-md)', gap: 'var(--spacing-md)' }}
                  >
                    <svg className="upload-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                    </svg>
                    <div style={{ textAlign: 'left' }}>
                      <div className="upload-label">Subir desde galería</div>
                      <div className="upload-hint">Selecciona una o varias fotos</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    disabled={isUploading}
                    className="upload-receipt-button"
                    style={{ flexDirection: 'row', justifyContent: 'flex-start', padding: 'var(--spacing-sm) var(--spacing-md)', gap: 'var(--spacing-md)' }}
                  >
                    <svg className="upload-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
                    </svg>
                    <div style={{ textAlign: 'left' }}>
                      <div className="upload-label">Tomar foto</div>
                      <div className="upload-hint">Usar la cámara del dispositivo</div>
                    </div>
                  </button>
                </div>

                {/* Drag hint — desktop only */}
                {isDesktop && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    marginTop: 'var(--spacing-sm)',
                    fontSize: 'var(--font-size-xs)',
                    color: isDragging ? accentColor : 'var(--color-text-tertiary)',
                    fontWeight: isDragging ? 'var(--font-weight-semibold)' : 'normal',
                    transition: 'color 0.15s',
                  }}>
                    {isDragging ? (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                        </svg>
                        Suelta las fotos aquí
                      </>
                    ) : (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                        </svg>
                        O arrastra fotos directamente aquí
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Hint — mobile only */}
              {!isDesktop && (
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', margin: '0 0 var(--spacing-md)', textAlign: 'center' }}>
                  {availableSlots} slot{availableSlots !== 1 ? 's' : ''} disponible{availableSlots !== 1 ? 's' : ''} · máx. 5 MB por foto
                </p>
              )}

              <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFileChange} style={{ display: 'none' }} />
            </>
          )}

          {/* ── Previews ── */}
          {previews.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'var(--spacing-sm)',
              marginBottom: 'var(--spacing-md)',
              padding: 'var(--spacing-sm)',
              border: `2px dashed ${accentColor}`,
              borderRadius: 'var(--radius-xl)',
              background: 'var(--color-bg-secondary)',
              maxHeight: 300,
              overflowY: 'auto',
            }}>
              {previews.map((preview, i) => (
                <div key={i} style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', aspectRatio: '1' }}>
                  <img
                    src={preview}
                    alt={`Foto ${i + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    disabled={isUploading}
                    style={{
                      position: 'absolute', top: 4, right: 4,
                      width: 24, height: 24, borderRadius: 'var(--radius-full)',
                      background: 'rgba(220,38,38,0.9)', color: '#fff',
                      border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M1 1l10 10M11 1L1 11"/>
                    </svg>
                  </button>
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'rgba(0,0,0,0.5)', color: '#fff',
                    fontSize: 9, fontWeight: 600, padding: '2px 4px', textAlign: 'center',
                  }}>
                    {i + 1}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={handleClose} disabled={isUploading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isUploading}
              disabled={isUploading || !photos.length}
            >
              {isUploading ? 'Subiendo…' : `Subir ${photos.length} foto${photos.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </form>
      </Modal>

      {showCamera && (
        <CameraCapture onClose={() => setShowCamera(false)} onCapture={handleCameraCapture} />
      )}
    </>
  );
};

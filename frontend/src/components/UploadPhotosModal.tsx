import React, { useState, useRef } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { CameraCapture } from './CameraCapture';

interface UploadPhotosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (files: File[]) => Promise<void>;
  type: 'before' | 'after';
  appointmentId: string;
}

export const UploadPhotosModal: React.FC<UploadPhotosModalProps> = ({
  isOpen, onClose, onSubmit, type,
}) => {
  const [photos, setPhotos]       = useState<File[]>([]);
  const [previews, setPreviews]   = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: File[]) => {
    if (files.length + photos.length > 10) { setError('Máximo 10 fotos'); return; }
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    addFiles(Array.from(e.target.files || []));

  const handleCameraCapture = (file: File) => {
    setShowCamera(false);
    addFiles([file]);
  };

  const removePhoto = (i: number) => {
    setPhotos(prev => prev.filter((_, j) => j !== i));
    setPreviews(prev => prev.filter((_, j) => j !== i));
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
          {error && (
            <div className="alert alert-error" style={{ marginBottom: 'var(--spacing-md)' }}>{error}</div>
          )}

          {/* ── Botones de origen ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
            {/* Galería / archivo */}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
              className="upload-receipt-button"
              style={{ padding: 'var(--spacing-md) var(--spacing-sm)' }}
            >
              <svg className="upload-icon" width="26" height="26" viewBox="0 0 32 32" fill="none">
                <path d="M16 6v14M16 6l-6 6M16 6l6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 24h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              <span className="upload-label">Subir archivo</span>
              <span className="upload-hint">Galería · arrastra</span>
            </button>

            {/* Cámara */}
            <button
              type="button"
              onClick={() => setShowCamera(true)}
              disabled={isUploading}
              className="upload-receipt-button"
              style={{ padding: 'var(--spacing-md) var(--spacing-sm)' }}
            >
              <svg className="upload-icon" width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path d="M23 7l-7 5 7 5V7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <span className="upload-label">Tomar foto</span>
              <span className="upload-hint">Usar cámara</span>
            </button>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', margin: '0 0 var(--spacing-md)' }}>
            Máximo 10 fotos · 5 MB cada una
          </p>

          {/* ── Previews ── */}
          {previews.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: 'var(--spacing-sm)',
              marginBottom: 'var(--spacing-md)',
              maxHeight: 360,
              overflowY: 'auto',
              padding: 'var(--spacing-sm)',
              border: `2px dashed ${accentColor}`,
              borderRadius: 'var(--radius-xl)',
              background: 'var(--color-bg-secondary)',
            }}>
              {previews.map((preview, i) => (
                <div key={i} style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  <img
                    src={preview}
                    alt={`Foto ${i + 1}`}
                    style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }}
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    disabled={isUploading}
                    style={{
                      position: 'absolute', top: 5, right: 5,
                      width: 26, height: 26, borderRadius: 'var(--radius-full)',
                      background: 'rgba(220,38,38,0.85)', color: '#fff',
                      border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >×</button>
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'rgba(0,0,0,0.55)', color: '#fff',
                    fontSize: 10, fontWeight: 600, padding: '2px 6px', textAlign: 'center',
                  }}>
                    Foto {i + 1}
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
        <CameraCapture
          onClose={() => setShowCamera(false)}
          onCapture={handleCameraCapture}
        />
      )}
    </>
  );
};

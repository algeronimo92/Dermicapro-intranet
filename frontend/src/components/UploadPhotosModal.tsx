import React, { useState, useRef } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface UploadPhotosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (files: File[]) => Promise<void>;
  type: 'before' | 'after';
  appointmentId: string;
}

export const UploadPhotosModal: React.FC<UploadPhotosModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  type,
}) => {
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + photos.length > 10) {
      setError('Máximo 10 fotos');
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

    setError(null);
    setPhotos(prev => [...prev, ...files]);

    // Crear previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (photos.length === 0) {
      setError('Por favor selecciona al menos una foto');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      await onSubmit(photos);
      // Reset form
      setPhotos([]);
      setPreviews([]);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al subir fotos');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setPhotos([]);
      setPreviews([]);
      setError(null);
      onClose();
    }
  };

  const title = type === 'before' ? 'Agregar Fotos de Antes' : 'Agregar Fotos de Después';
  const borderColor = type === 'before' ? '#3498db' : '#2ecc71';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <form onSubmit={handleSubmit} style={{ maxWidth: '600px', width: '100%' }}>
        {error && (
          <div className="error-banner" style={{ marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => inputRef.current?.click()}
            style={{ width: '100%', marginBottom: '10px' }}
            disabled={isUploading}
          >
            📷 Seleccionar Fotos
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotosChange}
            style={{ display: 'none' }}
          />
          <p style={{ fontSize: '12px', color: '#7f8c8d', margin: 0 }}>
            Máximo 10 fotos, 5MB cada una
          </p>
        </div>

        {previews.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '12px',
            marginBottom: '20px',
            maxHeight: '400px',
            overflowY: 'auto',
            padding: '10px',
            border: '2px dashed #ddd',
            borderRadius: '8px'
          }}>
            {previews.map((preview, index) => (
              <div key={index} style={{ position: 'relative' }}>
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '150px',
                    objectFit: 'cover',
                    borderRadius: '4px',
                    border: `2px solid ${borderColor}`
                  }}
                />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  disabled={isUploading}
                  style={{
                    position: 'absolute',
                    top: '5px',
                    right: '5px',
                    background: '#e74c3c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isUploading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isUploading}
            disabled={isUploading || photos.length === 0}
          >
            {isUploading ? 'Subiendo...' : `Subir ${photos.length} Foto${photos.length > 1 ? 's' : ''}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

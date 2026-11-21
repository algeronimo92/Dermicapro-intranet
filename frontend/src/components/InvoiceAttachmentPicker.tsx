import React, { useEffect, useMemo, useState } from 'react';
import { Camera, FileText, Paperclip, X } from 'lucide-react';
import { CameraCaptureModal } from './CameraCaptureModal';
import { isTouchDevice } from '../utils/device';

const ACCEPT = '.jpg,.jpeg,.png,.pdf';

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  /** Cupo restante (5 menos los adjuntos que se conservan al editar) */
  maxFiles: number;
  disabled?: boolean;
}

/**
 * Adjuntos de un comprobante: subir archivos (JPG, PNG, PDF) o tomar la foto
 * del documento. En celular abre la cámara nativa; en PC, la webcam.
 */
export const InvoiceAttachmentPicker: React.FC<Props> = ({ files, onChange, maxFiles, disabled }) => {
  const [cameraOpen, setCameraOpen] = useState(false);
  const blocked = disabled || files.length >= maxFiles;

  // Miniaturas de las imágenes; se liberan al cambiar la lista o al desmontar.
  const previews = useMemo(
    () => files.map(f => (f.type.startsWith('image/') ? URL.createObjectURL(f) : '')),
    [files],
  );
  useEffect(() => () => previews.forEach(u => u && URL.revokeObjectURL(u)), [previews]);

  const add = (incoming: File[]) => {
    if (incoming.length) onChange([...files, ...incoming]);
  };

  const fromInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    add(Array.from(e.target.files ?? []));
    e.target.value = ''; // permite volver a elegir el mismo archivo
  };

  return (
    <div className="invoice-attachments">
      <div className="invoice-attachments__actions">
        <label className={`btn btn-secondary${blocked ? ' is-disabled' : ''}`}>
          <Paperclip size={16} aria-hidden="true" /> Subir archivos
          <input type="file" accept={ACCEPT} multiple hidden disabled={blocked} onChange={fromInput} />
        </label>
        {isTouchDevice() ? (
          <label className={`btn btn-secondary${blocked ? ' is-disabled' : ''}`}>
            <Camera size={16} aria-hidden="true" /> Tomar foto
            <input type="file" accept="image/jpeg,image/png" capture="environment" hidden disabled={blocked} onChange={fromInput} />
          </label>
        ) : (
          <button type="button" className="btn btn-secondary" disabled={blocked} onClick={() => setCameraOpen(true)}>
            <Camera size={16} aria-hidden="true" /> Tomar foto
          </button>
        )}
      </div>

      {files.length > 0 && (
        <ul className="invoice-attachments__list">
          {files.map((file, i) => (
            <li key={`${file.name}-${file.lastModified}-${i}`}>
              {previews[i]
                ? <img src={previews[i]} alt="" />
                : <span className="invoice-attachments__icon"><FileText size={20} aria-hidden="true" /></span>}
              <span className="invoice-attachments__name">{file.name}</span>
              <small>{(file.size / 1024 / 1024).toFixed(1)} MB</small>
              <button
                type="button"
                className="invoice-attachments__remove"
                aria-label={`Quitar ${file.name}`}
                disabled={disabled}
                onClick={() => onChange(files.filter((_, j) => j !== i))}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <CameraCaptureModal
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(file) => { add([file]); setCameraOpen(false); }}
      />
    </div>
  );
};

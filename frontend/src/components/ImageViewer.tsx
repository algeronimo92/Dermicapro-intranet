import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface ImageViewerProps {
  images: string[];
  initialIndex?: number;
  alt?: string;
  onClose: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  images,
  initialIndex = 0,
  alt = 'Imagen',
  onClose,
}) => {
  const [index, setIndex] = React.useState(initialIndex);
  const total = images.length;
  const hasPrev = index > 0;
  const hasNext = index < total - 1;

  const prev = useCallback(() => { if (hasPrev) setIndex(i => i - 1); }, [hasPrev]);
  const next = useCallback(() => { if (hasNext) setIndex(i => i + 1); }, [hasNext]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, prev, next]);

  if (!images.length) return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        cursor: 'zoom-out',
      }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 16, right: 16,
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)', border: 'none',
          color: '#fff', fontSize: 22, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >×</button>

      {/* Counter */}
      {total > 1 && (
        <div style={{
          position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
          color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600,
          background: 'rgba(0,0,0,0.4)', padding: '4px 12px', borderRadius: 20,
        }}>
          {index + 1} / {total}
        </div>
      )}

      {/* Prev */}
      {hasPrev && (
        <button
          onClick={e => { e.stopPropagation(); prev(); }}
          style={{
            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
            width: 44, height: 44, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)', border: 'none',
            color: '#fff', fontSize: 24, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >‹</button>
      )}

      {/* Image */}
      <img
        src={images[index]}
        alt={`${alt}${total > 1 ? ` ${index + 1}` : ''}`}
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '92vw', maxHeight: '88vh',
          objectFit: 'contain',
          borderRadius: 12,
          boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
          cursor: 'default',
        }}
      />

      {/* Next */}
      {hasNext && (
        <button
          onClick={e => { e.stopPropagation(); next(); }}
          style={{
            position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
            width: 44, height: 44, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)', border: 'none',
            color: '#fff', fontSize: 24, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >›</button>
      )}
    </div>,
    document.body
  );
};

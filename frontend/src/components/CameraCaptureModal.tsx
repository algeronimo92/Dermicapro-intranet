import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);

  const [phase, setPhase]       = useState<'loading' | 'preview' | 'captured' | 'error'>('loading');
  const [errMsg, setErrMsg]     = useState('');
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const startCamera = async (facing: 'user' | 'environment') => {
    stopStream();
    setPhase('loading');
    setErrMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPhase('preview');
    } catch (err: any) {
      const denied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      setErrMsg(
        denied
          ? 'Permiso de cámara denegado. Habilítalo en la configuración del navegador.'
          : 'No se pudo acceder a la cámara. Comprueba que esté conectada.'
      );
      setPhase('error');
    }
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    if (isOpen) {
      setSnapshot(null);
      setPhase('loading');
      startCamera(facingMode);
    } else {
      stopStream();
      setSnapshot(null);
      setPhase('loading');
    }
    return () => { if (!isOpen) stopStream(); };
  }, [isOpen]);

  const handleCapture = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setSnapshot(dataUrl);
    setPhase('captured');
    stopStream();
  };

  const handleRetake = () => {
    setSnapshot(null);
    startCamera(facingMode);
  };

  const handleConfirm = () => {
    if (!snapshot) return;
    const byteStr = atob(snapshot.split(',')[1]);
    const ab = new ArrayBuffer(byteStr.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteStr.length; i++) ia[i] = byteStr.charCodeAt(i);
    const blob = new Blob([ab], { type: 'image/jpeg' });
    const file = new File([blob], `comprobante-${Date.now()}.jpg`, { type: 'image/jpeg' });
    onCapture(file);
    onClose();
  };

  const handleFlip = () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    startCamera(next);
  };

  if (!isOpen) return null;

  const content = (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'var(--color-bg-overlay)',
        zIndex: 'var(--z-modal)' as any,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'var(--spacing-md)',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--color-bg-primary)',
          borderRadius: 'var(--radius-2xl)',
          boxShadow: 'var(--shadow-2xl)',
          width: '100%',
          maxWidth: 480,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'var(--spacing-md) var(--spacing-lg)',
          borderBottom: '1px solid var(--color-border-secondary)',
        }}>
          <h2 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Tomar foto del comprobante
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 'var(--radius-full)',
              border: '1.5px solid var(--color-border-primary)',
              background: 'var(--color-bg-secondary)',
              color: 'var(--color-text-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 18, lineHeight: 1,
            }}
          >×</button>
        </div>

        {/* Viewfinder */}
        <div style={{ position: 'relative', background: '#000', aspectRatio: '4/3', width: '100%' }}>
          {/* Video */}
          <video
            ref={videoRef}
            playsInline
            muted
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              display: phase === 'preview' ? 'block' : 'none',
            }}
          />

          {/* Canvas (hidden, used for snapshot) */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Snapshot preview */}
          {snapshot && (
            <img
              src={snapshot}
              alt="Captura"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          )}

          {/* Loading spinner */}
          {phase === 'loading' && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 'var(--spacing-sm)',
            }}>
              <div style={{
                width: 40, height: 40, border: '3px solid rgba(255,255,255,0.15)',
                borderTopColor: 'var(--color-primary)', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'var(--font-size-xs)' }}>Iniciando cámara…</span>
            </div>
          )}

          {/* Error */}
          {phase === 'error' && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 'var(--spacing-sm)', padding: 'var(--spacing-lg)',
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path d="M23 7l-7 5 7 5V7z" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="1" y="5" width="15" height="14" rx="2" stroke="#f87171" strokeWidth="2"/>
                <path d="M1 1l22 22" stroke="#f87171" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <p style={{ color: '#f87171', fontSize: 'var(--font-size-xs)', textAlign: 'center', margin: 0 }}>{errMsg}</p>
            </div>
          )}

          {/* Flip camera button (preview only, multiCamera) */}
          {phase === 'preview' && (
            <button
              onClick={handleFlip}
              title="Girar cámara"
              style={{
                position: 'absolute', top: 12, right: 12,
                width: 36, height: 36, borderRadius: 'var(--radius-full)',
                background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.25)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}

          {/* Corner guides (preview only) */}
          {phase === 'preview' && (
            <>
              {[['top', 'left'], ['top', 'right'], ['bottom', 'left'], ['bottom', 'right']].map(([v, h], i) => (
                <div key={i} style={{
                  position: 'absolute', width: 20, height: 20,
                  [v]: 8, [h]: 8,
                  borderTop: v === 'top' ? '2px solid rgba(255,255,255,0.5)' : 'none',
                  borderBottom: v === 'bottom' ? '2px solid rgba(255,255,255,0.5)' : 'none',
                  borderLeft: h === 'left' ? '2px solid rgba(255,255,255,0.5)' : 'none',
                  borderRight: h === 'right' ? '2px solid rgba(255,255,255,0.5)' : 'none',
                  borderRadius: `${v === 'top' && h === 'left' ? 'var(--radius-sm)' : ''} ${v === 'top' && h === 'right' ? 'var(--radius-sm)' : ''} ${v === 'bottom' && h === 'right' ? 'var(--radius-sm)' : ''} ${v === 'bottom' && h === 'left' ? 'var(--radius-sm)' : ''}`,
                }} />
              ))}
            </>
          )}
        </div>

        {/* Actions */}
        <div style={{ padding: 'var(--spacing-md) var(--spacing-lg)', display: 'flex', gap: 'var(--spacing-sm)' }}>
          {phase === 'preview' && (
            <>
              <button onClick={onClose} style={secondaryBtnStyle}>Cancelar</button>
              <button onClick={handleCapture} style={primaryBtnStyle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3" fill="currentColor"/>
                  <path d="M9 2H7a2 2 0 00-2 2v1M15 2h2a2 2 0 012 2v1M3 8v11a2 2 0 002 2h14a2 2 0 002-2V8M3 8h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Capturar foto
              </button>
            </>
          )}

          {phase === 'captured' && (
            <>
              <button onClick={handleRetake} style={secondaryBtnStyle}>Repetir</button>
              <button onClick={handleConfirm} style={primaryBtnStyle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Usar esta foto
              </button>
            </>
          )}

          {phase === 'error' && (
            <button onClick={onClose} style={{ ...secondaryBtnStyle, flex: 1 }}>Cerrar</button>
          )}

          {phase === 'loading' && (
            <button onClick={onClose} style={{ ...secondaryBtnStyle, flex: 1 }}>Cancelar</button>
          )}
        </div>
      </div>

      {/* CSS keyframe for spinner */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return createPortal(content, document.body);
};

const primaryBtnStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  padding: '10px var(--spacing-md)',
  borderRadius: 'var(--radius-lg)',
  background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
  border: 'none',
  color: 'var(--color-on-primary)',
  fontSize: 'var(--font-size-sm)',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: '10px var(--spacing-md)',
  borderRadius: 'var(--radius-lg)',
  background: 'var(--color-bg-secondary)',
  border: '1.5px solid var(--color-border-primary)',
  color: 'var(--color-text-secondary)',
  fontSize: 'var(--font-size-sm)',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

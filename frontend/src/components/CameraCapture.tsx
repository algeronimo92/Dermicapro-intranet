import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, RefreshCw, Check, CameraOff, Grid3x3,
  Timer, RotateCcw,
} from 'lucide-react';
import './CameraCapture.css';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

type CameraState = 'loading' | 'active' | 'countdown' | 'captured' | 'error';
type TimerMode = 0 | 3 | 5;

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [state, setState] = useState<CameraState>('loading');
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [cameraIndex, setCameraIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [timerMode, setTimerMode] = useState<TimerMode>(0);
  const [countdown, setCountdown] = useState(0);

  // Enumerate all video input devices
  const loadCameras = useCallback(async () => {
    try {
      // Ask permission first so labels are populated
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach(t => t.stop());
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setCameras(videoDevices);
      return videoDevices;
    } catch {
      return [];
    }
  }, []);

  const startCamera = useCallback(async (index: number, deviceList?: MediaDeviceInfo[]) => {
    setState('loading');
    setCapturedDataUrl(null);

    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    const list = deviceList ?? cameras;
    const device = list[index];

    try {
      const constraints: MediaStreamConstraints = device
        ? { video: { deviceId: { exact: device.deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false }
        : { video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState('active');
    } catch (err: any) {
      const name = err?.name ?? '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setErrorMsg('Permiso de cámara denegado. Actívalo en Configuración > Privacidad > Cámara.');
      } else if (name === 'NotFoundError') {
        setErrorMsg('No se encontró ninguna cámara en este dispositivo.');
      } else {
        // Retry without deviceId
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          streamRef.current = stream;
          if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
          setState('active');
          return;
        } catch {
          setErrorMsg('No se pudo acceder a la cámara.');
        }
      }
      setState('error');
    }
  }, [cameras]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await loadCameras();
      if (!cancelled) await startCamera(0, list);
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const switchCamera = (direction: 'prev' | 'next') => {
    if (cameras.length <= 1) return;
    const next = direction === 'next'
      ? (cameraIndex + 1) % cameras.length
      : (cameraIndex - 1 + cameras.length) % cameras.length;
    setCameraIndex(next);
    startCamera(next);
  };

  const cycleTimer = () => {
    setTimerMode(prev => (prev === 0 ? 3 : prev === 3 ? 5 : 0));
  };

  const doCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror only if this is specifically the front camera label
    const label = cameras[cameraIndex]?.label?.toLowerCase() ?? '';
    const isFront = label.includes('front') || label.includes('user') || label.includes('facetime');
    if (isFront) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedDataUrl(dataUrl);
    setState('captured');
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, [cameras, cameraIndex]);

  const handleShutter = () => {
    if (timerMode === 0) {
      doCapture();
      return;
    }
    // Start countdown
    setState('countdown');
    setCountdown(timerMode);
    let remaining = timerMode;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(countdownRef.current!);
        doCapture();
      }
    }, 1000);
  };

  const handleRetake = () => {
    setCapturedDataUrl(null);
    startCamera(cameraIndex);
  };

  const handleUsePhoto = () => {
    if (!capturedDataUrl) return;
    const byteString = atob(capturedDataUrl.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const blob = new Blob([ab], { type: 'image/jpeg' });
    onCapture(new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' }));
  };

  // Camera label for display
  const cameraLabel = (() => {
    if (cameras.length === 0) return 'Cámara';
    const label = cameras[cameraIndex]?.label;
    if (!label) return `Cámara ${cameraIndex + 1}`;
    // Shorten long labels
    if (label.length > 28) return label.slice(0, 26) + '…';
    return label;
  })();

  const isCapturing = state === 'active' || state === 'countdown';
  const hasMultipleCameras = cameras.length > 1;

  const content = (
    <div className="camera-capture">
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* ── Loading ── */}
      {state === 'loading' && (
        <div className="camera-capture__loading">
          <div className="spinner" />
          <span className="camera-capture__loading-text">Iniciando cámara…</span>
        </div>
      )}

      {/* ── Error ── */}
      {state === 'error' && (
        <div className="camera-capture__error">
          <div className="camera-capture__error-icon">
            <CameraOff size={30} strokeWidth={1.5} />
          </div>
          <p className="camera-capture__error-title">Cámara no disponible</p>
          <p className="camera-capture__error-desc">{errorMsg}</p>
          <button className="camera-capture__error-close" onClick={onClose}>
            Cerrar
          </button>
        </div>
      )}

      {/* ── Live video ── */}
      <video
        ref={videoRef}
        className="camera-capture__video"
        playsInline
        muted
        style={{ display: isCapturing ? 'block' : 'none' }}
      />

      {/* ── Captured preview ── */}
      {state === 'captured' && capturedDataUrl && (
        <img src={capturedDataUrl} alt="Vista previa" className="camera-capture__preview" />
      )}

      {/* ── Rule-of-thirds grid ── */}
      {showGrid && isCapturing && (
        <div className="camera-grid" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, i) => <div key={i} className="camera-grid__cell" />)}
        </div>
      )}

      {/* ── Countdown overlay ── */}
      {state === 'countdown' && (
        <div className="camera-countdown">
          <span className="camera-countdown__number" key={countdown}>{countdown}</span>
        </div>
      )}

      {/* ── Top bar (always visible except pure error) ── */}
      {state !== 'error' && (
        <div className="camera-capture__top">
          <div className="camera-capture__top-left">
            <span className="camera-capture__top-title">
              {state === 'captured' ? 'Vista previa' : cameraLabel}
            </span>
            {cameras.length > 1 && (
              <span className="camera-capture__camera-count">
                {cameraIndex + 1} / {cameras.length}
              </span>
            )}
          </div>

          <div className="camera-capture__top-actions">
            {/* Grid toggle — only during capture */}
            {isCapturing && (
              <button
                className={`camera-top-btn${showGrid ? ' camera-top-btn--active' : ''}`}
                onClick={() => setShowGrid(g => !g)}
                title="Cuadrícula de encuadre"
                aria-label="Cuadrícula"
              >
                <Grid3x3 size={17} strokeWidth={1.75} />
              </button>
            )}

            {/* Close */}
            <button
              className="camera-top-btn"
              onClick={onClose}
              aria-label="Cerrar cámara"
            >
              <X size={17} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* ── Bottom controls — CAPTURE mode ── */}
      {isCapturing && (
        <div className="camera-capture__controls">

          {/* Left slot — Timer */}
          <div className="camera-control-slot">
            <button
              className={`camera-action-btn${timerMode > 0 ? ' camera-action-btn--active' : ''}`}
              onClick={cycleTimer}
              title="Temporizador"
              aria-label="Temporizador"
            >
              <Timer size={20} strokeWidth={1.75} />
              {timerMode > 0 && <span className="camera-action-btn__badge">{timerMode}</span>}
            </button>
            <span className="camera-control-slot__label">
              {timerMode === 0 ? 'Sin timer' : `${timerMode} seg`}
            </span>
          </div>

          {/* Center — Shutter */}
          <div className="camera-shutter-wrapper">
            <button
              className={`camera-shutter${timerMode > 0 ? ' camera-shutter--timer' : ''}`}
              onClick={handleShutter}
              disabled={state === 'countdown'}
              aria-label="Tomar foto"
            />
          </div>

          {/* Right slot — Camera navigation (only if multiple cameras) */}
          {hasMultipleCameras ? (
            <div className="camera-control-slot">
              <div className="camera-action-btn-wrapper">
                <button
                  className="camera-action-btn"
                  onClick={() => switchCamera('next')}
                  title="Siguiente cámara"
                  aria-label="Cambiar cámara"
                >
                  <RefreshCw size={20} strokeWidth={1.75} />
                </button>
              </div>
              <span className="camera-control-slot__label">Cambiar</span>
            </div>
          ) : (
            /* Spacer to keep shutter centered on single-camera devices */
            <div className="camera-control-slot" aria-hidden="true" />
          )}
        </div>
      )}

      {/* ── Bottom controls — PREVIEW mode ── */}
      {state === 'captured' && (
        <div className="camera-capture__post-controls">
          <button className="camera-retake-btn" onClick={handleRetake}>
            <RotateCcw size={17} strokeWidth={2} />
            Retomar
          </button>
          <button className="camera-use-btn" onClick={handleUsePhoto}>
            <Check size={18} strokeWidth={2.5} />
            Usar foto
          </button>
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
};

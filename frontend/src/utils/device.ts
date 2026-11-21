/**
 * Celulares y tablets (puntero grueso). Ahí "Tomar foto" abre la cámara nativa
 * con <input capture>, que enfoca y expone mejor que el video del navegador;
 * en PC se usa la webcam con CameraCaptureModal.
 */
export const isTouchDevice = (): boolean =>
  typeof window !== 'undefined' && Boolean(window.matchMedia?.('(pointer: coarse)').matches);

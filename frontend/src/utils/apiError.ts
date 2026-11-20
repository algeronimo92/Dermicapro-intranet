import axios from 'axios';

/** Mensaje de error de la API (campo `error`) o un texto por defecto. */
export const apiErrorMessage = (err: unknown, fallback: string): string =>
  (axios.isAxiosError(err) && typeof err.response?.data?.error === 'string') ? err.response.data.error : fallback;

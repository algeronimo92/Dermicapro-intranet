import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { config } from '../config/env';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Registra un error inesperado con su stack trace, enlazado a la petición por
 * request_id.
 *
 * Existe porque los controladores capturan sus errores y responden 500 ellos
 * mismos, sin llamar a next(error): sin esto, el objeto de error se descarta y
 * el 500 queda en los logs sin ninguna pista de por qué ocurrió.
 *
 * Ignora los AppError a propósito: son fallos esperados y controlados (403,
 * 404, validaciones) y no aportan nada como stack trace.
 */
export const logUnexpectedError = (req: Request, err: unknown): void => {
  if (err instanceof AppError) return;

  const error = err instanceof Error ? err : new Error(String(err));

  // Un solo JSON: un stack crudo son varias líneas y Loki las indexaría como
  // entradas sueltas, dejando el error partido en trozos.
  console.error(
    JSON.stringify({
      event: 'unhandled_error',
      request_id: req.id,
      method: req.method,
      uri: req.originalUrl,
      error_name: error.name,
      error_message: error.message,
      stack: error.stack,
    })
  );
};

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof multer.MulterError) {
    const maxMB = Math.round(config.upload.maxFileSize / 1024 / 1024);
    const messages: Record<string, string> = {
      LIMIT_FILE_SIZE:       `El archivo supera el límite de ${maxMB} MB`,
      LIMIT_FILE_COUNT:      'Se superó el número máximo de archivos permitidos',
      LIMIT_UNEXPECTED_FILE: 'Campo de archivo inesperado',
      LIMIT_FIELD_KEY:       'Nombre de campo demasiado largo',
      LIMIT_FIELD_VALUE:     'Valor de campo demasiado largo',
      LIMIT_FIELD_COUNT:     'Demasiados campos en el formulario',
      LIMIT_PART_COUNT:      'Demasiadas partes en el formulario multipart',
    };
    res.status(400).json({ error: messages[err.code] ?? err.message });
    return;
  }

  if (
    err instanceof Error &&
    (err.message.startsWith('Tipo de archivo no válido') ||
      err.message.startsWith('Invalid file type'))
  ) {
    res.status(400).json({ error: err.message });
    return;
  }

  logUnexpectedError(req, err);
  res.status(500).json({ error: 'Error interno del servidor' });
};

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

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
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

  console.error('Unexpected error:', err);
  res.status(500).json({ error: 'Internal server error' });
};

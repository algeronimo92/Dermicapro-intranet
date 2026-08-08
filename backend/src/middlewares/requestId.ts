import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

const HEADER = 'x-request-id';
// Un id que venga de fuera acaba siendo una etiqueta en los logs: si se acepta
// tal cual, cualquiera puede inyectar saltos de línea o basura para ensuciar
// Loki. Sólo se reutiliza si parece un identificador razonable.
const VALID_ID = /^[A-Za-z0-9._-]{8,128}$/;

/**
 * Asigna un identificador a cada petición para poder seguirla completa en Loki:
 * la línea de acceso y, si revienta, también la del stack trace comparten el
 * mismo request_id.
 *
 * Se devuelve en la cabecera X-Request-Id para que, cuando un usuario reporte
 * un error, se pueda buscar exactamente su petición.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.get(HEADER);
  req.id = incoming && VALID_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}

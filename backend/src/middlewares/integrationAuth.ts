import { createHash, timingSafeEqual } from 'crypto';
import { Request, Response, NextFunction } from 'express';

const digest = (value: string): Buffer => createHash('sha256').update(value).digest();

/**
 * Autentica al CRM con un token compartido (CRM_INTEGRATION_TOKEN).
 *
 * Al revés que /metrics, sin la variable el endpoint queda cerrado: estas rutas
 * crean pacientes, citas y pagos, así que olvidarse de configurarlo no puede
 * dejarlas abiertas.
 *
 * Se comparan los hashes y no los textos porque timingSafeEqual exige buffers
 * del mismo largo, y cortar antes por longitud filtraría la del token.
 */
export const requireCrmToken = (req: Request, res: Response, next: NextFunction): void => {
  const expected = process.env.CRM_INTEGRATION_TOKEN;

  if (!expected) {
    res.status(503).json({ error: 'La integración con el CRM no está configurada en el ERP' });
    return;
  }

  const header = req.headers.authorization ?? '';
  const received = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';

  if (!received || !timingSafeEqual(digest(received), digest(expected))) {
    res.status(401).json({ error: 'Token de integración inválido' });
    return;
  }

  next();
};

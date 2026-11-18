import { Request, Response, NextFunction } from 'express';
import { checkCrmToken } from '../services/crmIntegrationConfig.service';
import { logUnexpectedError } from './errorHandler';

/**
 * Autentica al CRM con el token que un administrador genera en Configuración
 * (services/crmIntegrationConfig.service.ts).
 *
 * Sin token generado el endpoint queda cerrado: estas rutas crean pacientes,
 * citas y pagos, así que no haberlo configurado no puede dejarlas abiertas.
 */
export const requireCrmToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const header = req.headers.authorization ?? '';
  const received = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';

  try {
    const result = await checkCrmToken(received);
    if (result === 'not_configured') {
      res.status(503).json({ error: 'La integración con el CRM no está activa en el ERP: genera el token en Configuración' });
      return;
    }
    if (result === 'invalid') {
      res.status(401).json({ error: 'Token de integración inválido' });
      return;
    }
    next();
  } catch (error) {
    logUnexpectedError(req, error);
    res.status(500).json({ error: 'No se pudo verificar el token de integración' });
  }
};

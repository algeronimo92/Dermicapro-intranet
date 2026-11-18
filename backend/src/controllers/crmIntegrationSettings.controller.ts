import { Request, Response } from 'express';
import { AppError, logUnexpectedError } from '../middlewares/errorHandler';
import {
  generateCrmToken,
  getCrmIntegrationStatus,
  revokeCrmToken,
  setCrmFallbackUser,
} from '../services/crmIntegrationConfig.service';

function fail(req: Request, res: Response, error: unknown, fallback: string): void {
  logUnexpectedError(req, error);
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message });
  } else {
    res.status(500).json({ error: fallback });
  }
}

/** GET /api/settings/crm-integration — el estado, nunca el token. */
export const getCrmIntegration = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({ data: await getCrmIntegrationStatus() });
  } catch (error) {
    fail(req, res, error, 'Error al obtener la integración con el CRM');
  }
};

/**
 * POST /api/settings/crm-integration/token — genera (o regenera) el token.
 * La respuesta es la única vez que el token sale del ERP.
 */
export const createCrmToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, status } = await generateCrmToken(req.user!.id);
    res.status(201).json({ data: { ...status, token } });
  } catch (error) {
    fail(req, res, error, 'Error al generar el token');
  }
};

/** DELETE /api/settings/crm-integration/token — el ERP deja de aceptar citas del CRM. */
export const deleteCrmToken = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({ data: await revokeCrmToken() });
  } catch (error) {
    fail(req, res, error, 'Error al desactivar la integración');
  }
};

/** PUT /api/settings/crm-integration — el usuario de respaldo (null lo quita). */
export const updateCrmIntegration = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fallbackUserId } = req.body as { fallbackUserId?: unknown };
    if (fallbackUserId !== null && (typeof fallbackUserId !== 'string' || !fallbackUserId)) {
      throw new AppError('fallbackUserId debe ser el id de un usuario o null', 400);
    }
    res.json({ data: await setCrmFallbackUser(fallbackUserId) });
  } catch (error) {
    fail(req, res, error, 'Error al guardar la integración con el CRM');
  }
};

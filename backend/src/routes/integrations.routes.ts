import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as crmIntegrationController from '../controllers/crmIntegration.controller';
import { requireCrmToken } from '../middlewares/integrationAuth';
import { integrationLimiter } from '../middlewares/rateLimiter';
import { crmReceiptUpload, processUpload } from '../middlewares/upload';

const router = Router();

// ================================
// Integración con el CRM (sugerencias-chat)
// ================================
// Servidor a servidor, con un token compartido en vez del JWT de un usuario.
// El limitador va antes del token para frenar también a quien pruebe tokens.
router.use('/crm', integrationLimiter, requireCrmToken);

// El manejador global de errores informa el tope general de subidas (5 MB); el
// del comprobante del CRM es otro, así que su mensaje se arma aquí.
const receipt = (req: Request, res: Response, next: NextFunction): void => {
  crmReceiptUpload.single('receipt')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'El comprobante supera el límite de 10 MB' });
      return;
    }
    next(err);
  });
};

/**
 * GET /api/integrations/crm/ping
 * Comprueba la URL y el token sin crear nada.
 */
router.get('/crm/ping', crmIntegrationController.ping);

/**
 * POST /api/integrations/crm/appointments  (multipart/form-data)
 * Registra en la agenda una cita agendada en el CRM: paciente, paquete,
 * primera sesión y, si lo hay, el adelanto con su comprobante (`receipt`).
 * Repetir el envío con el mismo `externalId` devuelve la misma cita.
 */
router.post('/crm/appointments', receipt, processUpload, crmIntegrationController.createAppointment);

export default router;

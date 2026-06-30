import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { listAllPlatformAdmins, createPlatformAdminRecord, deactivatePlatformAdminById } from '../../platform/queries';
import { AppError } from '../../middlewares/errorHandler';

export const listPlatformAdminsHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const admins = await listAllPlatformAdmins();
    res.json({ data: admins.map(({ passwordHash: _ph, ...rest }) => rest) });
  } catch {
    res.status(500).json({ error: 'Error al obtener administradores' });
  }
};

export const createPlatformAdminHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password || !firstName || !lastName) {
      throw new AppError('email, password, firstName y lastName son requeridos', 400);
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await createPlatformAdminRecord({ email, passwordHash, firstName, lastName });
    const { passwordHash: _ph, ...safe } = admin;
    res.status(201).json({ data: safe });
  } catch (err) {
    if (err instanceof AppError) res.status(err.statusCode).json({ error: err.message });
    else res.status(500).json({ error: 'Error al crear administrador' });
  }
};

export const deactivatePlatformAdminHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (id === req.platformAdmin?.id) {
      throw new AppError('No puedes desactivar tu propia cuenta', 400);
    }
    await deactivatePlatformAdminById(id);
    res.status(204).send();
  } catch (err) {
    if (err instanceof AppError) res.status(err.statusCode).json({ error: err.message });
    else res.status(500).json({ error: 'Error al desactivar administrador' });
  }
};

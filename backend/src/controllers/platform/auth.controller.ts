import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { findPlatformAdminByEmail } from '../../platform/queries';
import { generatePlatformAdminToken } from '../../platform/jwt';
import { AppError } from '../../middlewares/errorHandler';

export const platformLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new AppError('Email y contraseña son requeridos', 400);
    }

    const admin = await findPlatformAdminByEmail(email);
    if (!admin) {
      throw new AppError('Credenciales inválidas', 401);
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      throw new AppError('Credenciales inválidas', 401);
    }

    const token = generatePlatformAdminToken({ id: admin.id, email: admin.email, role: 'platform_admin' });
    res.json({
      token,
      admin: { id: admin.id, email: admin.email, firstName: admin.firstName, lastName: admin.lastName },
    });
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Error al iniciar sesión' });
    }
  }
};

export const getPlatformAdminMe = async (req: Request, res: Response): Promise<void> => {
  const { id, email } = req.platformAdmin!;
  res.json({ id, email });
};

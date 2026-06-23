import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import prisma from '../config/database';
import { comparePassword, hashPassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, JwtPayload } from '../utils/jwt';
import { AppError } from '../middlewares/errorHandler';
import { isValidPinFormat, MAX_PIN_ATTEMPTS } from '../utils/pin';

// Selects the correct PrismaClient: tenant-scoped when available, global otherwise.
function getPrisma(req: Request): PrismaClient {
  return (req.tenantPrisma ?? prisma) as PrismaClient;
}

// Builds a JWT payload that includes tenantSlug when inside a tenant context.
function buildPayload(
  user: { id: string; email: string; roleId: string | null; role?: { name: string } | null },
  tenantSlug?: string
): JwtPayload {
  return {
    id: user.id,
    email: user.email,
    roleId: user.roleId,
    roleName: user.role?.name,
    ...(tenantSlug ? { tenantSlug } : {}),
  };
}

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('El correo y la contraseña son requeridos', 400);
    }

    const db = getPrisma(req);
    const user = await db.user.findUnique({ where: { email }, include: { role: true } });

    if (!user || !user.isActive) {
      throw new AppError('Credenciales inválidas', 401);
    }

    const isValidPassword = await comparePassword(password, user.passwordHash);

    if (!isValidPassword) {
      throw new AppError('Credenciales inválidas', 401);
    }

    if (user.pinFailedAttempts > 0) {
      await db.user.update({ where: { id: user.id }, data: { pinFailedAttempts: 0 } });
    }

    const payload = buildPayload(user, req.tenant?.slug);
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.json({
      accessToken,
      refreshToken,
      mustChangePassword: user.mustChangePassword,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        photoUrl: user.photoUrl ?? null,
        sex: user.sex ?? null,
        themeMode: user.themeMode,
        mustChangePassword: user.mustChangePassword,
        hasPin: !!user.pinHash,
        role: user.role ? { id: user.role.id, name: user.role.name, displayName: user.role.displayName } : null,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al iniciar sesión' });
    }
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('El token de actualización es requerido', 400);
    }

    const decoded = verifyRefreshToken(refreshToken);
    const db = getPrisma(req);
    const user = await db.user.findUnique({ where: { id: (decoded as JwtPayload).id }, include: { role: true } });

    if (!user || !user.isActive) {
      throw new AppError('Token de actualización inválido', 401);
    }

    // Preserve the tenantSlug from the original token (or from req.tenant if available).
    const tenantSlug = req.tenant?.slug ?? (decoded as JwtPayload).tenantSlug;
    const payload = buildPayload(user, tenantSlug);

    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(401).json({ error: 'Token de actualización inválido' });
    }
  }
};

export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('No autenticado', 401);
    }

    const db = getPrisma(req);
    const user = await db.user.findUnique({ where: { id: req.user.id }, include: { role: true } });

    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      photoUrl: user.photoUrl ?? null,
      sex: user.sex,
      dateOfBirth: user.dateOfBirth,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      themeMode: user.themeMode,
      hasPin: !!user.pinHash,
      createdAt: user.createdAt,
      role: user.role ? { id: user.role.id, name: user.role.name, displayName: user.role.displayName } : null,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al obtener usuario' });
    }
  }
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
  res.json({ message: 'Sesión cerrada correctamente' });
};

const VALID_THEME_MODES = ['light', 'dark', 'auto'] as const;

export const updateMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, email, sex, dateOfBirth, themeMode } = req.body;
    const updateData: any = {};

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (sex !== undefined) updateData.sex = sex || null;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    if (themeMode !== undefined) {
      if (!VALID_THEME_MODES.includes(themeMode)) {
        throw new AppError('themeMode inválido. Valores permitidos: light, dark, auto', 400);
      }
      updateData.themeMode = themeMode;
    }

    const db = getPrisma(req);
    if (email !== undefined) {
      const existing = await db.user.findUnique({ where: { email } });
      if (existing && existing.id !== req.user!.id) {
        throw new AppError('Este correo ya está en uso por otro usuario', 409);
      }
      updateData.email = email;
    }

    const user = await db.user.update({
      where: { id: req.user!.id },
      data: updateData,
      include: { role: true },
    });

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      photoUrl: user.photoUrl ?? null,
      sex: user.sex,
      dateOfBirth: user.dateOfBirth,
      isActive: user.isActive,
      themeMode: user.themeMode,
      hasPin: !!user.pinHash,
      createdAt: user.createdAt,
      role: user.role ? { id: user.role.id, name: user.role.name, displayName: user.role.displayName } : null,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al actualizar perfil' });
    }
  }
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('Se requieren la contraseña actual y la nueva', 400);
    }

    if (newPassword.length < 8) {
      throw new AppError('La nueva contraseña debe tener al menos 8 caracteres', 400);
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword)) {
      throw new AppError('La contraseña debe tener letras mayúsculas y minúsculas', 400);
    }
    if (!/\d/.test(newPassword)) {
      throw new AppError('La contraseña debe contener al menos un número', 400);
    }
    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      throw new AppError('La contraseña debe contener al menos un carácter especial', 400);
    }

    const db = getPrisma(req);
    const user = await db.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    const isValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new AppError('La contraseña actual es incorrecta', 401);
    }

    await db.user.update({
      where: { id: req.user!.id },
      data: { passwordHash: await hashPassword(newPassword), mustChangePassword: false },
    });

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al cambiar contraseña' });
    }
  }
};

export const loginWithPin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, pin } = req.body;

    if (!userId || !pin) {
      throw new AppError('El usuario y el PIN son requeridos', 400);
    }

    if (!/^\d{4}$/.test(pin)) {
      throw new AppError('El PIN debe tener 4 dígitos', 400);
    }

    const db = getPrisma(req);
    const user = await db.user.findUnique({ where: { id: userId }, include: { role: true } });

    if (!user || !user.isActive) {
      throw new AppError('Credenciales inválidas', 401);
    }

    if (!user.pinHash) {
      throw new AppError('PIN no configurado para este usuario', 400);
    }

    if (user.pinFailedAttempts >= MAX_PIN_ATTEMPTS) {
      throw new AppError('PIN bloqueado por demasiados intentos. Inicia sesión con tu contraseña para reactivarlo.', 423);
    }

    const isValidPin = await comparePassword(pin, user.pinHash);

    if (!isValidPin) {
      const attempts = user.pinFailedAttempts + 1;
      await db.user.update({ where: { id: user.id }, data: { pinFailedAttempts: attempts } });

      if (attempts >= MAX_PIN_ATTEMPTS) {
        throw new AppError('PIN incorrecto. Tu PIN ha sido bloqueado. Inicia sesión con tu contraseña para reactivarlo.', 423);
      }

      throw new AppError('PIN incorrecto', 401);
    }

    if (user.pinFailedAttempts > 0) {
      await db.user.update({ where: { id: user.id }, data: { pinFailedAttempts: 0 } });
    }

    const payload = buildPayload(user, req.tenant?.slug);
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.json({
      accessToken,
      refreshToken,
      mustChangePassword: user.mustChangePassword,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        photoUrl: user.photoUrl ?? null,
        sex: user.sex ?? null,
        themeMode: user.themeMode,
        mustChangePassword: user.mustChangePassword,
        hasPin: true,
        role: user.role ? { id: user.role.id, name: user.role.name, displayName: user.role.displayName } : null,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al iniciar sesión con PIN' });
    }
  }
};

export const setPin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, pin } = req.body;

    if (!currentPassword || !pin) {
      throw new AppError('Se requieren la contraseña actual y el PIN', 400);
    }

    if (!isValidPinFormat(pin)) {
      throw new AppError('El PIN debe tener 4 dígitos y no puede ser una combinación obvia', 400);
    }

    const db = getPrisma(req);
    const user = await db.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    const isValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new AppError('La contraseña actual es incorrecta', 401);
    }

    await db.user.update({
      where: { id: req.user!.id },
      data: { pinHash: await hashPassword(pin), pinFailedAttempts: 0 },
    });

    res.json({ message: 'PIN configurado correctamente' });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al configurar el PIN' });
    }
  }
};

export const removePin = async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getPrisma(req);
    await db.user.update({
      where: { id: req.user!.id },
      data: { pinHash: null, pinFailedAttempts: 0 },
    });

    res.json({ message: 'PIN eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el PIN' });
  }
};

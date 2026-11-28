import { Request, Response } from 'express';
import prisma from '../config/database';
import { comparePassword, hashPassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AppError, logUnexpectedError } from '../middlewares/errorHandler';
import { isValidPinFormat, MAX_PIN_ATTEMPTS } from '../utils/pin';
import { getModuleAccess } from '../services/moduleAccess.service';
import { getUserNotifications } from '../services/notifications.service';
import { passwordPolicyError } from '../utils/passwordPolicy';
import { isTokenRevoked } from '../utils/sessionRevocation';
import { requestPasswordReset, checkResetToken, resetPassword, INVALID_LINK_MESSAGE } from '../services/passwordReset.service';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('El correo y la contraseña son requeridos', 400);
    }

    const user = await prisma.user.findUnique({ where: { email }, include: { role: true } });

    if (!user || !user.isActive) {
      throw new AppError('Credenciales inválidas', 401);
    }

    const isValidPassword = await comparePassword(password, user.passwordHash);

    if (!isValidPassword) {
      throw new AppError('Credenciales inválidas', 401);
    }

    if (user.pinFailedAttempts > 0) {
      await prisma.user.update({ where: { id: user.id }, data: { pinFailedAttempts: 0 } });
    }

    const payload = {
      id: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role?.name,
    };

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
    logUnexpectedError(req, error);
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

    const user = await prisma.user.findUnique({ where: { id: decoded.id }, include: { role: true } });

    if (!user || !user.isActive || isTokenRevoked((decoded as { iat?: number }).iat, user.sessionsRevokedAt)) {
      throw new AppError('Token de actualización inválido', 401);
    }

    const payload = {
      id: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role?.name,
    };

    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    logUnexpectedError(req, error);
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

    const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { role: true } });

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
    logUnexpectedError(req, error);
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

    if (email !== undefined) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== req.user!.id) {
        throw new AppError('Este correo ya está en uso por otro usuario', 409);
      }
      updateData.email = email;
    }

    const user = await prisma.user.update({
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
    logUnexpectedError(req, error);
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

    if (!newPassword) {
      throw new AppError('Se requiere la nueva contraseña', 400);
    }

    const policyError = passwordPolicyError(newPassword);
    if (policyError) {
      throw new AppError(policyError, 400);
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    // En el primer inicio de sesión (o tras un cambio hecho por el admin) la
    // persona acaba de entrar con esa contraseña; no se le vuelve a pedir.
    if (!user.mustChangePassword) {
      if (!currentPassword) {
        throw new AppError('Se requieren la contraseña actual y la nueva', 400);
      }
      const isValid = await comparePassword(currentPassword, user.passwordHash);
      if (!isValid) {
        throw new AppError('La contraseña actual es incorrecta', 401);
      }
    }

    if (await comparePassword(newPassword, user.passwordHash)) {
      throw new AppError('La nueva contraseña debe ser distinta de la actual', 400);
    }

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { passwordHash: await hashPassword(newPassword), mustChangePassword: false },
    });

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    logUnexpectedError(req, error);
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

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });

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
      await prisma.user.update({ where: { id: user.id }, data: { pinFailedAttempts: attempts } });

      if (attempts >= MAX_PIN_ATTEMPTS) {
        throw new AppError('PIN incorrecto. Tu PIN ha sido bloqueado. Inicia sesión con tu contraseña para reactivarlo.', 423);
      }

      throw new AppError('PIN incorrecto', 401);
    }

    if (user.pinFailedAttempts > 0) {
      await prisma.user.update({ where: { id: user.id }, data: { pinFailedAttempts: 0 } });
    }

    const payload = {
      id: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role?.name,
    };

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
    logUnexpectedError(req, error);
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

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    const isValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new AppError('La contraseña actual es incorrecta', 401);
    }

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { pinHash: await hashPassword(pin), pinFailedAttempts: 0 },
    });

    res.json({ message: 'PIN configurado correctamente' });
  } catch (error) {
    logUnexpectedError(req, error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al configurar el PIN' });
    }
  }
};

export const removePin = async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { pinHash: null, pinFailedAttempts: 0 },
    });

    res.json({ message: 'PIN eliminado correctamente' });
  } catch (error) {
    logUnexpectedError(req, error);
    res.status(500).json({ error: 'Error al eliminar el PIN' });
  }
};

/** Qué módulos manejados por privilegios ve la persona y qué puede hacer en ellos. */
export const myModules = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json(await getModuleAccess(req.user!.id, req.user!.roleName));
  } catch (error) {
    logUnexpectedError(req, error);
    res.status(500).json({ error: 'Error al obtener los módulos disponibles' });
  }
};

/** Notificaciones de la campana del menú (stock bajo, según la configuración de Empleados). */
export const myNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json(await getUserNotifications(req.user!.id, req.user!.roleName));
  } catch (error) {
    logUnexpectedError(req, error);
    res.status(500).json({ error: 'Error al obtener las notificaciones' });
  }
};

export const FORGOT_PASSWORD_MESSAGE =
  'Si el correo pertenece a una cuenta activa, te enviamos un enlace para restablecer tu contraseña. Revisa también la carpeta de spam.';

/**
 * Responde siempre lo mismo y antes de buscar la cuenta, para no revelar qué
 * correos existen ni por el mensaje ni por el tiempo de respuesta.
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body ?? {};
  if (typeof email !== 'string' || !email.trim() || email.length > 254) {
    res.status(400).json({ error: 'Ingresa tu correo electrónico' });
    return;
  }

  res.json({ message: FORGOT_PASSWORD_MESSAGE });

  requestPasswordReset(email, req.ip).catch((error) => {
    console.error(JSON.stringify({
      event: 'password_reset_email_failed',
      request_id: req.id,
      error: error instanceof Error ? error.message : String(error),
    }));
  });
};

export const checkPasswordResetToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body ?? {};
    const result = typeof token === 'string' && token ? await checkResetToken(token) : null;
    if (!result) {
      res.status(400).json({ error: INVALID_LINK_MESSAGE });
      return;
    }
    res.json(result);
  } catch (error) {
    logUnexpectedError(req, error);
    res.status(500).json({ error: 'Error al verificar el enlace' });
  }
};

export const resetPasswordWithToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body ?? {};
    if (typeof token !== 'string' || !token) throw new AppError(INVALID_LINK_MESSAGE, 400);
    if (typeof newPassword !== 'string' || !newPassword) throw new AppError('Se requiere la nueva contraseña', 400);

    await resetPassword(token, newPassword, req.ip);
    res.json({ message: 'Tu contraseña se cambió. Ya puedes iniciar sesión.' });
  } catch (error) {
    logUnexpectedError(req, error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al restablecer la contraseña' });
    }
  }
};

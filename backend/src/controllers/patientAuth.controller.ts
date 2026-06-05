import { Request, Response } from 'express';
import prisma from '../config/database';
import { comparePassword, hashPassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AppError } from '../middlewares/errorHandler';
import { PatientJwtPayload } from '../types/auth.types';

/**
 * POST /api/patient-auth/login
 * Autentica a un paciente con email y contraseña
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    // Buscar paciente por email
    const patient = await prisma.patient.findFirst({
      where: { email },
    });

    if (!patient) {
      throw new AppError('Invalid credentials', 401);
    }

    // Validar que el paciente tiene acceso al portal
    if (!patient.hasPortalAccess) {
      throw new AppError('Portal access not enabled. Contact the clinic.', 403);
    }

    // Validar que el paciente tiene contraseña configurada
    if (!patient.passwordHash) {
      throw new AppError('Password not configured. Contact the clinic.', 403);
    }

    // Validar contraseña
    const isValidPassword = await comparePassword(password, patient.passwordHash);

    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    // Crear payload del JWT con type: 'patient'
    const payload: PatientJwtPayload = {
      id: patient.id,
      email: patient.email,
      type: 'patient',
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Actualizar lastLogin
    await prisma.patient.update({
      where: { id: patient.id },
      data: { lastLogin: new Date() },
    });

    res.json({
      accessToken,
      refreshToken,
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        dni: patient.dni,
        hasPortalAccess: patient.hasPortalAccess,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Patient login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
};

/**
 * POST /api/patient-auth/refresh
 * Refresca el access token usando el refresh token
 */
export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400);
    }

    const decoded = verifyRefreshToken(refreshToken) as PatientJwtPayload;

    // Validar que el token es de tipo paciente
    if (decoded.type !== 'patient') {
      throw new AppError('Invalid token type', 403);
    }

    // Buscar paciente
    const patient = await prisma.patient.findUnique({
      where: { id: decoded.id },
    });

    if (!patient || !patient.hasPortalAccess) {
      throw new AppError('Invalid refresh token', 401);
    }

    // Generar nuevos tokens
    const payload: PatientJwtPayload = {
      id: patient.id,
      email: patient.email,
      type: 'patient',
    };

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
      console.error('Patient refresh token error:', error);
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  }
};

/**
 * GET /api/patient-auth/me
 * Retorna información del paciente autenticado
 * Requiere middleware authenticatePatient
 */
export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.patient) {
      throw new AppError('Not authenticated', 401);
    }

    // Cargar datos completos del paciente
    const patient = await prisma.patient.findUnique({
      where: { id: req.patient.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
        email: true,
        dni: true,
        dateOfBirth: true,
        sex: true,
        phone: true,
        address: true,
        hasPortalAccess: true,
        lastLogin: true,
      },
    });

    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    res.json(patient);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Get patient info error:', error);
      res.status(500).json({ error: 'Failed to get patient information' });
    }
  }
};

/**
 * POST /api/patient-auth/logout
 * Logout del paciente (limpieza de tokens en cliente)
 */
export const logout = async (_req: Request, res: Response): Promise<void> => {
  try {
    // El logout es principalmente client-side (eliminar tokens del localStorage)
    // Aquí podríamos registrar el evento si lo necesitamos
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Patient logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

/**
 * POST /api/patient-auth/change-password
 * Permite al paciente cambiar su contraseña
 * Requiere middleware authenticatePatient
 */
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.patient) {
      throw new AppError('Not authenticated', 401);
    }

    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    // Validaciones de entrada
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      throw new AppError('All password fields are required', 400);
    }

    if (newPassword !== confirmNewPassword) {
      throw new AppError('New passwords do not match', 400);
    }

    if (newPassword === currentPassword) {
      throw new AppError('New password must be different from current password', 400);
    }

    // Validar complejidad de la contraseña
    if (newPassword.length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400);
    }

    if (!/[A-Z]/.test(newPassword)) {
      throw new AppError('Password must contain at least one uppercase letter', 400);
    }

    if (!/[a-z]/.test(newPassword)) {
      throw new AppError('Password must contain at least one lowercase letter', 400);
    }

    if (!/[0-9]/.test(newPassword)) {
      throw new AppError('Password must contain at least one number', 400);
    }

    // Cargar paciente con password hash
    const patient = await prisma.patient.findUnique({
      where: { id: req.patient.id },
    });

    if (!patient || !patient.passwordHash) {
      throw new AppError('Patient not found or password not configured', 404);
    }

    // Verificar contraseña actual
    const isValidPassword = await comparePassword(currentPassword, patient.passwordHash);

    if (!isValidPassword) {
      throw new AppError('Current password is incorrect', 401);
    }

    // Hash de la nueva contraseña
    const newPasswordHash = await hashPassword(newPassword);

    // Actualizar contraseña
    await prisma.patient.update({
      where: { id: patient.id },
      data: {
        passwordHash: newPasswordHash,
        passwordSetAt: new Date(),
        // No actualizamos passwordSetByStaffId porque es el paciente quien la cambió
      },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
};

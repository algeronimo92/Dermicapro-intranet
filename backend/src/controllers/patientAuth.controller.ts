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
      throw new AppError('El correo y la contraseña son requeridos', 400);
    }

    // Buscar paciente por email
    const patient = await prisma.patient.findFirst({
      where: { email },
    });

    if (!patient) {
      throw new AppError('Credenciales inválidas', 401);
    }

    // Validar que el paciente tiene acceso al portal
    if (!patient.hasPortalAccess) {
      throw new AppError('Acceso al portal no habilitado. Contacte a la clínica.', 403);
    }

    // Validar que el paciente tiene contraseña configurada
    if (!patient.passwordHash) {
      throw new AppError('Contraseña no configurada. Contacte a la clínica.', 403);
    }

    // Validar contraseña
    const isValidPassword = await comparePassword(password, patient.passwordHash);

    if (!isValidPassword) {
      throw new AppError('Credenciales inválidas', 401);
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
      res.status(500).json({ error: 'Error al iniciar sesión' });
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
      throw new AppError('El token de actualización es requerido', 400);
    }

    const decoded = verifyRefreshToken(refreshToken) as PatientJwtPayload;

    // Validar que el token es de tipo paciente
    if (decoded.type !== 'patient') {
      throw new AppError('Tipo de token inválido', 403);
    }

    // Buscar paciente
    const patient = await prisma.patient.findUnique({
      where: { id: decoded.id },
    });

    if (!patient || !patient.hasPortalAccess) {
      throw new AppError('Token de actualización inválido', 401);
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
      res.status(401).json({ error: 'Token de actualización inválido' });
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
      throw new AppError('No autenticado', 401);
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
      throw new AppError('Paciente no encontrado', 404);
    }

    res.json(patient);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Get patient info error:', error);
      res.status(500).json({ error: 'Error al obtener información del paciente' });
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
    res.json({ message: 'Sesión cerrada correctamente' });
  } catch (error) {
    console.error('Patient logout error:', error);
    res.status(500).json({ error: 'Error al cerrar sesión' });
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
      throw new AppError('No autenticado', 401);
    }

    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    // Validaciones de entrada
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      throw new AppError('Todos los campos de contraseña son requeridos', 400);
    }

    if (newPassword !== confirmNewPassword) {
      throw new AppError('Las contraseñas nuevas no coinciden', 400);
    }

    if (newPassword === currentPassword) {
      throw new AppError('La nueva contraseña debe ser diferente a la actual', 400);
    }

    // Validar complejidad de la contraseña
    if (newPassword.length < 8) {
      throw new AppError('La contraseña debe tener al menos 8 caracteres', 400);
    }

    if (!/[A-Z]/.test(newPassword)) {
      throw new AppError('La contraseña debe contener al menos una letra mayúscula', 400);
    }

    if (!/[a-z]/.test(newPassword)) {
      throw new AppError('La contraseña debe contener al menos una letra minúscula', 400);
    }

    if (!/[0-9]/.test(newPassword)) {
      throw new AppError('La contraseña debe contener al menos un número', 400);
    }

    // Cargar paciente con password hash
    const patient = await prisma.patient.findUnique({
      where: { id: req.patient.id },
    });

    if (!patient || !patient.passwordHash) {
      throw new AppError('Paciente no encontrado o contraseña no configurada', 404);
    }

    // Verificar contraseña actual
    const isValidPassword = await comparePassword(currentPassword, patient.passwordHash);

    if (!isValidPassword) {
      throw new AppError('La contraseña actual es incorrecta', 401);
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

    res.json({ message: 'Contraseña cambiada correctamente' });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Error al cambiar contraseña' });
    }
  }
};

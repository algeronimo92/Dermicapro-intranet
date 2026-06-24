import { Request, Response } from 'express';
import fs from 'fs';
import { getPrisma } from '../utils/tenant';
import { AppError } from '../middlewares/errorHandler';
import { hashPassword } from '../utils/password';
import { ROLES } from '../constants/roles';

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', search = '', roleId = '', roleName = '', isActive = '' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    // Construir condiciones de búsqueda
    const conditions: any = {};

    // Filtro de búsqueda por texto
    if (search) {
      conditions.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' as const } },
        { lastName: { contains: search as string, mode: 'insensitive' as const } },
        { email: { contains: search as string, mode: 'insensitive' as const } },
      ];
    }

    // Filtro por rol (por ID o por nombre/slug)
    if (roleId) {
      conditions.roleId = roleId as string;
    } else if (roleName) {
      conditions.role = { name: roleName as string };
    }

    // Filtro por estado activo
    if (isActive !== '') {
      conditions.isActive = isActive === 'true';
    }

    const where = Object.keys(conditions).length > 0 ? conditions : {};

    const [users, total] = await Promise.all([
      getPrisma(req).user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { role: true },
      }),
      getPrisma(req).user.count({ where }),
    ]);

    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      photoUrl: user.photoUrl ?? null,
      role: user.role ? {
        id: user.role.id,
        name: user.role.name,
        displayName: user.role.displayName,
        description: user.role.description,

      } : null,
      sex: user.sex,
      dateOfBirth: user.dateOfBirth,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    res.json({
      data: formattedUsers,
      pagination: {
        page: parseInt(page as string),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await getPrisma(req).user.findUnique({
      where: { id },
      include: {
        role: true,
        _count: {
          select: {
            patientsCreated: true,
            appointmentsCreated: true,
            appointmentsAttended: true,
            patientRecords: true,
            commissions: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    const formattedUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role ? {
        id: user.role.id,
        name: user.role.name,
        displayName: user.role.displayName,
        description: user.role.description,

      } : null,
      sex: user.sex,
      dateOfBirth: user.dateOfBirth,
      isActive: user.isActive,
      photoUrl: user.photoUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      counts: user._count,
    };

    res.json(formattedUser);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al obtener usuario' });
    }
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, roleId, sex, dateOfBirth } = req.body;

    // Validar campos requeridos
    if (!email || !password || !firstName || !lastName) {
      throw new AppError('Faltan campos requeridos', 400);
    }

    // Verificar si el email ya existe
    const existingUser = await getPrisma(req).user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError('Ya existe un usuario con este correo electrónico', 409);
    }

    // Hash de la contraseña
    const passwordHash = await hashPassword(password);

    const user = await getPrisma(req).user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        roleId: roleId || null,
        sex: sex || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      },
      include: { role: true },
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role ? {
        id: user.role.id,
        name: user.role.name,
        displayName: user.role.displayName,
        description: user.role.description,

      } : null,
      sex: user.sex,
      dateOfBirth: user.dateOfBirth,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Error al crear usuario' });
    }
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { email, firstName, lastName, roleId, sex, dateOfBirth, isActive, password } = req.body;

    // Construir objeto de actualización
    const updateData: any = {};

    // Verificar si se está cambiando el email
    if (email !== undefined) {
      // Verificar que no exista otro usuario con ese email
      const existingUser = await getPrisma(req).user.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.id !== id) {
        throw new AppError('Ya existe otro usuario con este correo electrónico', 409);
      }

      updateData.email = email;
    }

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (sex !== undefined) updateData.sex = sex;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;

    if (roleId !== undefined) {
      updateData.roleId = roleId;
    }

    // Cambiar estado activo si se proporciona
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    // Si se proporciona nueva contraseña
    if (password) {
      updateData.passwordHash = await hashPassword(password);
    }

    const user = await getPrisma(req).user.update({
      where: { id },
      data: updateData,
      include: { role: true },
    });

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      photoUrl: user.photoUrl,
      role: user.role ? {
        id: user.role.id,
        name: user.role.name,
        displayName: user.role.displayName,
        description: user.role.description,

      } : null,
      sex: user.sex,
      dateOfBirth: user.dateOfBirth,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Error al actualizar usuario' });
    }
  }
};

export const deactivateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // No permitir que el usuario se desactive a sí mismo
    if (req.user!.id === id) {
      throw new AppError('No puedes desactivar tu propia cuenta', 400);
    }

    const user = await getPrisma(req).user.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({
      message: 'Usuario desactivado correctamente',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al desactivar usuario' });
    }
  }
};

export const activateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await getPrisma(req).user.update({
      where: { id },
      data: { isActive: true },
    });

    res.json({
      message: 'Usuario activado correctamente',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al activar usuario' });
  }
};

export const getUserStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await getPrisma(req).user.findUnique({
      where: { id },
      include: {
        role: true,
        _count: {
          select: {
            patientsCreated: true,
            appointmentsCreated: true,
            appointmentsAttended: true,
            patientRecords: true,
            commissions: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    let additionalStats: any = {};

    if (user.role?.name === ROLES.SALES) {
      // Estadísticas de ventas
      const commissionStats = await getPrisma(req).commission.aggregate({
        where: { salesPersonId: id },
        _sum: { commissionAmount: true },
        _count: true,
      });

      const paidCommissions = await getPrisma(req).commission.aggregate({
        where: {
          salesPersonId: id,
          status: 'paid',
        },
        _sum: { commissionAmount: true },
      });

      additionalStats = {
        totalCommissions: commissionStats._sum.commissionAmount || 0,
        paidCommissions: paidCommissions._sum.commissionAmount || 0,
        commissionCount: commissionStats._count || 0,
      };
    } else if (user.role?.name === ROLES.MEDICAL_STAFF) {
      // Estadísticas de enfermería
      const recentAppointments = await getPrisma(req).appointment.count({
        where: {
          attendedById: id,
          attendedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // últimos 30 días
          },
        },
      });

      additionalStats = {
        appointmentsLast30Days: recentAppointments,
      };
    }

    res.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role ? {
          id: user.role.id,
          name: user.role.name,
          displayName: user.role.displayName,
        description: user.role.description,
  
        } : null,
      },
      counts: user._count,
      ...additionalStats,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al obtener estadísticas del usuario' });
    }
  }
};

export const uploadUserPhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.file) {
      res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
      return;
    }

    const photoUrl = `/uploads/${req.file.filename}`;

    const user = await getPrisma(req).user.update({
      where: { id },
      data: { photoUrl },
      include: { role: true },
    });

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      photoUrl: user.photoUrl,
      role: user.role ? {
        id: user.role.id,
        name: user.role.name,
        displayName: user.role.displayName,
        description: user.role.description,
      } : null,
      sex: user.sex,
      dateOfBirth: user.dateOfBirth,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
    }
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error uploading user photo:', error);
      res.status(500).json({ error: 'Error al subir foto' });
    }
  }
};

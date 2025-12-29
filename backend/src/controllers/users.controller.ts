import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { hashPassword } from '../utils/password';

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', search = '', roleId = '', isActive = '' } = req.query;

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

    // Filtro por rol
    if (roleId) {
      conditions.roleId = roleId as string;
    }

    // Filtro por estado activo
    if (isActive !== '') {
      conditions.isActive = isActive === 'true';
    }

    const where = Object.keys(conditions).length > 0 ? conditions : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          role: {
            select: {
              id: true,
              name: true,
              displayName: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
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
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
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
      throw new AppError('User not found', 404);
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
        permissions: user.role.permissions.map(rp => ({
          id: rp.permission.id,
          name: rp.permission.name,
          displayName: rp.permission.displayName,
        })),
      } : null,
      sex: user.sex,
      dateOfBirth: user.dateOfBirth,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      counts: user._count,
    };

    res.json(formattedUser);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, roleId, sex, dateOfBirth } = req.body;

    // Validar campos requeridos
    if (!email || !password || !firstName || !lastName || !roleId) {
      throw new AppError('Missing required fields', 400);
    }

    // Verificar que el rol existe y está activo
    const role = await prisma.systemRole.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new AppError('Invalid role', 400);
    }

    if (!role.isActive) {
      throw new AppError('Cannot assign inactive role', 400);
    }

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError('User with this email already exists', 409);
    }

    // Hash de la contraseña
    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        roleId,
        sex: sex || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
      },
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
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
      res.status(500).json({ error: 'Failed to create user' });
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
      const existingUser = await prisma.user.findUnique({
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

    // Cambiar rol si se proporciona
    if (roleId !== undefined) {
      const role = await prisma.systemRole.findUnique({
        where: { id: roleId },
      });

      if (!role) {
        throw new AppError('Invalid role', 400);
      }

      if (!role.isActive) {
        throw new AppError('Cannot assign inactive role', 400);
      }

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

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        role: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
      },
    });

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
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
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
};

export const deactivateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // No permitir que el usuario se desactive a sí mismo
    if (req.user!.id === id) {
      throw new AppError('Cannot deactivate your own account', 400);
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: false },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
      },
    });

    res.json({
      message: 'User deactivated successfully',
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
      res.status(500).json({ error: 'Failed to deactivate user' });
    }
  }
};

export const activateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: true },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
      },
    });

    res.json({
      message: 'User activated successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to activate user' });
  }
};

export const getUserStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
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
      throw new AppError('User not found', 404);
    }

    // Estadísticas adicionales según el rol
    let additionalStats: any = {};

    if (user.role?.name === 'sales') {
      // Estadísticas de ventas
      const commissionStats = await prisma.commission.aggregate({
        where: { salesPersonId: id },
        _sum: { commissionAmount: true },
        _count: true,
      });

      const paidCommissions = await prisma.commission.aggregate({
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
    } else if (user.role?.name === 'nurse') {
      // Estadísticas de enfermería
      const recentAppointments = await prisma.appointment.count({
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
        role: user.role,
      },
      counts: user._count,
      ...additionalStats,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch user stats' });
    }
  }
};

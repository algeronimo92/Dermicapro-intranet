import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { hashPassword } from '../utils/password';
import { Role } from '@prisma/client';

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', search = '', role = '', isActive = '' } = req.query;

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
    if (role) {
      conditions.role = role as Role;
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
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          sex: true,
          dateOfBirth: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      data: users,
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
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        sex: true,
        dateOfBirth: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
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

    res.json(user);
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
    const { email, password, firstName, lastName, role, sex, dateOfBirth } = req.body;

    // Validar campos requeridos
    if (!email || !password || !firstName || !lastName || !role) {
      throw new AppError('Missing required fields', 400);
    }

    // Validar que el rol sea válido
    if (!['admin', 'nurse', 'sales'].includes(role)) {
      throw new AppError('Invalid role', 400);
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
        role: role as Role,
        sex: sex || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        sex: true,
        dateOfBirth: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json(user);
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
    const { firstName, lastName, role, sex, dateOfBirth, isActive, password } = req.body;

    // Construir objeto de actualización
    const updateData: any = {
      firstName,
      lastName,
      sex,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
    };

    // Solo admin puede cambiar el rol y estado activo
    if (req.user!.role === 'admin') {
      if (role) {
        if (!['admin', 'nurse', 'sales'].includes(role)) {
          throw new AppError('Invalid role', 400);
        }
        updateData.role = role as Role;
      }
      if (isActive !== undefined) {
        updateData.isActive = isActive;
      }
    }

    // Si se proporciona nueva contraseña
    if (password) {
      updateData.passwordHash = await hashPassword(password);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        sex: true,
        dateOfBirth: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(user);
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
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    res.json({ message: 'User deactivated successfully', user });
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
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    res.json({ message: 'User activated successfully', user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to activate user' });
  }
};

export const getUserStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
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

    if (user.role === 'sales') {
      // Estadísticas de ventas
      const commissionStats = await prisma.commission.aggregate({
        where: { salesPersonId: id },
        _sum: { commissionAmount: true },
        _count: true,
      });

      const paidCommissions = await prisma.commission.aggregate({
        where: {
          salesPersonId: id,
          status: 'paid'
        },
        _sum: { commissionAmount: true },
      });

      additionalStats = {
        totalCommissions: commissionStats._sum.commissionAmount || 0,
        paidCommissions: paidCommissions._sum.commissionAmount || 0,
        commissionCount: commissionStats._count || 0,
      };
    } else if (user.role === 'nurse') {
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

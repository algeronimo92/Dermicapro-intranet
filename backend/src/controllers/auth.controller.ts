import { Request, Response } from 'express';
import prisma from '../config/database';
import { comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AppError } from '../middlewares/errorHandler';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
      },
    });

    if (!user || !user.isActive) {
      throw new AppError('Invalid credentials', 401);
    }

    const isValidPassword = await comparePassword(password, user.passwordHash);

    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
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
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role ? {
          id: user.role.id,
          name: user.role.name,
          displayName: user.role.displayName,
        } : null,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Login failed' });
    }
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400);
    }

    const decoded = verifyRefreshToken(refreshToken);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        role: true,
      },
    });

    if (!user || !user.isActive) {
      throw new AppError('Invalid refresh token', 401);
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
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  }
};

export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      sex: user.sex,
      dateOfBirth: user.dateOfBirth,
      isActive: user.isActive,
      createdAt: user.createdAt,
      role: user.role ? {
        id: user.role.id,
        name: user.role.name,
        displayName: user.role.displayName,
        description: user.role.description,
        isActive: user.role.isActive,
        isSystem: user.role.isSystem,
        createdAt: user.role.createdAt,
        updatedAt: user.role.updatedAt,
      } : null,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  }
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
  res.json({ message: 'Logged out successfully' });
};

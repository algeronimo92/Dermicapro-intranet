import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard/dashboard.service';
import { AppError } from '../middlewares/errorHandler';
import { getPrisma } from '../utils/tenant';

export const getDashboard = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Usuario no autenticado', 401);
    }

    const { period } = req.query;
    const roleName = req.user.roleName;
    const userId = req.user.id;

    if (!roleName) {
      throw new AppError('Usuario sin rol asignado', 403);
    }

    const svc = new DashboardService(getPrisma(req));
    const data = await svc.getDashboard(roleName, userId, { period });

    res.json({ data });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error al obtener dashboard:', error);
      res.status(500).json({ error: 'Error al obtener datos del dashboard' });
    }
  }
};

export const getAvailableRoles = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const svc = new DashboardService(getPrisma(req));
    const roles = svc.getAvailableRoles();
    res.json({ roles });
  } catch (error) {
    console.error('Error al obtener roles disponibles:', error);
    res.status(500).json({ error: 'Error al obtener roles disponibles' });
  }
};

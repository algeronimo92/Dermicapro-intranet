import { Request, Response } from 'express';
import { dashboardService } from '../services/dashboard/dashboard.service';
import { AppError } from '../middlewares/errorHandler';

/**
 * Controller para endpoints de dashboards
 * Delega la lógica de negocio al DashboardService que usa Strategy Pattern
 */

/**
 * GET /api/dashboard
 *
 * Obtiene los datos del dashboard para el usuario autenticado
 * El tipo de dashboard se determina automáticamente por el rol del usuario
 *
 * Query params:
 * - period: 'today' | 'week' | 'month' | 'year' (opcional, default: 'month')
 *
 * @requires authenticate middleware - req.user debe estar presente
 */
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

    // Validar que el usuario tenga un rol asignado
    if (!roleName) {
      throw new AppError('Usuario sin rol asignado', 403);
    }

    // Delegar al servicio que aplicará la estrategia correspondiente
    const data = await dashboardService.getDashboard(roleName, userId, {
      period,
    });

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

/**
 * GET /api/dashboard/available-roles
 *
 * Obtiene la lista de roles que tienen dashboard disponible
 * Útil para debugging y documentación
 */
export const getAvailableRoles = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const roles = dashboardService.getAvailableRoles();
    res.json({ roles });
  } catch (error) {
    console.error('Error al obtener roles disponibles:', error);
    res.status(500).json({ error: 'Error al obtener roles disponibles' });
  }
};

import { PrismaClient } from '@prisma/client';
import prisma from '../../config/database';
import { DashboardStrategy } from './strategies/base.strategy';
import { AdminDashboardStrategy } from './strategies/admin.strategy';
import { NurseDashboardStrategy } from './strategies/nurse.strategy';
import { SalesDashboardStrategy } from './strategies/sales.strategy';
import { DashboardData } from '../../types/dashboard.types';
import { AppError } from '../../middlewares/errorHandler';

/**
 * Dashboard Service
 *
 * Implementa Strategy Pattern para soportar diferentes dashboards por rol
 * Permite agregar nuevos roles sin modificar código existente (Open/Closed Principle)
 */
export class DashboardService {
  private strategies: Map<string, DashboardStrategy>;

  constructor(prisma: PrismaClient) {
    // Registro de estrategias: Map<roleName, Strategy>
    this.strategies = new Map<string, DashboardStrategy>([
      ['admin', new AdminDashboardStrategy(prisma)],
      ['nurse', new NurseDashboardStrategy(prisma)],
      ['sales', new SalesDashboardStrategy(prisma)],
    ]);
  }

  /**
   * Obtiene los datos del dashboard para un rol específico
   *
   * @param roleName - Nombre del rol (admin, nurse, sales)
   * @param userId - ID del usuario autenticado
   * @param filters - Filtros opcionales (período, fechas)
   * @returns Datos específicos del dashboard según el rol
   * @throws AppError si el rol no tiene dashboard disponible
   */
  async getDashboard(
    roleName: string,
    userId: string,
    filters?: any
  ): Promise<DashboardData> {
    const strategy = this.strategies.get(roleName);

    if (!strategy) {
      throw new AppError(
        `Dashboard no disponible para el rol: ${roleName}`,
        404
      );
    }

    return strategy.execute(userId, filters);
  }

  /**
   * Factory method: Permite registrar nuevas estrategias en runtime
   * Útil para extensibilidad futura (plugins, módulos dinámicos)
   *
   * @param roleName - Nombre del rol
   * @param strategy - Instancia de la estrategia
   */
  registerStrategy(roleName: string, strategy: DashboardStrategy): void {
    this.strategies.set(roleName, strategy);
  }

  /**
   * Obtiene la lista de roles que tienen dashboard disponible
   *
   * @returns Array de nombres de roles
   */
  getAvailableRoles(): string[] {
    return Array.from(this.strategies.keys());
  }
}

// Singleton: Exportar instancia única del servicio
export const dashboardService = new DashboardService(prisma);

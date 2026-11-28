import prisma from '../config/database';
import { ROLES, RoleName } from '../constants/roles';
import { getModuleAccess } from './moduleAccess.service';

/**
 * Notificaciones del sistema (campana del menú).
 *
 * El aviso de stock bajo lo reciben sólo admin e inventario, y siempre que
 * puedan ver Inventario (los datos que muestra).
 */
export const LOW_STOCK_ROLES: readonly RoleName[] = [ROLES.ADMIN, ROLES.INVENTORY];
export const MAX_LOW_STOCK_ITEMS = 20;

export interface LowStockItem {
  id: string;
  name: string;
  brand: string | null;
  presentation: string | null;
  stock: number;
  minStock: number;
  targetStock: number | null;
}

export interface UserNotifications {
  /** null: la persona no recibe este tipo. */
  lowStock: { count: number; items: LowStockItem[] } | null;
}

/**
 * Notificaciones de la persona. Corre como dueño de la base (ruta /api/auth),
 * por eso antes comprueba que su rol pueda ver Inventario.
 */
export async function getUserNotifications(userId: string, roleName: string | undefined): Promise<UserNotifications> {
  if (!LOW_STOCK_ROLES.includes(roleName as RoleName)) return { lowStock: null };

  const access = await getModuleAccess(userId, roleName);
  if (!access.inventory.view) return { lowStock: null };

  const where = { isActive: true, stock: { lte: prisma.product.fields.minStock } };
  const [count, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      select: { id: true, name: true, brand: true, presentation: true, stock: true, minStock: true, targetStock: true },
      // Primero los agotados y los que más bajo están.
      orderBy: [{ stock: 'asc' }, { name: 'asc' }],
      take: MAX_LOW_STOCK_ITEMS,
    }),
  ]);
  return { lowStock: { count, items } };
}

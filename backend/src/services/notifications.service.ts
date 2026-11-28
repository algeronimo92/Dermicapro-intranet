import prisma from '../config/database';
import { ROLES, RoleName } from '../constants/roles';
import { AppError } from '../middlewares/errorHandler';
import { getModuleAccess } from './moduleAccess.service';

/**
 * Notificaciones del sistema (campana del menú).
 *
 * Qué roles reciben cada tipo lo decide el admin en Empleados -> Privilegios,
 * y se guarda en system_settings. Además, un tipo sólo llega a quien puede ver
 * los datos que muestra (stock bajo: quien ve Inventario).
 */

export const NOTIFICATION_TYPES = {
  lowStock: {
    label: 'Productos en alerta de stock',
    hint: 'Productos activos con stock igual o menor a su mínimo. Requiere ver Inventario.',
    settingKey: 'notifications.low_stock.roles',
    defaultRoles: [ROLES.ADMIN, ROLES.INVENTORY] as RoleName[],
  },
} as const;

export type NotificationType = keyof typeof NOTIFICATION_TYPES;
const TYPES = Object.keys(NOTIFICATION_TYPES) as NotificationType[];
const ALL_ROLES = Object.values(ROLES) as RoleName[];
export const MAX_LOW_STOCK_ITEMS = 20;

export type NotificationSettings = Record<NotificationType, RoleName[]>;

function parseRoles(raw: string | undefined, fallback: RoleName[]): RoleName[] {
  if (raw === undefined) return fallback;
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((r): r is RoleName => ALL_ROLES.includes(r)) : fallback;
  } catch {
    return fallback;
  }
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: TYPES.map(t => NOTIFICATION_TYPES[t].settingKey) } },
  });
  const byKey = new Map(rows.map(r => [r.key, r.value]));
  return Object.fromEntries(TYPES.map(t => [
    t,
    parseRoles(byKey.get(NOTIFICATION_TYPES[t].settingKey), NOTIFICATION_TYPES[t].defaultRoles),
  ])) as NotificationSettings;
}

export async function setNotificationSettings(input: unknown, userId: string): Promise<NotificationSettings> {
  if (!input || typeof input !== 'object') throw new AppError('Configuración de notificaciones inválida', 400);
  const body = input as Record<string, unknown>;
  for (const type of TYPES) {
    if (body[type] === undefined) continue;
    const roles = body[type];
    if (!Array.isArray(roles) || roles.some(r => !ALL_ROLES.includes(r as RoleName))) {
      throw new AppError('Hay un rol no válido en la configuración de notificaciones', 400);
    }
    await prisma.systemSetting.upsert({
      where: { key: NOTIFICATION_TYPES[type].settingKey },
      create: {
        key: NOTIFICATION_TYPES[type].settingKey,
        value: JSON.stringify([...new Set(roles)]),
        description: `Roles que reciben la notificación: ${NOTIFICATION_TYPES[type].label}`,
        updatedById: userId,
      },
      update: { value: JSON.stringify([...new Set(roles)]), updatedById: userId },
    });
  }
  return getNotificationSettings();
}

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
  const settings = await getNotificationSettings();
  const receivesLowStock = settings.lowStock.includes(roleName as RoleName);
  if (!receivesLowStock) return { lowStock: null };

  const access = await getModuleAccess(userId, roleName);
  if (!access.inventory.view) return { lowStock: null };

  const where = { isActive: true, stock: { lte: prisma.product.fields.minStock } };
  const [count, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      select: { id: true, name: true, brand: true, presentation: true, stock: true, minStock: true, targetStock: true },
      // Primero los agotados y los que más bajo están respecto de su mínimo.
      orderBy: [{ stock: 'asc' }, { name: 'asc' }],
      take: MAX_LOW_STOCK_ITEMS,
    }),
  ]);
  return { lowStock: { count, items } };
}

import api from './api';

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
  /** null: la persona no recibe este tipo (lo decide Empleados -> Privilegios). */
  lowStock: { count: number; items: LowStockItem[] } | null;
}

export type NotificationType = 'lowStock';

export interface NotificationSettingsPayload {
  types: { key: NotificationType; label: string; hint: string }[];
  roles: { role: string; displayName: string; canViewInventory: boolean }[];
  settings: Record<NotificationType, string[]>;
}

/** Evento para que la campana se actualice al cambiar el stock o las alertas. */
export const INVENTORY_CHANGED_EVENT = 'dermicapro:inventory-changed';
export const notifyInventoryChanged = () => window.dispatchEvent(new Event(INVENTORY_CHANGED_EVENT));

export const notificationsService = {
  async getMine(): Promise<UserNotifications> {
    const response = await api.get<UserNotifications>('/auth/me/notifications');
    return response.data;
  },

  async getSettings(): Promise<NotificationSettingsPayload> {
    const response = await api.get<{ data: NotificationSettingsPayload }>('/db-privileges/notifications');
    return response.data.data;
  },

  async saveSettings(settings: Record<NotificationType, string[]>): Promise<NotificationSettingsPayload> {
    const response = await api.put<{ data: NotificationSettingsPayload }>('/db-privileges/notifications', { settings });
    return response.data.data;
  },
};

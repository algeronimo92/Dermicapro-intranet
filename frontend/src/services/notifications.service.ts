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
  /** null: la persona no recibe este tipo (sólo admin e inventario lo reciben). */
  lowStock: { count: number; items: LowStockItem[] } | null;
}

/** Evento para que la campana se actualice al cambiar el stock o las alertas. */
export const INVENTORY_CHANGED_EVENT = 'dermicapro:inventory-changed';
export const notifyInventoryChanged = () => window.dispatchEvent(new Event(INVENTORY_CHANGED_EVENT));

export const notificationsService = {
  async getMine(): Promise<UserNotifications> {
    const response = await api.get<UserNotifications>('/auth/me/notifications');
    return response.data;
  },
};

import api from './api';

export interface SystemSettings {
  session_timeout_minutes: string;
}

export const settingsService = {
  async getAll(): Promise<SystemSettings> {
    const res = await api.get<{ data: SystemSettings }>('/settings');
    return res.data.data;
  },

  async update(key: keyof SystemSettings, value: string): Promise<SystemSettings> {
    const res = await api.patch<{ data: SystemSettings }>('/settings', { key, value });
    return res.data.data;
  },
};

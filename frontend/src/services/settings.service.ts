import api from './api';

export interface SystemSettings {
  session_timeout_minutes: string;
}

/** Integración con el CRM: el estado del token (nunca el token) y el usuario de respaldo. */
export interface CrmIntegrationStatus {
  configured: boolean;
  /** Últimos caracteres del token activo, para reconocerlo. */
  tokenHint: string | null;
  tokenCreatedAt: string | null;
  tokenCreatedBy: string | null;
  fallbackUserId: string | null;
}

/** Respuesta de generar el token: la única vez que viaja en claro. */
export interface CrmIntegrationWithToken extends CrmIntegrationStatus {
  token: string;
}

export const crmIntegrationService = {
  async get(): Promise<CrmIntegrationStatus> {
    const res = await api.get<{ data: CrmIntegrationStatus }>('/settings/crm-integration');
    return res.data.data;
  },

  async generateToken(): Promise<CrmIntegrationWithToken> {
    const res = await api.post<{ data: CrmIntegrationWithToken }>('/settings/crm-integration/token');
    return res.data.data;
  },

  async revokeToken(): Promise<CrmIntegrationStatus> {
    const res = await api.delete<{ data: CrmIntegrationStatus }>('/settings/crm-integration/token');
    return res.data.data;
  },

  async setFallbackUser(fallbackUserId: string | null): Promise<CrmIntegrationStatus> {
    const res = await api.put<{ data: CrmIntegrationStatus }>('/settings/crm-integration', { fallbackUserId });
    return res.data.data;
  },
};

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

import api from './api';

export type MailProvider = 'google' | 'microsoft' | 'zoho';
export type SmtpSecurity = 'starttls' | 'ssl' | 'none';

export interface MailSettingsStatus {
  mode: 'oauth' | 'smtp' | null;
  oauthProvider: MailProvider | null;
  oauthAccountEmail: string | null;
  host: string;
  port: number;
  security: SmtpSecurity;
  username: string;
  passwordConfigured: boolean;
  fromAddress: string;
  fromName: string;
  oauthAvailable: MailProvider[];
  envAvailable: boolean;
  allowInsecure: boolean;
}

export interface SmtpSettingsInput {
  host: string;
  port: number;
  security: SmtpSecurity;
  username: string;
  /** null conserva la contraseña guardada. */
  password: string | null;
  fromAddress: string;
  fromName: string;
}

export const PROVIDER_LABELS: Record<MailProvider, string> = { google: 'Google', microsoft: 'Microsoft', zoho: 'Zoho' };

export const mailSettingsService = {
  async get(): Promise<MailSettingsStatus> {
    return (await api.get<MailSettingsStatus>('/settings/email')).data;
  },
  async saveSmtp(input: SmtpSettingsInput): Promise<MailSettingsStatus> {
    return (await api.put<MailSettingsStatus>('/settings/email', input)).data;
  },
  /** Vuelve al correo del servidor (.env). */
  async clear(): Promise<MailSettingsStatus> {
    return (await api.delete<MailSettingsStatus>('/settings/email')).data;
  },
  /** URL del proveedor a la que hay que ir para autorizar la cuenta. */
  async connect(provider: MailProvider): Promise<string> {
    return (await api.post<{ url: string }>('/settings/email/connect', { provider })).data.url;
  },
  async disconnect(): Promise<MailSettingsStatus> {
    return (await api.post<MailSettingsStatus>('/settings/email/disconnect')).data;
  },
  async sendTest(): Promise<{ recipient: string; source: 'oauth' | 'smtp' | 'env' }> {
    return (await api.post<{ recipient: string; source: 'oauth' | 'smtp' | 'env' }>('/settings/email/test')).data;
  },
};

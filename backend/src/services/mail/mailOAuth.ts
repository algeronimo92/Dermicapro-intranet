import { config } from '../../config/env';

/**
 * Conectar el correo con un clic (OAuth) y enviar por la API del proveedor.
 * No hay contraseña que custodiar: se guarda sólo el refresh token (cifrado).
 *
 * - Google: Gmail API con `gmail.send`.
 * - Microsoft: Graph `/me/sendMail` con `Mail.Send` (Outlook.com y Microsoft
 *   365). Microsoft rota el refresh token en cada renovación.
 * - Zoho: Zoho Mail API. Cada cuenta vive en un centro de datos; el callback
 *   dice cuál (`accounts-server`).
 */

export const PROVIDERS = ['google', 'microsoft', 'zoho'] as const;
export type MailProvider = typeof PROVIDERS[number];
export const PROVIDER_LABELS: Record<MailProvider, string> = { google: 'Google', microsoft: 'Microsoft', zoho: 'Zoho' };

export const isProvider = (value: unknown): value is MailProvider =>
  typeof value === 'string' && (PROVIDERS as readonly string[]).includes(value);

const TIMEOUT_MS = 15_000;

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const GOOGLE_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
const GOOGLE_SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/gmail.send'];

const MICROSOFT_AUTHORITY = 'https://login.microsoftonline.com/common/oauth2/v2.0';
const MICROSOFT_SEND_URL = 'https://graph.microsoft.com/v1.0/me/sendMail';
const MICROSOFT_SCOPES = ['openid', 'email', 'offline_access', 'https://graph.microsoft.com/Mail.Send'];

const ZOHO_DEFAULT_ACCOUNTS = 'https://accounts.zoho.com';
const ZOHO_SCOPES = ['ZohoMail.messages.CREATE', 'ZohoMail.accounts.READ'];
/**
 * Centros de datos de Zoho: servidor de cuentas -> servidor de Zoho Mail.
 * Sólo se aceptan estos, porque al servidor de cuentas se le manda el client
 * secret.
 */
export const ZOHO_DATA_CENTERS: Record<string, string> = {
  'https://accounts.zoho.com': 'https://mail.zoho.com',
  'https://accounts.zoho.eu': 'https://mail.zoho.eu',
  'https://accounts.zoho.in': 'https://mail.zoho.in',
  'https://accounts.zoho.com.au': 'https://mail.zoho.com.au',
  'https://accounts.zoho.jp': 'https://mail.zoho.jp',
  'https://accounts.zohocloud.ca': 'https://mail.zohocloud.ca',
  'https://accounts.zoho.sa': 'https://mail.zoho.sa',
  'https://accounts.zoho.com.cn': 'https://mail.zoho.com.cn',
};

/** `code` es corto y viaja en la URL de vuelta; el mensaje se puede mostrar al admin y nunca trae tokens. */
export class MailOAuthError extends Error {
  constructor(message: string, public readonly code = 'provider_error') {
    super(message);
  }
}

export interface OAuthClient {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/** Lo que queda guardado tras autorizar la cuenta. */
export interface Connection {
  provider: MailProvider;
  refreshToken: string;
  accountEmail: string;
  /** Sólo Zoho: centro de datos de la cuenta e id del buzón. */
  accountsServer?: string;
  accountId?: string;
}

export const redirectUri = (): string =>
  config.mailOAuth.redirectUri || `${config.appUrl}/api/integrations/email/callback`;

export const oauthClient = (provider: MailProvider): OAuthClient | null => {
  const { clientId, clientSecret } = config.mailOAuth[provider];
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, redirectUri: redirectUri() };
};

export const availableProviders = (): MailProvider[] => PROVIDERS.filter((p) => oauthClient(p) !== null);

export const authorizationUrl = (
  provider: MailProvider,
  client: OAuthClient,
  { state, codeChallenge }: { state: string; codeChallenge: string },
): string => {
  if (provider === 'google') {
    // offline + consent: Google sólo entrega refresh token en el primer
    // consentimiento; forzarlo cubre al que reconecta.
    return `${GOOGLE_AUTH_URL}?${new URLSearchParams({
      client_id: client.clientId,
      redirect_uri: client.redirectUri,
      response_type: 'code',
      scope: GOOGLE_SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    })}`;
  }
  if (provider === 'microsoft') {
    return `${MICROSOFT_AUTHORITY}/authorize?${new URLSearchParams({
      client_id: client.clientId,
      redirect_uri: client.redirectUri,
      response_type: 'code',
      response_mode: 'query',
      scope: MICROSOFT_SCOPES.join(' '),
      prompt: 'select_account',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    })}`;
  }
  // Zoho redirige al centro de datos de la cuenta (la app necesita
  // "Multi-DC" activado en la consola de Zoho).
  return `${ZOHO_DEFAULT_ACCOUNTS}/oauth/v2/auth?${new URLSearchParams({
    client_id: client.clientId,
    redirect_uri: client.redirectUri,
    response_type: 'code',
    scope: ZOHO_SCOPES.join(','),
    access_type: 'offline',
    prompt: 'consent',
    state,
  })}`;
};

/**
 * Correo de la cuenta según el id_token. No se verifica la firma: llega
 * directo del endpoint de tokens del proveedor por TLS, como permite OpenID
 * Connect para ese canal.
 */
export const idTokenEmail = (idToken: unknown): string => {
  if (typeof idToken !== 'string') return '';
  try {
    const claims = JSON.parse(Buffer.from(idToken.split('.')[1] ?? '', 'base64url').toString('utf8'));
    return String(claims.email || claims.preferred_username || '').trim().toLowerCase();
  } catch {
    return '';
  }
};

export const zohoAccountsServer = (raw: string | undefined | null): string => {
  const server = (raw || ZOHO_DEFAULT_ACCOUNTS).trim().replace(/\/+$/, '').toLowerCase();
  if (!ZOHO_DATA_CENTERS[server]) throw new MailOAuthError('Zoho devolvió un centro de datos desconocido');
  return server;
};

const tokenUrl = (provider: MailProvider, accountsServer = ''): string => {
  if (provider === 'google') return GOOGLE_TOKEN_URL;
  if (provider === 'microsoft') return `${MICROSOFT_AUTHORITY}/token`;
  return `${accountsServer || ZOHO_DEFAULT_ACCOUNTS}/oauth/v2/token`;
};

const request = async (url: string, init: RequestInit): Promise<Response> => {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new MailOAuthError('No se pudo contactar al proveedor de correo');
  }
};

const postToken = async (url: string, data: Record<string, string>): Promise<Record<string, unknown>> => {
  const response = await request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(data),
  });
  let payload: Record<string, unknown> = {};
  try {
    const parsed = await response.json();
    if (parsed && typeof parsed === 'object') payload = parsed as Record<string, unknown>;
  } catch {
    // respuesta sin JSON
  }
  // Zoho responde 200 con {"error": ...}.
  if (!response.ok || payload.error) {
    if (payload.error === 'invalid_grant' || payload.error === 'invalid_code') {
      throw new MailOAuthError('El proveedor ya no acepta esta autorización', 'reconnect');
    }
    console.warn(JSON.stringify({ event: 'mail_oauth_token_rejected', error: String(payload.error ?? response.status) }));
    throw new MailOAuthError('El proveedor rechazó la autorización', 'exchange_failed');
  }
  return payload;
};

const zohoMailbox = async (accountsServer: string, accessToken: string): Promise<{ accountId: string; email: string }> => {
  const response = await request(`${ZOHO_DATA_CENTERS[accountsServer]}/api/accounts`, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });
  if (!response.ok) throw new MailOAuthError('Zoho no permitió leer el buzón de la cuenta', 'no_mailbox');
  const body = (await response.json().catch(() => ({}))) as { data?: Array<Record<string, unknown>> };
  const account = body.data?.[0];
  if (!account) throw new MailOAuthError('La cuenta de Zoho no tiene un buzón de Zoho Mail', 'no_mailbox');
  const email = String(account.primaryEmailAddress || account.mailboxAddress || '').trim().toLowerCase();
  return { accountId: String(account.accountId ?? ''), email };
};

/** Canjea el código del callback y averigua desde qué cuenta se enviará. */
export const completeAuthorization = async (
  provider: MailProvider,
  client: OAuthClient,
  { code, codeVerifier, accountsServer }: { code: string; codeVerifier: string; accountsServer?: string | null },
): Promise<Connection> => {
  const server = provider === 'zoho' ? zohoAccountsServer(accountsServer) : '';
  const data: Record<string, string> = {
    client_id: client.clientId,
    client_secret: client.clientSecret,
    redirect_uri: client.redirectUri,
    code,
    grant_type: 'authorization_code',
  };
  if (provider !== 'zoho') data.code_verifier = codeVerifier;

  const payload = await postToken(tokenUrl(provider, server), data);
  const refreshToken = payload.refresh_token;
  if (typeof refreshToken !== 'string' || !refreshToken) {
    throw new MailOAuthError('El proveedor no entregó un acceso permanente', 'no_refresh_token');
  }
  if (provider !== 'zoho') {
    const email = idTokenEmail(payload.id_token);
    if (!email) throw new MailOAuthError('No se pudo leer el correo de la cuenta');
    return { provider, refreshToken, accountEmail: email };
  }
  const mailbox = await zohoMailbox(server, String(payload.access_token ?? ''));
  return { provider, refreshToken, accountEmail: mailbox.email, accountsServer: server, accountId: mailbox.accountId };
};

const reconnectMessage = (provider: MailProvider): string =>
  `La conexión con ${PROVIDER_LABELS[provider]} venció o fue revocada; vuelve a conectar el correo en Configuración → Correo de envío`;

/** Access token vigente y, si el proveedor lo rotó, el refresh token nuevo. */
const accessToken = async (connection: Connection, client: OAuthClient): Promise<{ token: string; rotated: string | null }> => {
  const data: Record<string, string> = {
    client_id: client.clientId,
    client_secret: client.clientSecret,
    refresh_token: connection.refreshToken,
    grant_type: 'refresh_token',
  };
  if (connection.provider === 'microsoft') data.scope = MICROSOFT_SCOPES.join(' ');
  let payload: Record<string, unknown>;
  try {
    payload = await postToken(tokenUrl(connection.provider, connection.accountsServer), data);
  } catch (error) {
    if (error instanceof MailOAuthError && error.code === 'reconnect') {
      throw new MailOAuthError(reconnectMessage(connection.provider), 'reconnect');
    }
    throw error;
  }
  const token = payload.access_token;
  if (typeof token !== 'string' || !token) throw new MailOAuthError('El proveedor no entregó un permiso de envío');
  const rotated = typeof payload.refresh_token === 'string' && payload.refresh_token !== connection.refreshToken
    ? payload.refresh_token
    : null;
  return { token, rotated };
};

const googleApiDisabled = async (response: Response): Promise<boolean> => {
  if (response.status !== 403) return false;
  const body = (await response.clone().json().catch(() => ({}))) as { error?: { details?: unknown[]; errors?: unknown[] } };
  const entries = [...(body.error?.details ?? []), ...(body.error?.errors ?? [])] as Array<{ reason?: string }>;
  return entries.some((e) => e && (e.reason === 'SERVICE_DISABLED' || e.reason === 'accessNotConfigured'));
};

export interface OAuthMessage {
  /** MIME completo (RFC 822) para Google y Microsoft. */
  mime: Buffer;
  to: string[];
  subject: string;
  html: string;
}

/** Envía por la API del proveedor. Devuelve el refresh token rotado, si hubo. */
export const sendWithOAuth = async (connection: Connection, message: OAuthMessage): Promise<string | null> => {
  const client = oauthClient(connection.provider);
  if (!client) {
    throw new MailOAuthError(`La conexión con ${PROVIDER_LABELS[connection.provider]} no está habilitada en el servidor`, 'unavailable');
  }
  const { token, rotated } = await accessToken(connection, client);

  let response: Response;
  if (connection.provider === 'google') {
    response = await request(GOOGLE_SEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: message.mime.toString('base64url') }),
    });
  } else if (connection.provider === 'microsoft') {
    // Graph acepta el MIME completo en base64 con text/plain.
    response = await request(MICROSOFT_SEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'text/plain' },
      body: message.mime.toString('base64'),
    });
  } else {
    response = await request(
      `${ZOHO_DATA_CENTERS[connection.accountsServer || ZOHO_DEFAULT_ACCOUNTS]}/api/accounts/${encodeURIComponent(connection.accountId ?? '')}/messages`,
      {
        method: 'POST',
        headers: { Authorization: `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAddress: connection.accountEmail,
          toAddress: message.to.join(','),
          subject: message.subject,
          content: message.html,
          mailFormat: 'html',
        }),
      },
    );
  }

  if (!response.ok) {
    console.warn(JSON.stringify({ event: 'mail_oauth_send_rejected', provider: connection.provider, status: response.status }));
    if (connection.provider === 'google' && (await googleApiDisabled(response))) {
      throw new MailOAuthError(
        'La Gmail API no está activada en el proyecto de Google Cloud del ERP. Actívala o usa otro correo mientras tanto.',
        'service_disabled',
      );
    }
    if (response.status === 401 || response.status === 403) {
      throw new MailOAuthError(
        `${PROVIDER_LABELS[connection.provider]} no permitió enviar desde esta cuenta. Vuelve a conectarla y acepta el permiso de envío.`,
        'forbidden',
      );
    }
    throw new MailOAuthError(`${PROVIDER_LABELS[connection.provider]} rechazó el envío`);
  }
  return rotated;
};

/**
 * Retira la autorización en el proveedor; es de mejor esfuerzo. Microsoft no
 * tiene un endpoint para revocar un refresh token suelto: se olvida aquí y
 * el dueño de la cuenta puede quitar el acceso desde su cuenta.
 */
export const revoke = async (connection: Connection): Promise<void> => {
  try {
    if (connection.provider === 'google') {
      await request(GOOGLE_REVOKE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: connection.refreshToken }),
      });
    } else if (connection.provider === 'zoho') {
      await request(
        `${connection.accountsServer || ZOHO_DEFAULT_ACCOUNTS}/oauth/v2/token/revoke?${new URLSearchParams({ token: connection.refreshToken })}`,
        { method: 'POST' },
      );
    }
  } catch {
    console.warn(JSON.stringify({ event: 'mail_oauth_revoke_failed', provider: connection.provider }));
  }
};

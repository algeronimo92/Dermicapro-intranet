import crypto from 'crypto';
import prisma from '../../config/database';
import { config } from '../../config/env';
import { AppError } from '../../middlewares/errorHandler';
import { decryptSecret, encryptSecret } from '../../utils/secretCipher';
import { SmtpHostRejected, allowedPorts, internalHostsAllowed, validateSmtpHost } from './smtpGuard';
import { Connection, MailProvider, availableProviders, isProvider } from './mailOAuth';

/**
 * Correo de envío configurado desde Configuración: un SMTP propio o una
 * cuenta conectada con OAuth. Son excluyentes: guardar una borra la otra,
 * para que nunca haya dudas de desde dónde sale el correo. Sin ninguna se usa
 * el SMTP del .env.
 */

export type SmtpSecurity = 'starttls' | 'ssl' | 'none';
const SECURE_OPTIONS: SmtpSecurity[] = ['starttls', 'ssl'];
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const PASSWORD_FIELD = 'mail_settings.smtp_password';
const REFRESH_FIELD = 'mail_settings.oauth_refresh_token';

export interface SmtpConfig {
  host: string;
  port: number;
  security: SmtpSecurity;
  username: string;
  password: string;
  fromAddress: string;
  fromName: string;
}

export interface MailSettingsStatus {
  mode: 'oauth' | 'smtp' | null;
  oauthProvider: MailProvider | null;
  oauthAccountEmail: string | null;
  host: string;
  port: number;
  security: SmtpSecurity;
  username: string;
  /** La contraseña nunca vuelve al navegador: sólo se puede reemplazar. */
  passwordConfigured: boolean;
  fromAddress: string;
  fromName: string;
  /** Proveedores con "Conectar con..." habilitado en el servidor. */
  oauthAvailable: MailProvider[];
  /** Hay un SMTP en el .env que se usa si no se configura nada aquí. */
  envAvailable: boolean;
  /** Sólo desarrollo: se puede usar Mailpit y SMTP sin cifrado. */
  allowInsecure: boolean;
}

const SMTP_CLEARED = {
  smtpHost: null, smtpPort: null, smtpSecurity: null, smtpUsername: null,
  smtpPasswordEnc: null, fromAddress: null, fromName: null,
};
const OAUTH_CLEARED = {
  oauthProvider: null, oauthRefreshEnc: null, oauthAccountEmail: null,
  oauthAccountsServer: null, oauthAccountId: null,
};

const getRow = () => prisma.mailSettings.findUnique({ where: { id: 1 } });

const upsert = (data: Parameters<typeof prisma.mailSettings.update>[0]['data'], userId: string | null) =>
  prisma.mailSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...(data as object), updatedById: userId },
    update: { ...(data as object), updatedById: userId },
  });

const smtpConfigured = (row: Awaited<ReturnType<typeof getRow>>): boolean => !!(row?.smtpHost && row.fromAddress);
const oauthConnected = (row: Awaited<ReturnType<typeof getRow>>): boolean => !!(row && isProvider(row.oauthProvider) && row.oauthRefreshEnc);

export const readMailSettings = async (): Promise<MailSettingsStatus> => {
  const row = await getRow();
  const oauth = oauthConnected(row);
  const smtp = smtpConfigured(row);
  const security = (row?.smtpSecurity ?? 'ssl') as SmtpSecurity;
  return {
    mode: oauth ? 'oauth' : smtp ? 'smtp' : null,
    oauthProvider: oauth ? (row!.oauthProvider as MailProvider) : null,
    oauthAccountEmail: oauth ? row!.oauthAccountEmail ?? '' : null,
    host: row?.smtpHost ?? '',
    port: row?.smtpPort ?? 465,
    security,
    username: row?.smtpUsername ?? '',
    passwordConfigured: !!row?.smtpPasswordEnc,
    fromAddress: row?.fromAddress ?? '',
    fromName: row?.fromName ?? '',
    oauthAvailable: availableProviders(),
    envAvailable: !!config.mail.host,
    allowInsecure: internalHostsAllowed(),
  };
};

const singleLine = (value: unknown, field: string, maxLength: number): string => {
  const cleaned = typeof value === 'string' ? value.trim() : '';
  if (/[\r\n]/.test(cleaned) || cleaned.length > maxLength) throw new AppError(`${field} no es válido`, 400);
  return cleaned;
};

export interface SmtpInput {
  host: unknown;
  port: unknown;
  security: unknown;
  username: unknown;
  /** null o vacío conserva la contraseña guardada. */
  password: unknown;
  fromAddress: unknown;
  fromName: unknown;
}

export const saveSmtpSettings = async (input: SmtpInput, userId: string): Promise<MailSettingsStatus> => {
  let host: string;
  try {
    host = validateSmtpHost(typeof input.host === 'string' ? input.host : '');
  } catch (error) {
    if (error instanceof SmtpHostRejected) throw new AppError(error.message, 400);
    throw error;
  }
  const port = Number(input.port);
  if (!allowedPorts().includes(port)) {
    throw new AppError(`Puerto no permitido. Usa ${allowedPorts().join(', ')}`, 400);
  }
  const security = input.security as SmtpSecurity;
  const securityOptions: SmtpSecurity[] = internalHostsAllowed() ? [...SECURE_OPTIONS, 'none'] : SECURE_OPTIONS;
  if (!securityOptions.includes(security)) throw new AppError('Seguridad inválida: elige SSL/TLS o STARTTLS', 400);

  const fromAddress = singleLine(input.fromAddress, 'El correo remitente', 254).toLowerCase();
  if (!EMAIL_RE.test(fromAddress)) throw new AppError('El correo remitente no es válido', 400);
  const fromName = singleLine(input.fromName, 'El nombre del remitente', 100);
  const username = singleLine(input.username, 'El usuario', 254) || fromAddress;
  const password = typeof input.password === 'string' && input.password !== '' ? input.password : null;
  if (password !== null && password.length > 512) throw new AppError('La contraseña es demasiado larga', 400);

  const current = await getRow();
  const moved = host !== (current?.smtpHost ?? '') || username !== (current?.smtpUsername ?? '');
  if (password === null && current?.smtpPasswordEnc && moved) {
    // Sin esto, alguien podría apuntar el servidor a uno propio y recibir la
    // contraseña guardada en el primer envío.
    throw new AppError('Vuelve a escribir la contraseña al cambiar el servidor o el usuario', 400);
  }
  // Sin contraseña sólo en desarrollo (Mailpit no pide usuario).
  if (password === null && !current?.smtpPasswordEnc && !internalHostsAllowed()) {
    throw new AppError('Escribe la contraseña del correo', 400);
  }

  await upsert(
    {
      ...OAUTH_CLEARED,
      smtpHost: host,
      smtpPort: port,
      smtpSecurity: security,
      smtpUsername: username,
      ...(password !== null ? { smtpPasswordEnc: encryptSecret(PASSWORD_FIELD, password) } : {}),
      fromAddress,
      fromName: fromName || null,
    },
    userId,
  );
  return readMailSettings();
};

/** Vuelve al correo del .env. */
export const clearMailSettings = async (userId: string): Promise<MailSettingsStatus> => {
  await upsert({ ...SMTP_CLEARED, ...OAUTH_CLEARED, oauthNonce: null, oauthPendingProvider: null }, userId);
  return readMailSettings();
};

export const clearOAuthConnection = async (userId: string): Promise<MailSettingsStatus> => {
  await upsert({ ...OAUTH_CLEARED }, userId);
  return readMailSettings();
};

/** Un flujo nuevo invalida el anterior que haya quedado a medias. */
export const startOAuth = async (provider: MailProvider, nonce: string, userId: string): Promise<void> => {
  await upsert({ oauthNonce: nonce, oauthPendingProvider: provider }, userId);
};

/** Proveedor del flujo en curso si el nonce coincide; sirve una sola vez. */
export const consumeOAuthNonce = async (nonce: string): Promise<MailProvider | null> => {
  const row = await getRow();
  const stored = row?.oauthNonce;
  if (!stored || stored.length !== nonce.length || !crypto.timingSafeEqual(Buffer.from(stored), Buffer.from(nonce))) {
    return null;
  }
  const claimed = await prisma.mailSettings.updateMany({
    where: { id: 1, oauthNonce: nonce },
    data: { oauthNonce: null, oauthPendingProvider: null },
  });
  if (claimed.count !== 1) return null;
  return isProvider(row!.oauthPendingProvider) ? row!.oauthPendingProvider : null;
};

export const storeOAuthConnection = async (connection: Connection, userId: string): Promise<void> => {
  await upsert(
    {
      ...SMTP_CLEARED,
      oauthProvider: connection.provider,
      oauthRefreshEnc: encryptSecret(REFRESH_FIELD, connection.refreshToken),
      oauthAccountEmail: connection.accountEmail,
      oauthAccountsServer: connection.accountsServer || null,
      oauthAccountId: connection.accountId || null,
    },
    userId,
  );
};

/** Microsoft entrega uno nuevo en cada renovación: el viejo deja de servir tarde o temprano. */
export const storeRotatedRefreshToken = async (refreshToken: string): Promise<void> => {
  await prisma.mailSettings.update({
    where: { id: 1 },
    data: { oauthRefreshEnc: encryptSecret(REFRESH_FIELD, refreshToken) },
  });
};

export type ConfiguredTransport =
  | { kind: 'oauth'; connection: Connection }
  | { kind: 'smtp'; smtp: SmtpConfig };

/** Lo que se configuró en la pantalla, ya descifrado, o null si no hay nada. */
export const getConfiguredTransport = async (): Promise<ConfiguredTransport | null> => {
  const row = await getRow();
  if (oauthConnected(row)) {
    return {
      kind: 'oauth',
      connection: {
        provider: row!.oauthProvider as MailProvider,
        refreshToken: decryptSecret(REFRESH_FIELD, row!.oauthRefreshEnc!),
        accountEmail: row!.oauthAccountEmail ?? '',
        accountsServer: row!.oauthAccountsServer ?? undefined,
        accountId: row!.oauthAccountId ?? undefined,
      },
    };
  }
  if (smtpConfigured(row)) {
    return {
      kind: 'smtp',
      smtp: {
        host: row!.smtpHost!,
        port: row!.smtpPort ?? 465,
        security: (row!.smtpSecurity ?? 'ssl') as SmtpSecurity,
        username: row!.smtpUsername ?? '',
        password: row!.smtpPasswordEnc ? decryptSecret(PASSWORD_FIELD, row!.smtpPasswordEnc) : '',
        fromAddress: row!.fromAddress!,
        fromName: row!.fromName ?? '',
      },
    };
  }
  return null;
};

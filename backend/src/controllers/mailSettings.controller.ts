import { Request, Response } from 'express';
import { config } from '../config/env';
import { AppError, logUnexpectedError } from '../middlewares/errorHandler';
import {
  MailSettingsStatus,
  clearMailSettings,
  clearOAuthConnection,
  consumeOAuthNonce,
  getConfiguredTransport,
  readMailSettings,
  saveSmtpSettings,
  startOAuth,
  storeOAuthConnection,
} from '../services/mail/mailSettings.service';
import {
  MailOAuthError,
  PROVIDER_LABELS,
  authorizationUrl,
  completeAuthorization,
  isProvider,
  oauthClient,
  revoke,
} from '../services/mail/mailOAuth';
import { InvalidOAuthState, codeChallenge, codeVerifier, decodeState, issueState, newNonce } from '../services/mail/oauthState';
import { MailDeliveryError, MailNotConfiguredError, sendTestEmail } from '../services/mail/mailer';

const handle = (fallback: string) =>
  (fn: (req: Request, res: Response) => Promise<void>) =>
    async (req: Request, res: Response): Promise<void> => {
      try {
        await fn(req, res);
      } catch (error) {
        logUnexpectedError(req, error);
        if (error instanceof AppError) {
          res.status(error.statusCode).json({ error: error.message });
        } else {
          res.status(500).json({ error: fallback });
        }
      }
    };

/** Pasar a otra forma de envío desconecta la cuenta: se revoca antes de olvidarla. */
const revokeCurrent = async (): Promise<void> => {
  try {
    const current = await getConfiguredTransport();
    if (current?.kind === 'oauth') await revoke(current.connection);
  } catch {
    // Si el secreto no se puede descifrar, igual se olvida la conexión.
  }
};

const logChange = (req: Request, event: string, extra: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ event, request_id: req.id, user_id: req.user?.id, ...extra }));

export const getMailSettings = handle('Error al leer el correo de envío')(async (_req, res) => {
  res.json(await readMailSettings());
});

export const putMailSettings = handle('Error al guardar el correo de envío')(async (req, res) => {
  await revokeCurrent();
  const status: MailSettingsStatus = await saveSmtpSettings(req.body ?? {}, req.user!.id);
  logChange(req, 'mail_settings_smtp_saved', { host: status.host, port: status.port });
  res.json(status);
});

export const deleteMailSettings = handle('Error al quitar el correo de envío')(async (req, res) => {
  await revokeCurrent();
  const status = await clearMailSettings(req.user!.id);
  logChange(req, 'mail_settings_cleared');
  res.json(status);
});

export const connectMailAccount = handle('Error al conectar el correo')(async (req, res) => {
  const provider = req.body?.provider;
  if (!isProvider(provider)) throw new AppError('Proveedor de correo desconocido', 400);
  const client = oauthClient(provider);
  if (!client) {
    throw new AppError(`La conexión con ${PROVIDER_LABELS[provider]} no está habilitada en el servidor`, 409);
  }
  const nonce = newNonce();
  await startOAuth(provider, nonce, req.user!.id);
  const state = issueState(req.user!.id, nonce);
  res.json({ url: authorizationUrl(provider, client, { state, codeChallenge: codeChallenge(nonce) }) });
});

export const disconnectMailAccount = handle('Error al desconectar el correo')(async (req, res) => {
  await revokeCurrent();
  const status = await clearOAuthConnection(req.user!.id);
  logChange(req, 'mail_settings_oauth_disconnected');
  res.json(status);
});

export const sendMailTest = handle('Error al enviar el correo de prueba')(async (req, res) => {
  try {
    const source = await sendTestEmail(req.user!.email);
    res.json({ recipient: req.user!.email, source });
  } catch (error) {
    if (error instanceof MailNotConfiguredError) {
      throw new AppError('No hay correo de envío configurado', 409);
    }
    if (error instanceof MailDeliveryError) throw new AppError(error.message, 502);
    throw error;
  }
});

/**
 * El proveedor vuelve aquí, sin sesión. Quién inició el flujo sale del
 * `state` firmado y del nonce de un solo uso guardado al iniciar. Siempre se
 * vuelve a Configuración con el resultado en la URL; el detalle del proveedor
 * queda en el log.
 */
export const mailOAuthCallback = async (req: Request, res: Response): Promise<void> => {
  const back = (params: Record<string, string>) =>
    res.redirect(302, `${config.appUrl}/settings?${new URLSearchParams(params)}#correo`);

  const { state, code, error } = req.query;
  let claims;
  try {
    claims = decodeState(typeof state === 'string' ? state : '');
  } catch (err) {
    if (err instanceof InvalidOAuthState) return back({ email: 'error', reason: 'expired' });
    throw err;
  }

  try {
    const provider = await consumeOAuthNonce(claims.nonce);
    if (!provider) return back({ email: 'error', reason: 'expired' });
    if (typeof error === 'string' && error) {
      const denied = error === 'access_denied' || error === 'consent_required';
      return back({ email: 'error', provider, reason: denied ? 'denied' : 'provider_error' });
    }
    if (typeof code !== 'string' || !code) return back({ email: 'error', provider, reason: 'provider_error' });

    const client = oauthClient(provider);
    if (!client) return back({ email: 'error', provider, reason: 'unavailable' });

    const accountsServer = req.query['accounts-server'];
    const connection = await completeAuthorization(provider, client, {
      code,
      codeVerifier: codeVerifier(claims.nonce),
      accountsServer: typeof accountsServer === 'string' ? accountsServer : null,
    });
    await storeOAuthConnection(connection, claims.userId);
    console.log(JSON.stringify({ event: 'mail_settings_oauth_connected', provider, user_id: claims.userId }));
    return back({ email: 'connected', provider });
  } catch (err) {
    if (err instanceof MailOAuthError) {
      console.warn(JSON.stringify({ event: 'mail_oauth_connect_failed', code: err.code }));
      return back({ email: 'error', reason: err.code });
    }
    logUnexpectedError(req, err);
    return back({ email: 'error', reason: 'provider_error' });
  }
};

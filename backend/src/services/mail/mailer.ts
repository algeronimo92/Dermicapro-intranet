import nodemailer from 'nodemailer';
import MailComposer from 'nodemailer/lib/mail-composer';
import { config } from '../../config/env';
import { SmtpConfig, getConfiguredTransport, storeRotatedRefreshToken } from './mailSettings.service';
import { Connection, MailOAuthError, sendWithOAuth } from './mailOAuth';
import { SmtpHostRejected, internalHostsAllowed, resolvePublicAddress } from './smtpGuard';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** Nombre que ve el destinatario cuando el remitente configurado no trae uno. */
const BRAND_NAME = 'DermicaPro';

export class MailNotConfiguredError extends Error {}
/** El mensaje se puede mostrar al admin: nunca trae la respuesta cruda del servidor. */
export class MailDeliveryError extends Error {}

/**
 * Desde dónde sale el correo, en este orden: la cuenta conectada en
 * Configuración, el SMTP cargado ahí, o el SMTP del .env.
 */
export type Transport =
  | { source: 'oauth'; connection: Connection }
  | { source: 'smtp'; smtp: SmtpConfig }
  | { source: 'env' };

export const resolveTransport = async (): Promise<Transport | null> => {
  const configured = await getConfiguredTransport();
  if (configured?.kind === 'oauth') return { source: 'oauth', connection: configured.connection };
  if (configured?.kind === 'smtp') return { source: 'smtp', smtp: configured.smtp };
  return config.mail.host ? { source: 'env' } : null;
};

const TIMEOUTS = { connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000 };

const envTransporter = () =>
  nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.secure,
    auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined,
    ...TIMEOUTS,
  });

/**
 * El SMTP de la pantalla lo escribió un admin: se conecta a la IP ya validada
 * (smtpGuard) y el certificado se valida contra el nombre del servidor.
 */
const configuredTransporter = async (smtp: SmtpConfig) => {
  const address = await resolvePublicAddress(smtp.host);
  return nodemailer.createTransport({
    host: address,
    port: smtp.port,
    secure: smtp.security === 'ssl',
    requireTLS: smtp.security === 'starttls',
    ignoreTLS: smtp.security === 'none' && internalHostsAllowed(),
    tls: { servername: smtp.host },
    auth: smtp.password ? { user: smtp.username, pass: smtp.password } : undefined,
    ...TIMEOUTS,
  });
};

const deliveryReason = (error: unknown): string => {
  if (error instanceof SmtpHostRejected || error instanceof MailOAuthError) return error.message;
  const code = (error as { code?: string })?.code;
  const responseCode = (error as { responseCode?: number })?.responseCode;
  if (code === 'EAUTH') {
    return 'El servidor rechazó el usuario o la contraseña. En Gmail y Outlook se usa una contraseña de aplicación, no la de la cuenta.';
  }
  if (code === 'EENVELOPE' || responseCode === 550 || responseCode === 553) {
    return 'El servidor no permite enviar desde ese correo remitente o rechazó al destinatario.';
  }
  if (code === 'ETIMEDOUT') return 'El servidor SMTP no respondió a tiempo. Revisa el servidor y el puerto.';
  if (code === 'EDNS') return 'No se encontró el servidor SMTP. Revisa el nombre.';
  if (code === 'ETLS' || code === 'ESOCKET') {
    return 'Falló la conexión segura. Revisa que el puerto coincida con la seguridad elegida (465 con SSL/TLS, 587 con STARTTLS).';
  }
  if (code === 'ECONNECTION') return 'El servidor SMTP rechazó la conexión en ese puerto.';
  return 'El proveedor de correo rechazó el envío.';
};

export const sendMail = async (message: MailMessage, transport?: Transport | null): Promise<void> => {
  const resolved = transport ?? (await resolveTransport());
  if (!resolved) throw new MailNotConfiguredError('No hay correo de envío configurado');

  try {
    if (resolved.source === 'env') {
      await envTransporter().sendMail({ from: config.mail.from, ...message });
      return;
    }
    if (resolved.source === 'smtp') {
      const { smtp } = resolved;
      const transporter = await configuredTransporter(smtp);
      await transporter.sendMail({ from: { name: smtp.fromName || BRAND_NAME, address: smtp.fromAddress }, ...message });
      return;
    }
    const { connection } = resolved;
    const mime = await new MailComposer({
      from: { name: BRAND_NAME, address: connection.accountEmail },
      ...message,
    }).compile().build();
    const rotated = await sendWithOAuth(connection, { mime, to: [message.to], subject: message.subject, html: message.html });
    if (rotated) await storeRotatedRefreshToken(rotated);
  } catch (error) {
    console.warn(JSON.stringify({
      event: 'mail_delivery_failed',
      source: resolved.source,
      code: (error as { code?: string })?.code ?? (error instanceof Error ? error.name : 'unknown'),
    }));
    throw new MailDeliveryError(deliveryReason(error));
  }
};

const SOURCE_LABELS: Record<Transport['source'], string> = {
  oauth: 'la cuenta conectada en Configuración',
  smtp: 'el SMTP configurado en Configuración',
  env: 'el SMTP del servidor (.env)',
};

/** Manda una prueba con el mismo camino que usan los correos del sistema. */
export const sendTestEmail = async (recipient: string): Promise<Transport['source']> => {
  const transport = await resolveTransport();
  if (!transport) throw new MailNotConfiguredError('No hay correo de envío configurado');
  const origin = SOURCE_LABELS[transport.source];
  await sendMail(
    {
      to: recipient,
      subject: 'Correo de prueba de DermicaPro',
      text: `Este es un correo de prueba. Los correos de DermicaPro (como recuperar la contraseña) salen desde ${origin}.`,
      html: `<!doctype html><html lang="es"><body style="font-family:Arial,Helvetica,sans-serif;color:#18181b;">
<p>Este es un correo de prueba.</p>
<p>Los correos de DermicaPro (como recuperar la contraseña) salen desde ${origin}.</p>
</body></html>`,
    },
    transport,
  );
  return transport.source;
};

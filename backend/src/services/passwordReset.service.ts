import crypto from 'crypto';
import prisma from '../config/database';
import { config } from '../config/env';
import { hashPassword } from '../utils/password';
import { passwordPolicyError } from '../utils/passwordPolicy';
import { AppError } from '../middlewares/errorHandler';
import { sendMail } from './mail/mailer';
import { passwordResetEmail } from './mail/passwordResetEmail';

/** Vigencia del enlace del correo. */
export const RESET_TOKEN_MINUTES = 30;
/** Entre dos correos a la misma cuenta; evita que alguien le llene la bandeja. */
const RESEND_COOLDOWN_MS = 60 * 1000;

export const INVALID_LINK_MESSAGE = 'El enlace no es válido o ya venció. Pide uno nuevo.';

const hashToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex');

const log = (event: string, data: Record<string, unknown>): void => {
  console.log(JSON.stringify({ event, ...data }));
};

/**
 * Busca la cuenta por correo sin distinguir mayúsculas. Si dos cuentas sólo se
 * diferencian por mayúsculas, sólo vale la coincidencia exacta.
 */
const findUserByEmail = async (email: string) => {
  const rows = await prisma.$queryRaw<{ id: string; email: string }[]>`
    SELECT id, email FROM users WHERE lower(email) = lower(${email}) LIMIT 2`;
  const match = rows.length === 1 ? rows[0] : rows.find((r) => r.email === email);
  if (!match) return null;
  return prisma.user.findUnique({
    where: { id: match.id },
    select: { id: true, email: true, firstName: true, isActive: true },
  });
};

/**
 * Crea un enlace de un solo uso y lo envía por correo. No informa si la cuenta
 * existe: quien llama responde siempre lo mismo.
 */
export const requestPasswordReset = async (rawEmail: string, ip: string | undefined): Promise<void> => {
  const email = rawEmail.trim();
  const user = await findUserByEmail(email);
  if (!user || !user.isActive) {
    log('password_reset_requested_unknown', { ip });
    return;
  }

  const recent = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id, createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) } },
    select: { id: true },
  });
  if (recent) {
    log('password_reset_throttled', { user_id: user.id, ip });
    return;
  }

  const token = crypto.randomBytes(32).toString('base64url');
  const now = new Date();

  // Pedir un enlace nuevo anula los anteriores que no se usaron.
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(now.getTime() + RESET_TOKEN_MINUTES * 60 * 1000),
        requestedIp: ip ?? null,
      },
    }),
  ]);

  // El token va en el fragmento (#): el navegador no lo manda al servidor ni
  // en el Referer, así que no queda en los logs de nginx.
  const link = `${config.appUrl}/reset-password#${token}`;
  await sendMail(passwordResetEmail(user.email, user.firstName, link, RESET_TOKEN_MINUTES));
  log('password_reset_email_sent', { user_id: user.id, ip });
};

const findValidToken = (token: string) =>
  prisma.passwordResetToken.findFirst({
    where: { tokenHash: hashToken(token), usedAt: null, expiresAt: { gt: new Date() }, user: { isActive: true } },
    select: { id: true, userId: true, user: { select: { firstName: true } } },
  });

/** Para que la página avise antes de escribir la contraseña si el enlace ya no sirve. */
export const checkResetToken = async (token: string): Promise<{ firstName: string } | null> => {
  const row = await findValidToken(token);
  return row ? { firstName: row.user.firstName } : null;
};

/**
 * Guarda la contraseña nueva, gasta el enlace, cierra las sesiones abiertas y
 * desbloquea el PIN.
 */
export const resetPassword = async (token: string, newPassword: string, ip: string | undefined): Promise<void> => {
  const policyError = passwordPolicyError(newPassword);
  if (policyError) throw new AppError(policyError, 400);

  const row = await findValidToken(token);
  if (!row) throw new AppError(INVALID_LINK_MESSAGE, 400);

  const passwordHash = await hashPassword(newPassword);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // Marca el enlace como usado sólo si nadie lo usó antes; si dos pestañas lo
    // envían a la vez, gana una.
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) throw new AppError(INVALID_LINK_MESSAGE, 400);

    await tx.user.update({
      where: { id: row.userId },
      data: { passwordHash, mustChangePassword: false, pinFailedAttempts: 0, sessionsRevokedAt: now },
    });
    await tx.passwordResetToken.deleteMany({ where: { userId: row.userId, usedAt: null } });
  });

  log('password_reset_completed', { user_id: row.userId, ip });
};

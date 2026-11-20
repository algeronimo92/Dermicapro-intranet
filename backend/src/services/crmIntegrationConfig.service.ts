import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';

/**
 * Configuración de la integración con el CRM, que un administrador maneja
 * desde Configuración: el token con que el CRM se identifica y el usuario a
 * cuyo nombre quedan las citas sin vendedor conocido.
 *
 * El token no se guarda: solo su hash. Es un secreto aleatorio de 256 bits,
 * así que un SHA-256 alcanza (no hay diccionario que probar, como con una
 * contraseña) y la verificación de cada cita no paga el costo de bcrypt.
 */

const CRM = 'crm';
// Reconocible a simple vista en el campo del CRM y en un log filtrado.
const TOKEN_PREFIX = 'erp_crm_';
const HINT_LENGTH = 4;

export interface CrmIntegrationStatus {
  /** Hay un token activo: el ERP acepta citas del CRM. */
  configured: boolean;
  /** Últimos caracteres del token activo, para reconocerlo. */
  tokenHint: string | null;
  tokenCreatedAt: Date | null;
  tokenCreatedBy: string | null;
  fallbackUserId: string | null;
}

const hash = (token: string): string => createHash('sha256').update(token).digest('hex');

function fullName(user: { firstName: string; lastName: string } | null): string | null {
  return user ? `${user.firstName} ${user.lastName}`.trim() : null;
}

export async function getCrmIntegrationStatus(): Promise<CrmIntegrationStatus> {
  const config = await prisma.integrationConfig.findUnique({
    where: { integration: CRM },
    include: { tokenCreatedBy: { select: { firstName: true, lastName: true } } },
  });

  return {
    configured: Boolean(config?.tokenHash),
    tokenHint: config?.tokenHint ?? null,
    tokenCreatedAt: config?.tokenCreatedAt ?? null,
    tokenCreatedBy: fullName(config?.tokenCreatedBy ?? null),
    fallbackUserId: config?.fallbackUserId ?? null,
  };
}

/**
 * Genera un token nuevo y reemplaza al anterior, que deja de valer en el
 * acto. Devuelve el token en claro: es la única vez que existe fuera del CRM.
 */
export async function generateCrmToken(userId: string): Promise<{ token: string; status: CrmIntegrationStatus }> {
  const token = `${TOKEN_PREFIX}${randomBytes(32).toString('hex')}`;
  const values = {
    tokenHash: hash(token),
    tokenHint: token.slice(-HINT_LENGTH),
    tokenCreatedAt: new Date(),
    tokenCreatedById: userId,
  };

  await prisma.integrationConfig.upsert({
    where: { integration: CRM },
    update: values,
    create: { integration: CRM, ...values },
  });

  return { token, status: await getCrmIntegrationStatus() };
}

/** Deja al ERP sin token: no acepta citas del CRM hasta generar otro. */
export async function revokeCrmToken(): Promise<CrmIntegrationStatus> {
  await prisma.integrationConfig.updateMany({
    where: { integration: CRM },
    data: { tokenHash: null, tokenHint: null, tokenCreatedAt: null, tokenCreatedById: null },
  });
  return getCrmIntegrationStatus();
}

export async function setCrmFallbackUser(userId: string | null): Promise<CrmIntegrationStatus> {
  if (userId !== null) {
    const user = await prisma.user.findFirst({ where: { id: userId, isActive: true }, select: { id: true } });
    if (!user) throw new AppError('El usuario de respaldo debe ser un usuario activo', 400);
  }

  await prisma.integrationConfig.upsert({
    where: { integration: CRM },
    update: { fallbackUserId: userId },
    create: { integration: CRM, fallbackUserId: userId },
  });
  return getCrmIntegrationStatus();
}

export type CrmTokenCheck = 'ok' | 'invalid' | 'not_configured';

/**
 * Se comparan los hashes y en tiempo constante: los dos tienen siempre el
 * mismo largo, así que ni el largo ni el punto donde difieren dicen nada del
 * token guardado.
 */
export async function checkCrmToken(received: string): Promise<CrmTokenCheck> {
  const config = await prisma.integrationConfig.findUnique({
    where: { integration: CRM },
    select: { tokenHash: true },
  });
  if (!config?.tokenHash) return 'not_configured';
  if (!received) return 'invalid';

  const expected = Buffer.from(config.tokenHash, 'hex');
  const actual = Buffer.from(hash(received), 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual) ? 'ok' : 'invalid';
}

/** El usuario de respaldo, si sigue activo. */
export async function getCrmFallbackUserId(): Promise<string | null> {
  const config = await prisma.integrationConfig.findUnique({
    where: { integration: CRM },
    select: { fallbackUser: { select: { id: true, isActive: true } } },
  });
  return config?.fallbackUser?.isActive ? config.fallbackUser.id : null;
}

import crypto from 'crypto';
import { config } from '../config/env';

/**
 * Cifrado autenticado (AES-256-GCM) para secretos guardados en la base, como
 * la contraseña SMTP o el refresh token del correo conectado.
 *
 * La clave nunca se guarda en PostgreSQL: sale de SETTINGS_ENCRYPTION_KEY
 * (base64 de 32 bytes) o, si no está, se deriva de JWT_SECRET con separación
 * de dominio. El nombre del campo va como AAD: copiar el texto cifrado de un
 * campo a otro no lo descifra.
 */

const PREFIX = 'enc:v1:';
const KEY_CONTEXT = 'dermicapro:settings-secrets:v1\0';

export class SecretCipherError extends Error {}

const key = (): Buffer => {
  const explicit = config.settingsEncryptionKey.trim();
  if (explicit) {
    const decoded = Buffer.from(explicit, 'base64url');
    if (decoded.length !== 32) {
      throw new SecretCipherError('SETTINGS_ENCRYPTION_KEY debe ser base64 de exactamente 32 bytes');
    }
    return decoded;
  }
  return crypto.createHash('sha256').update(KEY_CONTEXT + config.jwt.secret).digest();
};

export const encryptSecret = (field: string, plaintext: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from(`${field}:v1`));
  const body = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
};

export const decryptSecret = (field: string, stored: string): string => {
  if (!stored.startsWith(PREFIX)) throw new SecretCipherError('El secreto guardado no está cifrado');
  const raw = Buffer.from(stored.slice(PREFIX.length), 'base64url');
  if (raw.length < 28) throw new SecretCipherError('El secreto guardado está dañado');
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), raw.subarray(0, 12));
    decipher.setAAD(Buffer.from(`${field}:v1`));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
  } catch {
    // Pasa si cambió la clave (JWT_SECRET o SETTINGS_ENCRYPTION_KEY): hay que
    // volver a escribir la contraseña o reconectar la cuenta.
    throw new SecretCipherError('No se pudo descifrar el secreto guardado; vuelve a configurar el correo');
  }
};

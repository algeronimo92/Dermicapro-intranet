import crypto from 'crypto';
import { config } from '../../config/env';

/**
 * El `state` firmado de "Conectar con Google / Microsoft / Zoho".
 *
 * El proveedor vuelve a un callback sin sesión: quién inició el flujo sale de
 * este token. Lleva un nonce que se guarda al iniciar y el callback consume,
 * así que cada state sirve una sola vez; del nonce sale el code_verifier de
 * PKCE sin tener que guardarlo aparte.
 */

const STATE_TTL_SECONDS = 10 * 60;
const KEY_CONTEXT = 'dermicapro:mail-oauth-state:v1\0';
const VERIFIER_CONTEXT = 'pkce-verifier\0';

export class InvalidOAuthState extends Error {}

export interface OAuthState {
  userId: string;
  nonce: string;
  expiresAt: number;
}

// Separación de dominio: JWT_SECRET firma las sesiones; un state no debe
// poder pasar por un token de sesión ni al revés.
const signingKey = (): Buffer => crypto.createHash('sha256').update(KEY_CONTEXT + config.jwt.secret).digest();

const sign = (encoded: string): string =>
  crypto.createHmac('sha256', signingKey()).update(encoded).digest('base64url');

export const newNonce = (): string => crypto.randomBytes(24).toString('base64url');

/** 43 caracteres base64url: el mínimo que acepta RFC 7636. */
export const codeVerifier = (nonce: string): string =>
  crypto.createHmac('sha256', signingKey()).update(VERIFIER_CONTEXT + nonce).digest('base64url');

export const codeChallenge = (nonce: string): string =>
  crypto.createHash('sha256').update(codeVerifier(nonce)).digest('base64url');

export const issueState = (userId: string, nonce: string, now = Date.now()): string => {
  const payload = { v: 1, uid: userId, n: nonce, exp: Math.floor(now / 1000) + STATE_TTL_SECONDS };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${sign(encoded)}`;
};

export const decodeState = (token: string, now = Date.now()): OAuthState => {
  const [encoded, signature, extra] = token.split('.');
  if (!encoded || !signature || extra !== undefined) throw new InvalidOAuthState('state inválido');
  const expected = Buffer.from(sign(encoded));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
    throw new InvalidOAuthState('state inválido');
  }
  let payload: { v?: number; uid?: unknown; n?: unknown; exp?: unknown };
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    throw new InvalidOAuthState('state inválido');
  }
  if (payload.v !== 1 || typeof payload.uid !== 'string' || typeof payload.n !== 'string' || typeof payload.exp !== 'number') {
    throw new InvalidOAuthState('state inválido');
  }
  if (payload.exp <= Math.floor(now / 1000)) throw new InvalidOAuthState('state vencido');
  return { userId: payload.uid, nonce: payload.n, expiresAt: payload.exp };
};

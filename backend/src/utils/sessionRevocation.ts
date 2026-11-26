/**
 * Un token (access o refresh) emitido antes de sessionsRevokedAt ya no vale.
 * iat está en segundos y se compara contra el segundo de la revocación: un
 * login hecho en el mismo segundo en que se restableció la contraseña sigue
 * siendo válido.
 */
export const isTokenRevoked = (iat: number | undefined, sessionsRevokedAt: Date | null | undefined): boolean => {
  if (!sessionsRevokedAt) return false;
  if (typeof iat !== 'number') return true;
  return iat < Math.floor(sessionsRevokedAt.getTime() / 1000);
};

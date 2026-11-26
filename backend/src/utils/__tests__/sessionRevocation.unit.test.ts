import { isTokenRevoked } from '../sessionRevocation';

describe('isTokenRevoked', () => {
  const revokedAt = new Date('2026-11-25T15:00:00.500Z');
  const revokedSec = Math.floor(revokedAt.getTime() / 1000);

  it('sin revocación, todo token vale', () => {
    expect(isTokenRevoked(123, null)).toBe(false);
  });
  it('un token emitido antes de restablecer ya no vale', () => {
    expect(isTokenRevoked(revokedSec - 1, revokedAt)).toBe(true);
  });
  it('un login hecho después (o en el mismo segundo) sí vale', () => {
    expect(isTokenRevoked(revokedSec, revokedAt)).toBe(false);
    expect(isTokenRevoked(revokedSec + 60, revokedAt)).toBe(false);
  });
  it('un token sin iat no vale si hubo revocación', () => {
    expect(isTokenRevoked(undefined, revokedAt)).toBe(true);
  });
});

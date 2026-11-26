import { decryptSecret, encryptSecret, SecretCipherError } from '../../../utils/secretCipher';
import { isPublicIp, validateSmtpHost, SmtpHostRejected } from '../smtpGuard';
import { codeChallenge, codeVerifier, decodeState, InvalidOAuthState, issueState, newNonce } from '../oauthState';
import { authorizationUrl, idTokenEmail, zohoAccountsServer, MailOAuthError } from '../mailOAuth';

describe('secretCipher', () => {
  it('cifra y descifra; el texto guardado no contiene el secreto', () => {
    const stored = encryptSecret('campo', 'Clave-Secreta-1');
    expect(stored.startsWith('enc:v1:')).toBe(true);
    expect(stored).not.toContain('Clave-Secreta-1');
    expect(decryptSecret('campo', stored)).toBe('Clave-Secreta-1');
  });

  it('cada cifrado es distinto (IV aleatorio)', () => {
    expect(encryptSecret('campo', 'x')).not.toBe(encryptSecret('campo', 'x'));
  });

  it('no se puede descifrar copiado a otro campo ni alterado', () => {
    const stored = encryptSecret('campo', 'secreto');
    expect(() => decryptSecret('otro', stored)).toThrow(SecretCipherError);
    const tampered = stored.slice(0, -2) + (stored.endsWith('A') ? 'BB' : 'AA');
    expect(() => decryptSecret('campo', tampered)).toThrow(SecretCipherError);
    expect(() => decryptSecret('campo', 'texto-plano')).toThrow(SecretCipherError);
  });
});

describe('smtpGuard', () => {
  it.each(['10.0.0.5', '127.0.0.1', '172.20.0.3', '192.168.1.1', '169.254.169.254', '::1', 'fd00::1', '::ffff:10.0.0.1'])(
    '%s no es pública', (ip) => expect(isPublicIp(ip)).toBe(false),
  );
  it.each(['8.8.8.8', '2a00:1450:4001:80b::200e'])('%s es pública', (ip) => expect(isPublicIp(ip)).toBe(true));

  it('acepta el servidor de un proveedor y lo normaliza', () => {
    expect(validateSmtpHost('  SMTP.Hostinger.com. ')).toBe('smtp.hostinger.com');
  });

  it.each(['db', 'mailpit', 'localhost', 'smtp.local', 'servidor.internal', '10.0.0.5', 'no es host', ''])(
    'rechaza %p', (host) => expect(() => validateSmtpHost(host)).toThrow(SmtpHostRejected),
  );
});

describe('oauthState', () => {
  it('firma y lee el state', () => {
    const nonce = newNonce();
    const state = decodeState(issueState('u1', nonce));
    expect(state).toMatchObject({ userId: 'u1', nonce });
  });

  it('rechaza un state alterado o vencido', () => {
    const token = issueState('u1', 'n');
    const [body, sig] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ v: 1, uid: 'admin', n: 'n', exp: 9999999999 })).toString('base64url');
    expect(() => decodeState(`${forged}.${sig}`)).toThrow(InvalidOAuthState);
    expect(() => decodeState(`${body}.x${sig.slice(1)}`)).toThrow(InvalidOAuthState);
    expect(() => decodeState(token, Date.now() + 11 * 60 * 1000)).toThrow(InvalidOAuthState);
  });

  it('PKCE: el verifier sale del nonce y cumple RFC 7636', () => {
    const v = codeVerifier('abc');
    expect(v).toHaveLength(43);
    expect(codeVerifier('abc')).toBe(v);
    expect(codeChallenge('abc')).not.toBe(v);
  });
});

describe('mailOAuth', () => {
  const client = { clientId: 'cid', clientSecret: 'secret', redirectUri: 'https://erp.test/api/integrations/email/callback' };

  it('arma la URL de Google con PKCE, acceso offline y sólo el permiso de envío', () => {
    const url = new URL(authorizationUrl('google', client, { state: 'st', codeChallenge: 'ch' }));
    expect(url.origin).toBe('https://accounts.google.com');
    expect(url.searchParams.get('scope')).toContain('gmail.send');
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('code_challenge')).toBe('ch');
    expect(url.searchParams.get('state')).toBe('st');
    expect(url.toString()).not.toContain('secret');
  });

  it('Microsoft pide offline_access y Mail.Send', () => {
    const url = new URL(authorizationUrl('microsoft', client, { state: 'st', codeChallenge: 'ch' }));
    expect(url.searchParams.get('scope')).toContain('offline_access');
    expect(url.searchParams.get('scope')).toContain('Mail.Send');
  });

  it('lee el correo del id_token', () => {
    const token = `x.${Buffer.from(JSON.stringify({ email: 'Ana@Clinica.com' })).toString('base64url')}.y`;
    expect(idTokenEmail(token)).toBe('ana@clinica.com');
    expect(idTokenEmail('basura')).toBe('');
  });

  it('sólo acepta centros de datos de Zoho conocidos', () => {
    expect(zohoAccountsServer('https://accounts.zoho.eu/')).toBe('https://accounts.zoho.eu');
    expect(zohoAccountsServer(undefined)).toBe('https://accounts.zoho.com');
    expect(() => zohoAccountsServer('https://evil.example.com')).toThrow(MailOAuthError);
  });
});

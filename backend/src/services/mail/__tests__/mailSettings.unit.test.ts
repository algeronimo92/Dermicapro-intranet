import prisma from '../../../config/database';
import { decryptSecret, encryptSecret } from '../../../utils/secretCipher';
import {
  consumeOAuthNonce,
  getConfiguredTransport,
  readMailSettings,
  saveSmtpSettings,
  storeOAuthConnection,
} from '../mailSettings.service';

jest.mock('../../../config/database', () => ({
  __esModule: true,
  default: { mailSettings: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn(), updateMany: jest.fn() } },
}));

const db = (prisma as unknown as { mailSettings: Record<string, jest.Mock> }).mailSettings;

const valid = {
  host: 'smtp.hostinger.com',
  port: 465,
  security: 'ssl',
  username: '',
  password: 'Buzon-123',
  fromAddress: 'No-Reply@DermicaPro.com',
  fromName: 'DermicaPro',
};

const savedData = () => db.upsert.mock.calls[0][0].update;

beforeEach(() => {
  jest.clearAllMocks();
  db.findUnique.mockResolvedValue(null);
});

describe('saveSmtpSettings', () => {
  it('guarda la contraseña cifrada y usa el remitente como usuario', async () => {
    await saveSmtpSettings(valid, 'admin');
    const data = savedData();
    expect(data).toMatchObject({ smtpHost: 'smtp.hostinger.com', smtpPort: 465, smtpUsername: 'no-reply@dermicapro.com', fromAddress: 'no-reply@dermicapro.com' });
    expect(data.smtpPasswordEnc).not.toContain('Buzon-123');
    expect(decryptSecret('mail_settings.smtp_password', data.smtpPasswordEnc)).toBe('Buzon-123');
    // SMTP y cuenta conectada son excluyentes.
    expect(data).toMatchObject({ oauthProvider: null, oauthRefreshEnc: null });
  });

  it.each([
    [{ port: 3306 }, 'Puerto no permitido'],
    [{ security: 'none' }, 'Seguridad inválida'],
    [{ host: 'db' }, 'servidor SMTP'],
    [{ fromAddress: 'no-es-correo' }, 'remitente no es válido'],
    [{ fromName: 'a\r\nBcc: x@y.com' }, 'no es válido'],
    [{ password: '' }, 'Escribe la contraseña'],
  ])('rechaza %p', async (change, message) => {
    await expect(saveSmtpSettings({ ...valid, ...change }, 'admin')).rejects.toThrow(message);
    expect(db.upsert).not.toHaveBeenCalled();
  });

  it('conserva la contraseña guardada si no se cambia el servidor ni el usuario', async () => {
    db.findUnique.mockResolvedValue({ smtpHost: 'smtp.hostinger.com', smtpUsername: 'no-reply@dermicapro.com', smtpPasswordEnc: 'enc:v1:x' });
    await saveSmtpSettings({ ...valid, password: null, fromName: 'Otro nombre' }, 'admin');
    expect(savedData().smtpPasswordEnc).toBeUndefined();
  });

  it('exige reescribir la contraseña si se cambia el servidor', async () => {
    db.findUnique.mockResolvedValue({ smtpHost: 'smtp.hostinger.com', smtpUsername: 'no-reply@dermicapro.com', smtpPasswordEnc: 'enc:v1:x' });
    await expect(saveSmtpSettings({ ...valid, host: 'smtp.otro-servidor.com', password: null }, 'admin'))
      .rejects.toThrow('Vuelve a escribir la contraseña');
  });
});

describe('estado y transporte', () => {
  it('el estado nunca devuelve la contraseña', async () => {
    db.findUnique.mockResolvedValue({
      smtpHost: 'smtp.hostinger.com', smtpPort: 465, smtpSecurity: 'ssl', smtpUsername: 'u',
      smtpPasswordEnc: encryptSecret('mail_settings.smtp_password', 'Buzon-123'), fromAddress: 'a@b.com',
    });
    const status = await readMailSettings();
    expect(status).toMatchObject({ mode: 'smtp', passwordConfigured: true });
    expect(JSON.stringify(status)).not.toContain('Buzon-123');
    expect(JSON.stringify(status)).not.toContain('enc:v1');
  });

  it('la cuenta conectada tiene prioridad y su token se descifra al usarse', async () => {
    db.findUnique.mockResolvedValue({
      oauthProvider: 'google', oauthRefreshEnc: encryptSecret('mail_settings.oauth_refresh_token', 'rt-1'),
      oauthAccountEmail: 'clinica@gmail.com',
    });
    expect(await getConfiguredTransport()).toEqual({
      kind: 'oauth',
      connection: { provider: 'google', refreshToken: 'rt-1', accountEmail: 'clinica@gmail.com', accountsServer: undefined, accountId: undefined },
    });
  });

  it('conectar una cuenta borra el SMTP y cifra el refresh token', async () => {
    await storeOAuthConnection({ provider: 'microsoft', refreshToken: 'rt-2', accountEmail: 'x@outlook.com' }, 'admin');
    const data = savedData();
    expect(data).toMatchObject({ smtpHost: null, smtpPasswordEnc: null, oauthProvider: 'microsoft' });
    expect(data.oauthRefreshEnc).not.toContain('rt-2');
  });
});

describe('consumeOAuthNonce', () => {
  it('devuelve el proveedor una sola vez', async () => {
    db.findUnique.mockResolvedValue({ oauthNonce: 'n-1', oauthPendingProvider: 'zoho' });
    db.updateMany.mockResolvedValue({ count: 1 });
    expect(await consumeOAuthNonce('n-1')).toBe('zoho');
    db.updateMany.mockResolvedValue({ count: 0 });
    expect(await consumeOAuthNonce('n-1')).toBeNull();
  });

  it('rechaza un nonce distinto', async () => {
    db.findUnique.mockResolvedValue({ oauthNonce: 'n-1', oauthPendingProvider: 'zoho' });
    expect(await consumeOAuthNonce('n-2')).toBeNull();
    expect(db.updateMany).not.toHaveBeenCalled();
  });
});

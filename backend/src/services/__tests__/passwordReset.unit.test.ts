import crypto from 'crypto';
import prisma from '../../config/database';
import { sendMail } from '../mail/mailer';
import { requestPasswordReset, resetPassword, INVALID_LINK_MESSAGE } from '../passwordReset.service';
import { comparePassword } from '../../utils/password';

jest.mock('../mail/mailer', () => ({ sendMail: jest.fn() }));

const tx = {
  passwordResetToken: { updateMany: jest.fn(), deleteMany: jest.fn() },
  user: { update: jest.fn() },
};

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
    user: { findUnique: jest.fn() },
    passwordResetToken: { findFirst: jest.fn(), deleteMany: jest.fn(), create: jest.fn() },
  },
}));

const db = prisma as unknown as {
  $queryRaw: jest.Mock;
  $transaction: jest.Mock;
  user: { findUnique: jest.Mock };
  passwordResetToken: { findFirst: jest.Mock; deleteMany: jest.Mock; create: jest.Mock };
};
const mail = sendMail as jest.Mock;
const sha = (t: string) => crypto.createHash('sha256').update(t).digest('hex');

beforeEach(() => {
  jest.clearAllMocks();
  db.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === 'function' ? (arg as (t: typeof tx) => unknown)(tx) : Promise.all(arg as unknown[]));
});

describe('requestPasswordReset', () => {
  const user = { id: 'u1', email: 'ana@dermicapro.com', firstName: 'Ana', isActive: true };

  it('envía un enlace cuyo token sólo se guarda como hash', async () => {
    db.$queryRaw.mockResolvedValue([{ id: 'u1', email: user.email }]);
    db.user.findUnique.mockResolvedValue(user);
    db.passwordResetToken.findFirst.mockResolvedValue(null);

    await requestPasswordReset('  ANA@dermicapro.com ', '1.2.3.4');

    expect(mail).toHaveBeenCalledTimes(1);
    const { to, text } = mail.mock.calls[0][0];
    expect(to).toBe(user.email);
    const token = /reset-password#([A-Za-z0-9_-]+)/.exec(text)![1];
    const saved = db.passwordResetToken.create.mock.calls[0][0].data;
    expect(saved.tokenHash).toBe(sha(token));
    expect(saved.tokenHash).not.toContain(token);
    expect(saved.expiresAt.getTime() - Date.now()).toBeGreaterThan(29 * 60 * 1000);
    expect(db.passwordResetToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1', usedAt: null } });
  });

  it('no envía nada si el correo no existe', async () => {
    db.$queryRaw.mockResolvedValue([]);
    await requestPasswordReset('nadie@dermicapro.com', undefined);
    expect(mail).not.toHaveBeenCalled();
    expect(db.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it('no envía nada a una cuenta desactivada', async () => {
    db.$queryRaw.mockResolvedValue([{ id: 'u1', email: user.email }]);
    db.user.findUnique.mockResolvedValue({ ...user, isActive: false });
    await requestPasswordReset(user.email, undefined);
    expect(mail).not.toHaveBeenCalled();
  });

  it('no manda otro correo si ya pidió uno hace menos de un minuto', async () => {
    db.$queryRaw.mockResolvedValue([{ id: 'u1', email: user.email }]);
    db.user.findUnique.mockResolvedValue(user);
    db.passwordResetToken.findFirst.mockResolvedValue({ id: 't-reciente' });
    await requestPasswordReset(user.email, undefined);
    expect(mail).not.toHaveBeenCalled();
  });

  it('con dos cuentas que sólo difieren en mayúsculas, sólo vale la exacta', async () => {
    db.$queryRaw.mockResolvedValue([{ id: 'u1', email: 'Ana@dermicapro.com' }, { id: 'u2', email: 'ana@dermicapro.com' }]);
    await requestPasswordReset('ANA@dermicapro.com', undefined);
    expect(db.user.findUnique).not.toHaveBeenCalled();
    expect(mail).not.toHaveBeenCalled();
  });
});

describe('resetPassword', () => {
  const validRow = { id: 't1', userId: 'u1', user: { firstName: 'Ana' } };

  it('guarda la contraseña, gasta el enlace, cierra sesiones y desbloquea el PIN', async () => {
    db.passwordResetToken.findFirst.mockResolvedValue(validRow);
    tx.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });

    await resetPassword('tok', 'Nueva1234!', undefined);

    expect(db.passwordResetToken.findFirst.mock.calls[0][0].where.tokenHash).toBe(sha('tok'));
    const data = tx.user.update.mock.calls[0][0].data;
    expect(await comparePassword('Nueva1234!', data.passwordHash)).toBe(true);
    expect(data).toMatchObject({ mustChangePassword: false, pinFailedAttempts: 0, sessionsRevokedAt: expect.any(Date) });
  });

  it('rechaza un enlace vencido, usado o inexistente', async () => {
    db.passwordResetToken.findFirst.mockResolvedValue(null);
    await expect(resetPassword('tok', 'Nueva1234!', undefined)).rejects.toThrow(INVALID_LINK_MESSAGE);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('si otra pestaña usó el enlace primero, no cambia nada', async () => {
    db.passwordResetToken.findFirst.mockResolvedValue(validRow);
    tx.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
    await expect(resetPassword('tok', 'Nueva1234!', undefined)).rejects.toThrow(INVALID_LINK_MESSAGE);
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('aplica las reglas de contraseña antes de mirar el enlace', async () => {
    await expect(resetPassword('tok', 'corta', undefined)).rejects.toThrow('al menos 8');
    expect(db.passwordResetToken.findFirst).not.toHaveBeenCalled();
  });
});

import { Request, Response } from 'express';
import prisma from '../../config/database';
import { changePassword } from '../auth.controller';
import { hashPassword } from '../../utils/password';

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: { user: { findUnique: jest.fn(), update: jest.fn() } },
}));

const user = prisma.user as unknown as { findUnique: jest.Mock; update: jest.Mock };

function response() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response & { status: jest.Mock; json: jest.Mock };
}

const call = (body: Record<string, unknown>) => {
  const res = response();
  return changePassword({ body, user: { id: 'u1' } } as unknown as Request, res).then(() => res);
};

let tempHash: string;
beforeAll(async () => { tempHash = await hashPassword('Antonella123'); });
beforeEach(() => jest.clearAllMocks());

describe('Primer inicio de sesión (mustChangePassword)', () => {
  beforeEach(() => user.findUnique.mockResolvedValue({ id: 'u1', passwordHash: tempHash, mustChangePassword: true }));

  it('cambia la contraseña sin pedir la actual, sea cual sea la que puso el admin', async () => {
    const res = await call({ newPassword: 'Antonella123!?' });
    expect(res.status).not.toHaveBeenCalled();
    expect(user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { passwordHash: expect.any(String), mustChangePassword: false },
    });
  });

  it('no deja quedarse con la misma contraseña temporal', async () => {
    const res = await call({ newPassword: 'Antonella123' });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(user.update).not.toHaveBeenCalled();
  });
});

describe('Cambio normal desde Mi perfil', () => {
  beforeEach(() => user.findUnique.mockResolvedValue({ id: 'u1', passwordHash: tempHash, mustChangePassword: false }));

  it('exige la contraseña actual', async () => {
    const res = await call({ newPassword: 'Otra1234!' });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(user.update).not.toHaveBeenCalled();
  });

  it('rechaza una contraseña actual incorrecta', async () => {
    const res = await call({ currentPassword: '1234567890', newPassword: 'Otra1234!' });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(user.update).not.toHaveBeenCalled();
  });

  it('cambia con la contraseña actual correcta', async () => {
    const res = await call({ currentPassword: 'Antonella123', newPassword: 'Otra1234!' });
    expect(res.status).not.toHaveBeenCalled();
    expect(user.update).toHaveBeenCalledTimes(1);
  });
});

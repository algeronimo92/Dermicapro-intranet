import { createHash } from 'crypto';
import prisma from '../../config/database';
import {
  checkCrmToken,
  generateCrmToken,
  getCrmFallbackUserId,
  getCrmIntegrationStatus,
  revokeCrmToken,
  setCrmFallbackUser,
} from '../crmIntegrationConfig.service';

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    integrationConfig: { findUnique: jest.fn(), upsert: jest.fn(), updateMany: jest.fn() },
    user: { findFirst: jest.fn() },
  },
}));

type Mocked = Record<string, Record<string, jest.Mock>>;
const db = prisma as unknown as Mocked;

/** Una "tabla" de una sola fila, para que generar y verificar se encuentren. */
let row: Record<string, unknown> | null;

beforeEach(() => {
  jest.resetAllMocks();
  row = null;
  db.integrationConfig.findUnique.mockImplementation(async () => row);
  db.integrationConfig.upsert.mockImplementation(async ({ update, create }) => {
    row = row ? { ...row, ...update } : { ...create };
    return row;
  });
  db.integrationConfig.updateMany.mockImplementation(async ({ data }) => {
    if (row) row = { ...row, ...data };
    return { count: row ? 1 : 0 };
  });
});

describe('Token de la integración con el CRM', () => {
  it('sin token generado la integración no está configurada', async () => {
    expect(await getCrmIntegrationStatus()).toEqual({
      configured: false, tokenHint: null, tokenCreatedAt: null, tokenCreatedBy: null, fallbackUserId: null,
    });
    expect(await checkCrmToken('lo-que-sea')).toBe('not_configured');
  });

  it('genera un token que se entrega una vez y del que solo se guarda el hash', async () => {
    const { token, status } = await generateCrmToken('admin-id');

    expect(token).toMatch(/^erp_crm_[0-9a-f]{64}$/);
    expect(status.configured).toBe(true);
    expect(status.tokenHint).toBe(token.slice(-4));
    // Lo guardado no permite reconstruir el token.
    expect(JSON.stringify(row)).not.toContain(token);
    expect(row).toMatchObject({
      tokenHash: createHash('sha256').update(token).digest('hex'), tokenCreatedById: 'admin-id',
    });
  });

  it('acepta solo el token generado', async () => {
    const { token } = await generateCrmToken('admin-id');

    expect(await checkCrmToken(token)).toBe('ok');
    expect(await checkCrmToken(`${token}x`)).toBe('invalid');
    expect(await checkCrmToken(token.slice(0, -1))).toBe('invalid');
    expect(await checkCrmToken('')).toBe('invalid');
  });

  it('regenerar deja sin efecto el token anterior', async () => {
    const first = await generateCrmToken('admin-id');
    const second = await generateCrmToken('admin-id');

    expect(second.token).not.toBe(first.token);
    expect(await checkCrmToken(first.token)).toBe('invalid');
    expect(await checkCrmToken(second.token)).toBe('ok');
  });

  it('desactivar cierra la integración y conserva el usuario de respaldo', async () => {
    db.user.findFirst.mockResolvedValue({ id: 'user-1' });
    const { token } = await generateCrmToken('admin-id');
    await setCrmFallbackUser('user-1');

    const status = await revokeCrmToken();

    expect(status).toMatchObject({ configured: false, tokenHint: null, fallbackUserId: 'user-1' });
    expect(await checkCrmToken(token)).toBe('not_configured');
  });

  it('dice quién generó el token activo', async () => {
    row = {
      tokenHash: 'abc', tokenHint: 'f00d', tokenCreatedAt: new Date('2026-11-18T03:00:00Z'),
      tokenCreatedBy: { firstName: 'Admin', lastName: 'DermicaPro' }, fallbackUserId: null,
    };

    expect(await getCrmIntegrationStatus()).toMatchObject({
      configured: true, tokenHint: 'f00d', tokenCreatedBy: 'Admin DermicaPro',
    });
  });
});

describe('Usuario de respaldo de la integración', () => {
  it('solo acepta un usuario activo', async () => {
    db.user.findFirst.mockResolvedValue(null);

    await expect(setCrmFallbackUser('inactivo')).rejects.toMatchObject({ statusCode: 400 });
    expect(db.integrationConfig.upsert).not.toHaveBeenCalled();
    expect(db.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'inactivo', isActive: true } }));
  });

  it('se puede quitar', async () => {
    db.user.findFirst.mockResolvedValue({ id: 'user-1' });
    await setCrmFallbackUser('user-1');

    expect((await setCrmFallbackUser(null)).fallbackUserId).toBeNull();
  });

  it('deja de contar si el usuario elegido fue desactivado después', async () => {
    row = { fallbackUser: { id: 'user-1', isActive: false } };
    expect(await getCrmFallbackUserId()).toBeNull();

    row = { fallbackUser: { id: 'user-1', isActive: true } };
    expect(await getCrmFallbackUserId()).toBe('user-1');
  });
});

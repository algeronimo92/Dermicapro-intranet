import prisma from '../../config/database';
import { ensureEmployeeDbRole, resetEmployeeDbRoleCache } from '../employeeDbRoles.service';

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(async () => []),
    $executeRawUnsafe: jest.fn((sql: string) => sql),
  },
}));

const transaction = prisma.$transaction as jest.Mock;
const raw = prisma.$executeRawUnsafe as unknown as jest.Mock;
const USER = 'b5f6c6a5-52c9-4f05-978e-1c8fb5dfb3bf';
const EMP = 'emp_b5f6c6a552c94f05978e1c8fb5dfb3bf';

beforeEach(() => {
  jest.clearAllMocks();
  resetEmployeeDbRoleCache();
});

describe('ensureEmployeeDbRole', () => {
  it('admin no tiene rol propio: consulta como dueño', async () => {
    expect(await ensureEmployeeDbRole(USER, 'admin', 'Admin')).toBeNull();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('crea el rol, lo hace miembro de su grupo y lo identifica con el nombre', async () => {
    expect(await ensureEmployeeDbRole(USER, 'sales', "Grecia O'Neil")).toBe(EMP);
    const sql = raw.mock.calls.map(c => c[0]).join('\n');
    expect(sql).toContain(`CREATE ROLE ${EMP} NOLOGIN INHERIT`);
    expect(sql).toContain(`'app_sales', '${EMP}'`);
    expect(sql).toContain(`COMMENT ON ROLE ${EMP} IS 'Grecia O''Neil'`);
  });

  it('no repite la sincronización si el rol no cambió', async () => {
    await ensureEmployeeDbRole(USER, 'sales', 'Grecia');
    await ensureEmployeeDbRole(USER, 'sales', 'Grecia');
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('vuelve a sincronizar al cambiar de rol y al devolverlo al original', async () => {
    await ensureEmployeeDbRole(USER, 'sales', 'Grecia');
    await ensureEmployeeDbRole(USER, 'assistant', 'Grecia');
    await ensureEmployeeDbRole(USER, 'sales', 'Grecia');
    expect(transaction).toHaveBeenCalledTimes(3);
  });

  it('vuelve a sincronizar cuando caduca el caché', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000);
    await ensureEmployeeDbRole(USER, 'sales', 'Grecia');
    now.mockReturnValue(1_000 + 61_000);
    await ensureEmployeeDbRole(USER, 'sales', 'Grecia');
    expect(transaction).toHaveBeenCalledTimes(2);
    now.mockRestore();
  });
});

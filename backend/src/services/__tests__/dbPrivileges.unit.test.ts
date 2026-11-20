import { diffToStatements, normalizeGrants } from '../dbPrivileges.service';
import { dbRoleFor, employeeDbRoleFor, markPrivilegeDenied, DbRoleStore } from '../../config/dbRoleContext';

jest.mock('../../config/database', () => ({ __esModule: true, default: {} }));

describe('normalizeGrants', () => {
  it('ordena y deduplica privilegios válidos', () => {
    expect(normalizeGrants({ patients: ['UPDATE', 'SELECT', 'SELECT'] })).toEqual({ patients: ['SELECT', 'UPDATE'] });
  });

  it('acepta quitar todos los privilegios de una tabla', () => {
    expect(normalizeGrants({ patients: [] })).toEqual({ patients: [] });
  });

  it.each([
    [{ 'users; DROP TABLE users': ['SELECT'] }, 'Tabla no administrable'],
    [{ _prisma_migrations: ['SELECT'] }, 'Tabla no administrable'],
    [{ patients: ['TRUNCATE'] }, 'Privilegio no válido'],
    [{ patients: 'SELECT' }, 'Privilegios inválidos'],
    [{ patients: ['INSERT'] }, 'necesitan también SELECT'],
    [{ patients: ['DELETE'] }, 'necesitan también SELECT'],
    [['SELECT'], 'Formato de privilegios inválido'],
    [null, 'Formato de privilegios inválido'],
  ])('rechaza %j', (input, message) => {
    expect(() => normalizeGrants(input)).toThrow(message);
  });
});

describe('diffToStatements', () => {
  it('sólo emite lo que cambia', () => {
    const current = { patients: ['SELECT', 'INSERT'] as const, payments: ['SELECT'] as const };
    const desired = { patients: ['SELECT', 'UPDATE'] as const, payments: ['SELECT'] as const };
    expect(diffToStatements('app_sales', current as never, desired as never)).toEqual([
      'GRANT UPDATE ON public."patients" TO app_sales',
      'REVOKE INSERT ON public."patients" FROM app_sales',
    ]);
  });

  it('no toca tablas que no vienen en el estado deseado', () => {
    expect(diffToStatements('app_sales', { patients: ['SELECT'] }, {})).toEqual([]);
  });
});

describe('dbRoleFor', () => {
  it.each([
    ['sales', 'app_sales'],
    ['inventory', 'app_inventory'],
    ['admin', null],
    ['desconocido', null],
    [undefined, null],
  ])('%s -> %s', (role, expected) => {
    expect(dbRoleFor(role)).toBe(expected);
  });
});

describe('markPrivilegeDenied', () => {
  it('extrae la tabla del mensaje de PostgreSQL', () => {
    const store: DbRoleStore = { dbRole: 'app_sales' };
    markPrivilegeDenied(store, 'permission denied for table patients');
    expect(store.deniedTable).toBe('patients');
  });

  it('no falla sin contexto', () => {
    expect(() => markPrivilegeDenied(undefined, 'permission denied for table patients')).not.toThrow();
  });
});

describe('employeeDbRoleFor', () => {
  it('deriva un nombre de rol estable a partir del id', () => {
    expect(employeeDbRoleFor('B5F6C6A5-52C9-4F05-978E-1C8FB5DFB3BF')).toBe('emp_b5f6c6a552c94f05978e1c8fb5dfb3bf');
  });

  it.each(['', 'admin', "x'; DROP ROLE app_sales; --"])('rechaza ids que no son uuid: %s', (id) => {
    expect(() => employeeDbRoleFor(id)).toThrow();
  });
});

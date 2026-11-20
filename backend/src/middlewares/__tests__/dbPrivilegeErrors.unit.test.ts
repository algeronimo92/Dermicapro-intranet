import { Request, Response } from 'express';
import { dbRoleContext } from '../../config/dbRoleContext';
import { dbPrivilegeErrors } from '../dbPrivilegeErrors';

function fakeResponse() {
  const sent: { status?: number; body?: unknown } = {};
  const res = {
    locals: {},
    status(code: number) { sent.status = code; return res; },
    json(body: unknown) { sent.body = body; return res; },
  };
  return { res: res as unknown as Response, sent };
}

describe('dbPrivilegeErrors', () => {
  it('convierte un 500 por privilegios en 403 con mensaje claro', () => {
    const { res, sent } = fakeResponse();
    dbPrivilegeErrors({} as Request, res, () => undefined);
    dbRoleContext.run({ dbRole: 'app_sales', deniedTable: 'patients' }, () => {
      res.status(500).json({ error: 'Error al obtener pacientes' });
    });
    expect(sent.status).toBe(403);
    expect(sent.body).toMatchObject({ code: 'DB_PRIVILEGE_DENIED', table: 'patients' });
    expect((sent.body as { error: string }).error).toContain('Pacientes');
  });

  it('deja intactos los 500 que no son de privilegios', () => {
    const { res, sent } = fakeResponse();
    dbPrivilegeErrors({} as Request, res, () => undefined);
    dbRoleContext.run({ dbRole: 'app_sales' }, () => {
      res.status(500).json({ error: 'otro error' });
    });
    expect(sent).toEqual({ status: 500, body: { error: 'otro error' } });
  });

  it('no altera respuestas exitosas', () => {
    const { res, sent } = fakeResponse();
    dbPrivilegeErrors({} as Request, res, () => undefined);
    dbRoleContext.run({ dbRole: 'app_sales', deniedTable: 'patients' }, () => {
      res.status(200).json({ ok: true });
    });
    expect(sent).toEqual({ status: 200, body: { ok: true } });
  });
});

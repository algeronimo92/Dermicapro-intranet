import { Request, Response } from 'express';
import { requireCrmToken } from '../integrationAuth';

function request(authorization?: string) {
  return { headers: authorization ? { authorization } : {} } as Request;
}

function response() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response & { status: jest.Mock; json: jest.Mock };
}

describe('Token de la integración con el CRM', () => {
  const original = process.env.CRM_INTEGRATION_TOKEN;

  afterEach(() => {
    if (original === undefined) delete process.env.CRM_INTEGRATION_TOKEN;
    else process.env.CRM_INTEGRATION_TOKEN = original;
  });

  it('deja el endpoint cerrado si el ERP no tiene token configurado', () => {
    delete process.env.CRM_INTEGRATION_TOKEN;
    const res = response();
    const next = jest.fn();

    requireCrmToken(request('Bearer cualquiera'), res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    ['sin cabecera', undefined],
    ['con otro token', 'Bearer otro-token'],
    ['con un token más largo que empieza igual', 'Bearer secreto-del-crm-y-algo-mas'],
    ['sin el prefijo Bearer', 'secreto-del-crm'],
    ['con el token vacío', 'Bearer '],
  ])('rechaza la petición %s', (_caso, authorization) => {
    process.env.CRM_INTEGRATION_TOKEN = 'secreto-del-crm';
    const res = response();
    const next = jest.fn();

    requireCrmToken(request(authorization), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('deja pasar el token correcto', () => {
    process.env.CRM_INTEGRATION_TOKEN = 'secreto-del-crm';
    const res = response();
    const next = jest.fn();

    requireCrmToken(request('Bearer secreto-del-crm'), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

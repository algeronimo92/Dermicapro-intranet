import { Request, Response } from 'express';
import { checkCrmToken } from '../../services/crmIntegrationConfig.service';
import { requireCrmToken } from '../integrationAuth';

jest.mock('../../services/crmIntegrationConfig.service', () => ({ checkCrmToken: jest.fn() }));

const check = checkCrmToken as jest.Mock;

function request(authorization?: string) {
  return { headers: authorization ? { authorization } : {}, method: 'POST', originalUrl: '/api/integrations/crm/appointments' } as Request;
}

function response() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response & { status: jest.Mock; json: jest.Mock };
}

describe('Token de la integración con el CRM', () => {
  beforeEach(() => jest.resetAllMocks());

  it('deja el endpoint cerrado si nadie generó un token en Configuración', async () => {
    check.mockResolvedValue('not_configured');
    const res = response();
    const next = jest.fn();

    await requireCrmToken(request('Bearer cualquiera'), res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
  });

  it('rechaza un token que no es el generado', async () => {
    check.mockResolvedValue('invalid');
    const res = response();
    const next = jest.fn();

    await requireCrmToken(request('Bearer otro-token'), res, next);

    expect(check).toHaveBeenCalledWith('otro-token');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    ['sin cabecera', undefined],
    ['sin el prefijo Bearer', 'erp_crm_abc'],
    ['con el token vacío', 'Bearer '],
  ])('trata como token vacío la petición %s', async (_caso, authorization) => {
    check.mockResolvedValue('invalid');
    const res = response();

    await requireCrmToken(request(authorization), res, jest.fn());

    expect(check).toHaveBeenCalledWith('');
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('deja pasar el token correcto', async () => {
    check.mockResolvedValue('ok');
    const res = response();
    const next = jest.fn();

    await requireCrmToken(request('Bearer erp_crm_abc'), res, next);

    expect(check).toHaveBeenCalledWith('erp_crm_abc');
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('no deja pasar si no se pudo consultar el token guardado', async () => {
    check.mockRejectedValue(new Error('base caída'));
    const res = response();
    const next = jest.fn();
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});

    await requireCrmToken(request('Bearer erp_crm_abc'), res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
    log.mockRestore();
  });
});

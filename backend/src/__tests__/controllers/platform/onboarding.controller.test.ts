import { Request, Response } from 'express';
import { registerTenantHandler } from '../../../controllers/platform/onboarding.controller';
import * as provisionModule from '../../../platform/provision';
import * as emailModule from '../../../platform/email';

jest.mock('../../../platform/provision');
jest.mock('../../../platform/email');

const mockTenant = {
  id: 't1', name: 'Clínica Test', slug: 'clinica_test', isActive: true,
  contactEmail: 'admin@test.com', contactPhone: null, logoUrl: null,
  createdAt: new Date(), updatedAt: new Date(),
};
const mockProvisionResult = { tenant: mockTenant, migrationsApplied: 55, adminCreated: true };

function makeRes() {
  const json = jest.fn().mockReturnThis();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json } as unknown as Response;
}
function makeReq(body = {}): Request {
  return { body } as unknown as Request;
}

const validBody = {
  name: 'Clínica Test',
  slug: 'clinica_test',
  adminEmail: 'admin@test.com',
  adminFirstName: 'Ana',
  adminLastName: 'López',
};

describe('registerTenantHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when required fields are missing', async () => {
    const res = makeRes();
    await registerTenantHandler(makeReq({ name: 'Test' }), res);
    expect(res.status as jest.Mock).toHaveBeenCalledWith(400);
  });

  it('provisions tenant and returns 201 with credentials', async () => {
    (provisionModule.provisionTenant as jest.Mock).mockResolvedValue(mockProvisionResult);
    (emailModule.sendWelcomeEmail as jest.Mock).mockResolvedValue(undefined);

    const res = makeRes();
    await registerTenantHandler(makeReq(validBody), res);

    expect(provisionModule.provisionTenant).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Clínica Test', slug: 'clinica_test', adminEmail: 'admin@test.com' }),
    );
    expect(res.status as jest.Mock).toHaveBeenCalledWith(201);
    const jsonCall = (res.status as jest.Mock).mock.results[0].value.json.mock.calls[0][0];
    expect(jsonCall.data).toMatchObject({
      tenant: mockTenant,
      adminEmail: 'admin@test.com',
      tempPassword: expect.stringMatching(/^[0-9a-f]{16}$/),
      loginUrl: expect.stringContaining('clinica_test'),
      migrationsApplied: 55,
    });
  });

  it('fires welcome email as fire-and-forget', async () => {
    (provisionModule.provisionTenant as jest.Mock).mockResolvedValue(mockProvisionResult);
    (emailModule.sendWelcomeEmail as jest.Mock).mockResolvedValue(undefined);

    const res = makeRes();
    await registerTenantHandler(makeReq(validBody), res);

    expect(emailModule.sendWelcomeEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'admin@test.com', clinicName: 'Clínica Test' }),
    );
  });

  it('returns 409 when slug already exists', async () => {
    (provisionModule.provisionTenant as jest.Mock).mockRejectedValue(
      new Error('Ya existe un tenant con el slug "clinica_test"'),
    );
    const res = makeRes();
    await registerTenantHandler(makeReq(validBody), res);
    expect(res.status as jest.Mock).toHaveBeenCalledWith(409);
  });

  it('returns 400 when slug is invalid', async () => {
    (provisionModule.provisionTenant as jest.Mock).mockRejectedValue(
      new Error('Slug inválido: mi-slug'),
    );
    const res = makeRes();
    await registerTenantHandler(makeReq({ ...validBody, slug: 'mi-slug' }), res);
    expect(res.status as jest.Mock).toHaveBeenCalledWith(400);
  });

  it('returns 500 on unexpected provisioning error', async () => {
    (provisionModule.provisionTenant as jest.Mock).mockRejectedValue(new Error('DB connection lost'));
    const res = makeRes();
    await registerTenantHandler(makeReq(validBody), res);
    expect(res.status as jest.Mock).toHaveBeenCalledWith(500);
  });
});

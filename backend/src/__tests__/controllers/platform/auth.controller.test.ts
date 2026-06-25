import { Request, Response } from 'express';
import { platformLogin, getPlatformAdminMe } from '../../../controllers/platform/auth.controller';
import * as queriesModule from '../../../platform/queries';
import * as platformJwt from '../../../platform/jwt';
import bcrypt from 'bcrypt';

jest.mock('../../../platform/queries');
jest.mock('../../../platform/jwt');
jest.mock('bcrypt');

function makeRes() {
  const json = jest.fn().mockReturnThis();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json } as unknown as Response;
}

function makeReq(body = {}, extra = {}): Request {
  return { body, ...extra } as unknown as Request;
}

describe('platformLogin', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when email or password is missing', async () => {
    const res = makeRes();
    await platformLogin(makeReq({ email: 'a@b.com' }), res);
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(400);
  });

  it('returns 401 when admin not found', async () => {
    (queriesModule.findPlatformAdminByEmail as jest.Mock).mockResolvedValue(null);
    const res = makeRes();
    await platformLogin(makeReq({ email: 'no@one.com', password: 'pass' }), res);
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(401);
  });

  it('returns 401 when password is wrong', async () => {
    (queriesModule.findPlatformAdminByEmail as jest.Mock).mockResolvedValue({
      id: 'a1', email: 'admin@platform.com', passwordHash: 'hash',
      firstName: 'Super', lastName: 'Admin', isActive: true, createdAt: new Date(),
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    const res = makeRes();
    await platformLogin(makeReq({ email: 'admin@platform.com', password: 'wrong' }), res);
    expect((res.status as jest.Mock)).toHaveBeenCalledWith(401);
  });

  it('returns 200 with token and admin info on success', async () => {
    const admin = {
      id: 'a1', email: 'admin@platform.com', passwordHash: 'hash',
      firstName: 'Super', lastName: 'Admin', isActive: true, createdAt: new Date(),
    };
    (queriesModule.findPlatformAdminByEmail as jest.Mock).mockResolvedValue(admin);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (platformJwt.generatePlatformAdminToken as jest.Mock).mockReturnValue('mock-token');
    const res = makeRes();
    await platformLogin(makeReq({ email: admin.email, password: 'correct' }), res);
    expect(res.json as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'mock-token', admin: expect.objectContaining({ id: 'a1' }) })
    );
  });
});

describe('getPlatformAdminMe', () => {
  it('returns platformAdmin id and email from req', async () => {
    const req = makeReq({}, { platformAdmin: { id: 'a1', email: 'super@platform.com', role: 'platform_admin' } });
    const res = makeRes();
    await getPlatformAdminMe(req, res);
    expect(res.json as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a1', email: 'super@platform.com' })
    );
  });
});

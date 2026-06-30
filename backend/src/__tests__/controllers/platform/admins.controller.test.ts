import { Request, Response } from 'express';

const mockQuery = jest.fn();
jest.mock('../../../platform/db', () => ({ __esModule: true, default: { query: (...a: any[]) => mockQuery(...a) } }));
jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('hashed') }));

import { listPlatformAdminsHandler, createPlatformAdminHandler, deactivatePlatformAdminHandler } from '../../../controllers/platform/admins.controller';

const makeRes = () => ({ json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() } as unknown as Response);

describe('listPlatformAdminsHandler', () => {
  it('returns list of admins', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: '1', email: 'a@b.com', first_name: 'A', last_name: 'B', is_active: true, created_at: new Date() }] });
    const res = makeRes();
    await listPlatformAdminsHandler({} as Request, res);
    expect(res.json).toHaveBeenCalledWith({ data: expect.arrayContaining([expect.objectContaining({ email: 'a@b.com' })]) });
  });
});

describe('createPlatformAdminHandler', () => {
  it('creates admin and returns 201', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: '2', email: 'new@b.com', first_name: 'N', last_name: 'E', is_active: true, created_at: new Date() }] });
    const req = { body: { email: 'new@b.com', password: 'pass', firstName: 'N', lastName: 'E' } } as Request;
    const res = makeRes();
    await createPlatformAdminHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ data: expect.objectContaining({ email: 'new@b.com' }) });
  });

  it('returns 400 when required fields missing', async () => {
    const req = { body: {} } as Request;
    const res = makeRes();
    await createPlatformAdminHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('deactivatePlatformAdminHandler', () => {
  it('returns 204 on success', async () => {
    mockQuery.mockResolvedValue({ rowCount: 1, rows: [] });
    const req = { params: { id: '1' }, platformAdmin: { id: '99' } } as unknown as Request;
    const res = makeRes();
    await deactivatePlatformAdminHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });

  it('returns 400 if trying to deactivate self', async () => {
    const req = { params: { id: '1' }, platformAdmin: { id: '1' } } as unknown as Request;
    const res = makeRes();
    await deactivatePlatformAdminHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

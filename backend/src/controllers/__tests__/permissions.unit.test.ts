import { Request, Response } from 'express';
import prisma from '../../config/database';
import { getStaffDirectory } from '../users.controller';
import { getAllCommissions } from '../commissions.controller';
jest.mock('../../config/database', () => ({ __esModule: true, default: {
  user: { findMany: jest.fn() },
  commission: { findMany: jest.fn(), count: jest.fn(), groupBy: jest.fn() },
} }));
function response() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response;
}
beforeEach(() => jest.clearAllMocks());
it('expone solo datos necesarios para el selector de asistentes', async () => {
  (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
  await getStaffDirectory({} as Request, response());
  expect(prisma.user.findMany).toHaveBeenCalledWith({
    where: { isActive: true, role: { name: { in: ['admin', 'medical_staff', 'sales', 'assistant'] } } },
    select: { id: true, firstName: true, lastName: true, photoUrl: true, role: { select: { name: true, displayName: true } } },
    orderBy: { firstName: 'asc' },
  });
});
it.each([{}, { salesPersonId: 'someone-else' }])('limita filas, conteos y totales del vendedor aunque manipule el filtro %j', async query => {
  (prisma.commission.findMany as jest.Mock).mockResolvedValue([]);
  (prisma.commission.count as jest.Mock).mockResolvedValue(0);
  (prisma.commission.groupBy as jest.Mock).mockResolvedValue([]);
  await getAllCommissions({ query, user: { id: 'self', roleName: 'sales' } } as unknown as Request, response());
  for (const fn of [prisma.commission.findMany, prisma.commission.count, prisma.commission.groupBy]) {
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ where: { salesPersonId: 'self' } }));
  }
});

import { Request, Response } from 'express';
import prisma from '../../config/database';
import { authorizeAppointment } from '../appointmentPermissions';

jest.mock('../../config/database', () => ({ __esModule: true, default: { appointment: { findUnique: jest.fn() } } }));
const find = prisma.appointment.findUnique as jest.Mock;
function response() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response;
}
beforeEach(() => jest.clearAllMocks());
it.each([
  ['sales', 'reserved', 'edit', { scheduledDate: '2026-12-01' }, true],
  ['medical_staff', 'in_progress', 'edit', { sessionOperations: {} }, true],
  ['sales', 'attended', 'edit', { scheduledDate: '2026-12-01', status: 'reserved' }, false],
  ['medical_staff', 'cancelled', 'edit', { durationMinutes: 60 }, false],
  ['assistant', 'reserved', 'edit', { status: 'in_progress' }, true],
  ['assistant', 'reserved', 'edit', { status: 'in_progress', sessionOperations: {} }, false],
  ['assistant', 'reserved', 'edit', { scheduledDate: '2026-12-01' }, false],
  ['admin', 'attended', 'edit', { sessionOperations: {} }, true],
  ['medical_staff', 'attended', 'attendees', {}, false],
  ['assistant', 'attended', 'attendees', {}, false],
  ['sales', 'attended', 'attendees', {}, true],
  ['assistant', 'in_progress', 'attendees', {}, true],
  ['sales', 'cancelled', 'attendees', {}, false],
  ['assistant', 'reserved', 'edit', { status: 'cancelled' }, false],
  ['assistant', 'reserved', 'edit', { status: 'no_show' }, false],
  ['sales', 'attended', 'edit', { status: 'in_progress' }, false],
  ['medical_staff', 'attended', 'edit', { status: 'in_progress' }, true],
  ['sales', 'cancelled', 'edit', { status: 'reserved' }, true],
  ['sales', 'no_show', 'edit', { status: 'in_progress' }, false],
  ['admin', 'no_show', 'edit', { status: 'in_progress' }, true],
  ['admin', 'reserved', 'edit', { status: 'invalid' }, false],
  ['assistant', 'reserved', 'receipt', {}, false],
  ['medical_staff', 'reserved', 'receipt', {}, false],
  ['sales', 'attended', 'receipt', {}, true],
  ['admin', 'cancelled', 'receipt', {}, false],
  ['medical_staff', 'in_progress', 'photos', {}, true],
  ['assistant', 'attended', 'photos', {}, true],
  ['admin', 'no_show', 'photos', {}, false],
  ['assistant', 'in_progress', 'attend', {}, true],
  ['sales', 'cancelled', 'attend', {}, false],
] as const)('%s: %s / %s', async (role, status, action, body, allowed) => {
  find.mockResolvedValue({ status });
  const req = { params: { id: 'appointment' }, user: { id: 'self', roleName: role }, body } as unknown as Request;
  const res = response();
  const next = jest.fn();
  await authorizeAppointment(action)(req, res, next);
  expect(find).toHaveBeenCalledWith({ where: { id: 'appointment' }, select: { status: true } });
  if (allowed) expect(next).toHaveBeenCalledTimes(1);
  else {
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  }
});
it('responde 404 sin ejecutar la operación si la cita no existe', async () => {
  find.mockResolvedValue(null);
  const res = response();
  const next = jest.fn();
  await authorizeAppointment('edit')({ params: { id: 'missing' }, user: { id: 'self', roleName: 'admin' } } as unknown as Request, res, next);
  expect(res.status).toHaveBeenCalledWith(404);
  expect(next).not.toHaveBeenCalled();
});

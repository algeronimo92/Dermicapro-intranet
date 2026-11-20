import express from 'express';
import { Server } from 'http';
import { AddressInfo } from 'net';
import prisma from '../../config/database';
import { verifyAccessToken } from '../../utils/jwt';
import usersRoutes from '../users.routes';
import appointmentsRoutes from '../appointments.routes';
import servicesRoutes from '../services.routes';
import commissionsRoutes from '../commissions.routes';
import analyticsRoutes from '../analytics.routes';
import paymentsRoutes from '../payments.routes';
import patientsRoutes from '../patients.routes';
import rolesRoutes from '../roles.routes';
import settingsRoutes from '../settings.routes';

// El rol de PostgreSQL de cada empleado se prueba aparte; aquí sólo importa la
// autorización de la API.
jest.mock('../../services/employeeDbRoles.service', () => ({
  ensureEmployeeDbRole: jest.fn(async () => null),
}));
jest.mock('../../config/database', () => ({ __esModule: true, default: { user: { findUnique: jest.fn() }, appointment: { findUnique: jest.fn() } } }));
jest.mock('../../utils/jwt', () => ({ verifyAccessToken: jest.fn() }));
jest.mock('../../middlewares/rateLimiter', () => ({ uploadLimiter: (_req: unknown, _res: unknown, next: () => void) => next() }));
jest.mock('../../middlewares/upload', () => {
  const pass = (_req: unknown, _res: unknown, next: () => void) => next();
  return { upload: { single: () => pass, array: () => pass }, receiptUpload: { array: () => pass }, processUpload: pass };
});

// Sustituye solo la operación final; las rutas y los controles de acceso son reales.
jest.mock('../../controllers/users.controller', () => new Proxy({}, {
  get: (_target, key) => key === '__esModule' ? true : (_req: unknown, res: express.Response) => res.json({ executed: true }),
}));

// Sustituye solo la operación final; las rutas y los controles de acceso son reales.
jest.mock('../../controllers/services.controller', () => new Proxy({}, {
  get: (_target, key) => key === '__esModule' ? true : (_req: unknown, res: express.Response) => res.json({ executed: true }),
}));

// Sustituye solo la operación final; las rutas y los controles de acceso son reales.
jest.mock('../../controllers/servicePackages.controller', () => new Proxy({}, {
  get: (_target, key) => key === '__esModule' ? true : (_req: unknown, res: express.Response) => res.json({ executed: true }),
}));

// Sustituye solo la operación final; las rutas y los controles de acceso son reales.
jest.mock('../../controllers/commissions.controller', () => new Proxy({}, {
  get: (_target, key) => key === '__esModule' ? true : (_req: unknown, res: express.Response) => res.json({ executed: true }),
}));

// Sustituye solo la operación final; las rutas y los controles de acceso son reales.
jest.mock('../../controllers/analytics.controller', () => new Proxy({}, {
  get: (_target, key) => key === '__esModule' ? true : (_req: unknown, res: express.Response) => res.json({ executed: true }),
}));

// Sustituye solo la operación final; las rutas y los controles de acceso son reales.
jest.mock('../../controllers/payments.controller', () => new Proxy({}, {
  get: (_target, key) => key === '__esModule' ? true : (_req: unknown, res: express.Response) => res.json({ executed: true }),
}));

// Sustituye solo la operación final; las rutas y los controles de acceso son reales.
jest.mock('../../controllers/patients.controller', () => new Proxy({}, {
  get: (_target, key) => key === '__esModule' ? true : (_req: unknown, res: express.Response) => res.json({ executed: true }),
}));

// Sustituye solo la operación final; las rutas y los controles de acceso son reales.
jest.mock('../../controllers/roles.controller', () => new Proxy({}, {
  get: (_target, key) => key === '__esModule' ? true : (_req: unknown, res: express.Response) => res.json({ executed: true }),
}));

// Sustituye solo la operación final; las rutas y los controles de acceso son reales.
jest.mock('../../controllers/settings.controller', () => new Proxy({}, {
  get: (_target, key) => key === '__esModule' ? true : (_req: unknown, res: express.Response) => res.json({ executed: true }),
}));

jest.mock('../../controllers/appointments.controller', () => new Proxy({}, {
  get: (_target, key) => key === '__esModule' ? true : (_req: unknown, res: express.Response) => res.json({ executed: true }),
}));

let server: Server;
let base: string;
const findUser = prisma.user.findUnique as jest.Mock;
beforeAll(async () => {
  const app = express();
  app.use(express.json());
  for (const [name, routes] of Object.entries({ appointments: appointmentsRoutes, users: usersRoutes, services: servicesRoutes, commissions: commissionsRoutes,
    analytics: analyticsRoutes, payments: paymentsRoutes, patients: patientsRoutes, roles: rolesRoutes, settings: settingsRoutes })) {
    app.use(`/api/${name}`, routes);
  }
  server = await new Promise<Server>(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });
beforeEach(() => {
  jest.clearAllMocks();
  // Un token viejo de admin no debe prevalecer sobre el rol actual.
  (verifyAccessToken as jest.Mock).mockReturnValue({ id: 'self', roleName: 'admin' });
});
function asRole(role: string | null) {
  findUser.mockResolvedValue({ id: 'self', email: 'staff@example.test', isActive: true, roleId: role, role: role ? { name: role } : null });
}
async function call(method: string, path: string, authenticated = true) {
  return fetch(base + '/api' + path, { method, headers: authenticated ? { authorization: 'Bearer test' } : {} });
}
const adminActions = [
  ['GET', '/users'], ['GET', '/users/other'], ['GET', '/users/other/stats'],
  ['POST', '/users'], ['PUT', '/users/self'], ['POST', '/users/other/deactivate'], ['POST', '/users/other/activate'],
  ['GET', '/roles'], ['POST', '/services'], ['PUT', '/services/service'], ['DELETE', '/services/service'],
  ['POST', '/services/service/restore'], ['POST', '/services/service/packages'],
  ['PUT', '/services/packages/package'], ['DELETE', '/services/packages/package'], ['POST', '/services/packages/package/restore'],
  ['GET', '/commissions/summary'], ['POST', '/commissions/commission/approve'], ['POST', '/commissions/commission/reject'],
  ['POST', '/commissions/commission/pay'], ['POST', '/commissions/commission/cancel'],
  ['POST', '/commissions/batch/approve'], ['POST', '/commissions/batch/pay'],
  ['GET', '/analytics/financial'], ['GET', '/analytics/executive'], ['GET', '/analytics/operations'],
  ['GET', '/analytics/sales'], ['GET', '/analytics/customers'], ['GET', '/analytics/services'],
  ['GET', '/payments'], ['PUT', '/payments/payment'], ['POST', '/payments/payment/void'],
  ['DELETE', '/appointments/appointment'], ['DELETE', '/patients/patient'], ['PATCH', '/settings'],
];
describe.each(['sales', 'medical_staff', 'assistant', 'accountant'])('peticiones directas como %s', role => {
  it.each(adminActions)('deniega %s %s', async (method, path) => {
    asRole(role);
    const res = await call(method, path);
    expect(res.status).toBe(403);
    expect(await res.json()).not.toHaveProperty('executed');
  });
});
it.each(adminActions)('permite al administrador %s %s', async (method, path) => {
  asRole('admin');
  const res = await call(method, path);
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ executed: true });
});
it.each(['sales', 'medical_staff', 'assistant'])('conserva directorio y foto propia de %s', async role => {
  asRole(role);
  expect((await call('GET', '/users/staff')).status).toBe(200);
  expect((await call('POST', '/users/self/photo')).status).toBe(200);
  expect((await call('POST', '/users/other/photo')).status).toBe(403);
  expect((await call('GET', '/services')).status).toBe(200);
});
it.each([null, 'unknown'])('rechaza cuentas sin rol válido: %s', async role => {
  asRole(role);
  expect((await call('GET', '/users/staff')).status).toBe(403);
});
it('rechaza peticiones sin token', async () => {
  expect((await call('PUT', '/users/self', false)).status).toBe(401);
});
it('rechaza tokens del portal de pacientes', async () => {
  (verifyAccessToken as jest.Mock).mockReturnValue({ id: 'self', type: 'patient' });
  expect((await call('GET', '/users/staff')).status).toBe(401);
});

it.each([
  ['POST', '/appointments/appointment/upload-receipt', 'reserved', 'medical_staff'],
  ['POST', '/appointments/appointment/attendees', 'attended', 'medical_staff'],
  ['DELETE', '/appointments/appointment/attendees/user', 'attended', 'assistant'],
  ['POST', '/appointments/appointment/add-photos', 'cancelled', 'sales'],
  ['DELETE', '/appointments/appointment/photos', 'no_show', 'admin'],
  ['POST', '/appointments/appointment/attend', 'cancelled', 'assistant'],
])('protege %s %s según estado y rol', async (method, path, status, role) => {
  asRole(role);
  (prisma.appointment.findUnique as jest.Mock).mockResolvedValue({ status });
  expect((await call(method, path)).status).toBe(403);
});

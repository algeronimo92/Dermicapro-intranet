import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { hashPassword } from '../../utils/password';
import {
  CrmAppointmentInput,
  createAppointmentFromCrm,
  normalizePhone,
  splitFullName,
} from '../crmAppointment.service';

jest.mock('../../config/database', () => {
  const db = {
    appointment: { findUnique: jest.fn(), create: jest.fn() },
    user: { findFirst: jest.fn() },
    servicePackage: { findFirst: jest.fn() },
    patient: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    serviceInstance: { create: jest.fn() },
    session: { create: jest.fn() },
    appointmentNote: { create: jest.fn() },
    payment: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  return { __esModule: true, default: db };
});
jest.mock('../../utils/password', () => ({ hashPassword: jest.fn() }));

type Mocked = Record<string, Record<string, jest.Mock>> & { $transaction: jest.Mock };
const db = prisma as unknown as Mocked;

const INPUT: CrmAppointmentInput = {
  externalId: 'dermicapro:412',
  patientName: 'Rosa María Quispe Flores',
  patientDni: '45678912',
  patientPhone: '51987654321',
  servicePackageId: 'pkg-3',
  scheduledDate: new Date('2026-11-20T20:30:00.000Z'),
  durationMinutes: 45,
  sellerEmail: 'grecia@dermicapro.com',
  sellerName: 'Grecia',
  notes: 'Viene por manchas',
};

const PACKAGE = { id: 'pkg-3', serviceId: 'svc-1', sessions: 3, price: new Prisma.Decimal('400.00') };

beforeEach(() => {
  jest.resetAllMocks();
  delete process.env.CRM_INTEGRATION_USER_EMAIL;
  (hashPassword as jest.Mock).mockImplementation(async (value: string) => `hash(${value})`);

  // La transacción corre contra el mismo doble: lo que se afirma es qué se crea.
  db.$transaction.mockImplementation(async (work: (tx: unknown) => unknown) => work(db));
  db.appointment.findUnique.mockResolvedValue(null);
  db.user.findFirst.mockResolvedValue({ id: 'user-grecia' });
  db.servicePackage.findFirst.mockResolvedValue(PACKAGE);
  db.patient.findUnique.mockResolvedValue(null);
  db.patient.create.mockResolvedValue({ id: 'patient-new' });
  db.appointment.create.mockResolvedValue({ id: 'apt-1' });
  db.serviceInstance.create.mockResolvedValue({ id: 'instance-1' });
});

describe('Nombre completo del CRM', () => {
  it.each([
    ['Rosa', 'Rosa', ''],
    ['Rosa Quispe', 'Rosa', 'Quispe'],
    ['Rosa Quispe Flores', 'Rosa', 'Quispe Flores'],
    ['  Rosa   María  Quispe Flores ', 'Rosa María', 'Quispe Flores'],
    ['María del Carmen Pérez López', 'María del Carmen', 'Pérez López'],
  ])('%s', (fullName, firstName, lastName) => {
    expect(splitFullName(fullName)).toEqual({ firstName, lastName });
  });
});

describe('Teléfono del CRM', () => {
  it.each([
    ['51987654321', '987654321'],
    ['+51 987 654 321', '987654321'],
    ['987654321', '987654321'],
    ['5491122334455', '5491122334455'],
    ['', undefined],
    [undefined, undefined],
  ])('%s', (received, stored) => {
    expect(normalizePhone(received)).toBe(stored);
  });
});

describe('Cita agendada en el CRM', () => {
  it('crea paciente, cita reservada, paquete y primera sesión', async () => {
    const result = await createAppointmentFromCrm(INPUT);

    expect(result).toEqual({
      appointmentId: 'apt-1', patientId: 'patient-new', patientCreated: true, created: true,
    });
    expect(db.patient.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        firstName: 'Rosa María', lastName: 'Quispe Flores', dni: '45678912', phone: '987654321',
        createdById: 'user-grecia', passwordHash: 'hash(45678912)', hasPortalAccess: true,
      }),
    }));
    // Sin fecha de nacimiento ni sexo: recepción los completa.
    const patientData = db.patient.create.mock.calls[0][0].data;
    expect(patientData).not.toHaveProperty('dateOfBirth');
    expect(patientData).not.toHaveProperty('sex');

    expect(db.appointment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        patientId: 'patient-new', scheduledDate: INPUT.scheduledDate, durationMinutes: 45,
        createdById: 'user-grecia', status: 'reserved', externalSource: 'crm', externalId: 'dermicapro:412',
      },
    }));
    expect(db.serviceInstance.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        patientId: 'patient-new', serviceId: 'svc-1', servicePackageId: 'pkg-3', totalSessions: 3,
        originalPrice: PACKAGE.price, finalPrice: PACKAGE.price, discount: 0,
      }),
    }));
    expect(db.session.create).toHaveBeenCalledWith({
      data: { appointmentId: 'apt-1', serviceInstanceId: 'instance-1', sessionNumber: 1 },
    });
    expect(db.appointmentNote.create).toHaveBeenCalledWith({
      data: {
        appointmentId: 'apt-1', createdById: 'user-grecia',
        note: 'Agendada desde el CRM por Grecia.\nViene por manchas',
      },
    });
    expect(db.payment.create).not.toHaveBeenCalled();
  });

  it('usa al paciente que ya existe con ese DNI sin pisar sus datos', async () => {
    db.patient.findUnique.mockResolvedValue({ id: 'patient-old', phone: '999111222' });

    const result = await createAppointmentFromCrm(INPUT);

    expect(result).toMatchObject({ patientId: 'patient-old', patientCreated: false, created: true });
    expect(db.patient.create).not.toHaveBeenCalled();
    expect(db.patient.update).not.toHaveBeenCalled();
  });

  it('completa el teléfono de un paciente que no lo tenía', async () => {
    db.patient.findUnique.mockResolvedValue({ id: 'patient-old', phone: null });

    await createAppointmentFromCrm(INPUT);

    expect(db.patient.update).toHaveBeenCalledWith({ where: { id: 'patient-old' }, data: { phone: '987654321' } });
  });

  it('registra el adelanto como pago de reserva y lo suma al saldo', async () => {
    await createAppointmentFromCrm({
      ...INPUT, reservation: { amount: 50, method: 'yape', receiptUrl: '/uploads/abc.webp' },
    });

    expect(db.payment.create).toHaveBeenCalledWith({
      data: {
        patientId: 'patient-new', appointmentId: 'apt-1', amountPaid: 50, paymentMethod: 'yape',
        paymentType: 'reservation', receiptUrl: '/uploads/abc.webp', receiptUrls: ['/uploads/abc.webp'],
        createdById: 'user-grecia',
      },
    });
    expect(db.patient.update).toHaveBeenCalledWith({
      where: { id: 'patient-new' }, data: { accountBalance: { increment: 50 } },
    });
  });

  it('registra el adelanto aunque no haya comprobante', async () => {
    await createAppointmentFromCrm({ ...INPUT, reservation: { amount: 30, method: 'cash' } });

    expect(db.payment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ amountPaid: 30, receiptUrl: null, receiptUrls: [] }),
    }));
  });

  it('devuelve la misma cita cuando el CRM repite el envío', async () => {
    db.appointment.findUnique.mockResolvedValue({ id: 'apt-1', patientId: 'patient-new' });

    const result = await createAppointmentFromCrm({
      ...INPUT, reservation: { amount: 50, method: 'yape' },
    });

    expect(result).toEqual({
      appointmentId: 'apt-1', patientId: 'patient-new', patientCreated: false, created: false,
    });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.payment.create).not.toHaveBeenCalled();
  });

  it('devuelve la cita del otro envío cuando dos llegan a la vez', async () => {
    db.appointment.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'apt-otro', patientId: 'patient-new' });
    db.appointment.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicado', { code: 'P2002', clientVersion: 'test' })
    );

    const result = await createAppointmentFromCrm(INPUT);

    expect(result).toMatchObject({ appointmentId: 'apt-otro', created: false });
  });

  it('rechaza un paquete que ya no está en el catálogo', async () => {
    db.servicePackage.findFirst.mockResolvedValue(null);

    await expect(createAppointmentFromCrm(INPUT)).rejects.toMatchObject({ statusCode: 422 });
    expect(db.appointment.create).not.toHaveBeenCalled();
    expect(db.patient.create).not.toHaveBeenCalled();
  });

  it('deja la cita a nombre del usuario de integración si el vendedor no existe en el ERP', async () => {
    process.env.CRM_INTEGRATION_USER_EMAIL = 'admin@dermicapro.com';
    db.user.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'user-admin' });

    await createAppointmentFromCrm(INPUT);

    expect(db.user.findFirst).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { email: { equals: 'admin@dermicapro.com', mode: 'insensitive' }, isActive: true },
    }));
    expect(db.appointment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ createdById: 'user-admin' }),
    }));
  });

  it('rechaza la cita si no hay a nombre de quién registrarla', async () => {
    db.user.findFirst.mockResolvedValue(null);

    await expect(createAppointmentFromCrm(INPUT)).rejects.toMatchObject({ statusCode: 422 });
    expect(db.appointment.create).not.toHaveBeenCalled();
  });
});

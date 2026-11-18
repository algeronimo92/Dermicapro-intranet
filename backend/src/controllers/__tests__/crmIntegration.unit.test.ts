import { parseCrmAppointment } from '../crmIntegration.controller';

jest.mock('../../config/database', () => ({ __esModule: true, default: {} }));

const BODY = {
  externalId: 'dermicapro:412',
  patientName: '  Rosa María Quispe Flores ',
  patientDni: '4567 8912',
  patientPhone: '51987654321',
  servicePackageId: 'pkg-1',
  scheduledDate: '2026-11-20T15:30:00-05:00',
};

const file = { filename: 'abc.webp', path: '/tmp/abc.webp' } as Express.Multer.File;

describe('Datos de una cita que envía el CRM', () => {
  it('lee los campos mínimos y aplica los valores por defecto', () => {
    const input = parseCrmAppointment(BODY);

    expect(input).toMatchObject({
      externalId: 'dermicapro:412',
      patientName: 'Rosa María Quispe Flores',
      patientDni: '45678912',
      servicePackageId: 'pkg-1',
      durationMinutes: 60,
      reservation: undefined,
    });
    // 15:30 en Lima son las 20:30 UTC.
    expect(input.scheduledDate.toISOString()).toBe('2026-11-20T20:30:00.000Z');
  });

  it.each([
    ['externalId', { externalId: '' }],
    ['el nombre', { patientName: '   ' }],
    ['el DNI', { patientDni: '' }],
    ['un DNI demasiado corto', { patientDni: '123' }],
    ['un documento que no es un DNI de 8 dígitos', { patientDni: 'CE001234567' }],
    ['el paquete', { servicePackageId: '' }],
    ['la fecha', { scheduledDate: '' }],
    ['una fecha sin zona horaria', { scheduledDate: '2026-11-20T15:30:00' }],
    ['una fecha ilegible', { scheduledDate: 'mañana-05:00' }],
    ['una duración fuera de rango', { durationMinutes: '2' }],
    ['un monto negativo', { reservationAmount: '-5' }],
  ])('rechaza la cita si falta o es inválido: %s', (_campo, override) => {
    expect(() => parseCrmAppointment({ ...BODY, ...override })).toThrow(
      expect.objectContaining({ statusCode: 400 })
    );
  });

  it('exige el método de pago cuando hay adelanto', () => {
    expect(() => parseCrmAppointment({ ...BODY, reservationAmount: '50.00' })).toThrow(
      expect.objectContaining({ statusCode: 400 })
    );
    // El saldo a favor no es dinero que entra: no vale como método del adelanto.
    expect(() =>
      parseCrmAppointment({ ...BODY, reservationAmount: '50', reservationPaymentMethod: 'account_credit' })
    ).toThrow(expect.objectContaining({ statusCode: 400 }));
  });

  it('arma el adelanto con su comprobante', () => {
    const input = parseCrmAppointment(
      { ...BODY, reservationAmount: '50.005', reservationPaymentMethod: 'yape' },
      file
    );

    expect(input.reservation).toEqual({ amount: 50.01, method: 'yape', receiptUrl: '/uploads/abc.webp' });
  });

  it('ignora método y comprobante cuando no hay adelanto', () => {
    const input = parseCrmAppointment({ ...BODY, reservationAmount: '0', reservationPaymentMethod: 'yape' }, file);

    expect(input.reservation).toBeUndefined();
  });
});

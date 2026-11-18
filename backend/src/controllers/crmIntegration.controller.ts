import fs from 'fs';
import { Request, Response } from 'express';
import { PaymentMethod } from '@prisma/client';
import { AppError, logUnexpectedError } from '../middlewares/errorHandler';
import {
  CRM_PAYMENT_METHODS,
  CrmAppointmentInput,
  createAppointmentFromCrm,
} from '../services/crmAppointment.service';

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

// Una fecha sin zona horaria se leería en la hora del servidor (UTC) y la cita
// aparecería cinco horas corrida en la agenda: se exige el offset.
const HAS_UTC_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/i;

function parseScheduledDate(value: unknown): Date {
  const raw = text(value);
  if (!raw) throw new AppError('Falta scheduledDate', 400);
  const date = new Date(raw);
  if (!HAS_UTC_OFFSET.test(raw) || Number.isNaN(date.getTime())) {
    throw new AppError('scheduledDate debe ser una fecha ISO 8601 con zona horaria (ej. 2026-11-20T15:30:00-05:00)', 400);
  }
  return date;
}

function parseDuration(value: unknown): number {
  const raw = text(value);
  if (!raw) return 60;
  const minutes = Number(raw);
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 1440) {
    throw new AppError('durationMinutes debe ser un entero entre 5 y 1440', 400);
  }
  return minutes;
}

function parseReservation(body: Request['body'], file: Express.Multer.File | undefined) {
  const rawAmount = text(body.reservationAmount);
  const amount = rawAmount ? Number(rawAmount) : 0;
  if (!Number.isFinite(amount) || amount < 0) {
    throw new AppError('reservationAmount debe ser un monto válido', 400);
  }
  // Sin adelanto no hay pago que registrar: el método y el comprobante que
  // pudieran venir se ignoran.
  if (amount === 0) return undefined;

  const method = text(body.reservationPaymentMethod) as PaymentMethod;
  if (!CRM_PAYMENT_METHODS.includes(method)) {
    throw new AppError(
      `reservationPaymentMethod es obligatorio cuando hay adelanto (${CRM_PAYMENT_METHODS.join(', ')})`,
      400
    );
  }

  return {
    amount: Math.round(amount * 100) / 100,
    method,
    receiptUrl: file ? `/uploads/${file.filename}` : undefined,
  };
}

export function parseCrmAppointment(body: Request['body'], file?: Express.Multer.File): CrmAppointmentInput {
  const externalId = text(body.externalId);
  if (!externalId || externalId.length > 100) {
    throw new AppError('externalId es obligatorio (hasta 100 caracteres)', 400);
  }

  const patientName = text(body.patientName);
  if (!patientName || patientName.length > 200) {
    throw new AppError('Falta el nombre del paciente', 400);
  }

  // La misma regla que la ficha de paciente del ERP (CreatePatientModal): 8
  // dígitos. Aceptar aquí otro documento crearía una ficha que después no se
  // puede guardar al completarla.
  const patientDni = text(body.patientDni).replace(/[\s.-]/g, '');
  if (!/^\d{8}$/.test(patientDni)) {
    throw new AppError('El DNI del paciente es obligatorio y debe tener 8 dígitos', 400);
  }

  const servicePackageId = text(body.servicePackageId);
  if (!servicePackageId) {
    throw new AppError('Falta servicePackageId (el paquete del catálogo del ERP)', 400);
  }

  return {
    externalId,
    patientName,
    patientDni,
    patientPhone: text(body.patientPhone) || undefined,
    servicePackageId,
    scheduledDate: parseScheduledDate(body.scheduledDate),
    durationMinutes: parseDuration(body.durationMinutes),
    sellerEmail: text(body.sellerEmail) || undefined,
    sellerName: text(body.sellerName) || undefined,
    notes: text(body.notes).slice(0, 5000) || undefined,
    reservation: parseReservation(body, file),
  };
}

function discard(file: Express.Multer.File | undefined): void {
  if (!file) return;
  try {
    fs.unlinkSync(file.path);
  } catch {
    /* ya no está */
  }
}

/** GET /api/integrations/crm/ping — "Probar conexión" del CRM: URL y token correctos. */
export const ping = (_req: Request, res: Response): void => {
  res.json({ data: { ok: true } });
};

/** POST /api/integrations/crm/appointments */
export const createAppointment = async (req: Request, res: Response): Promise<void> => {
  const file = req.file;

  try {
    const input = parseCrmAppointment(req.body ?? {}, file);
    const result = await createAppointmentFromCrm(input);

    // El comprobante solo queda guardado si acompaña a un pago recién creado:
    // en un reenvío el pago ya tiene el suyo, y sin adelanto no hay dónde
    // colgarlo.
    if (!result.created || !input.reservation) discard(file);

    res.status(result.created ? 201 : 200).json({
      data: {
        appointmentId: result.appointmentId,
        patientId: result.patientId,
        patientCreated: result.patientCreated,
      },
    });
  } catch (error) {
    discard(file);
    logUnexpectedError(req, error);
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al registrar la cita del CRM' });
    }
  }
};

import { PaymentMethod, Prisma } from '@prisma/client';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { hashPassword } from '../utils/password';

/**
 * Citas que agenda el CRM (sugerencias-chat) y que deben aparecer en la agenda
 * del ERP como una cita más: con paciente, paquete, sesión y adelanto.
 *
 * El CRM manda lo que sabe de un lead (nombre, DNI, teléfono, el paquete que
 * eligió del catálogo que copia de /api/public/catalog) y este servicio lo
 * convierte en los mismos registros que crea el formulario de citas del ERP.
 * Todo ocurre en una transacción: o queda la cita completa o no queda nada.
 */

export const CRM_SOURCE = 'crm';

/** Métodos con los que el CRM puede declarar un adelanto. `account_credit` no:
 *  es saldo que ya está en el ERP, no dinero que entra. */
export const CRM_PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'transfer', 'yape', 'plin'];

export interface CrmReservation {
  amount: number;
  method: PaymentMethod;
  /** Ruta pública del comprobante ya guardado (`/uploads/...`), si lo mandaron. */
  receiptUrl?: string;
}

export interface CrmAppointmentInput {
  externalId: string;
  patientName: string;
  patientDni: string;
  patientPhone?: string;
  servicePackageId: string;
  scheduledDate: Date;
  durationMinutes: number;
  sellerEmail?: string;
  sellerName?: string;
  notes?: string;
  reservation?: CrmReservation;
}

export interface CrmAppointmentResult {
  appointmentId: string;
  patientId: string;
  /** El paciente no existía y se creó con los datos del CRM. */
  patientCreated: boolean;
  /** false cuando la cita ya existía: el CRM repitió un envío. */
  created: boolean;
}

/**
 * Configuración de la integración. Vive en un solo sitio a propósito: hoy son
 * variables de entorno porque el ERP atiende a una sola clínica; cuando sea
 * multiempresa, el token y el usuario pasan a ser de cada negocio y solo
 * cambia esta función (y `requireCrmToken`).
 */
export function crmFallbackUserEmail(): string {
  return (process.env.CRM_INTEGRATION_USER_EMAIL ?? '').trim();
}

/**
 * Parte "Nombres Apellido1 Apellido2" en nombres y apellidos.
 *
 * El CRM guarda el nombre en un solo campo. En Perú lo habitual son dos
 * apellidos, así que con tres palabras o más las dos últimas son los
 * apellidos. No acierta siempre ("Juan de la Cruz"): recepción lo corrige en
 * la ficha, que queda marcada como "datos por completar".
 */
export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return { firstName: words[0] ?? '', lastName: '' };
  if (words.length === 2) return { firstName: words[0], lastName: words[1] };
  return {
    firstName: words.slice(0, -2).join(' '),
    lastName: words.slice(-2).join(' '),
  };
}

/**
 * El CRM manda el teléfono como lo usa WhatsApp (51987654321). En el ERP los
 * celulares se guardan como los escribe recepción, con sus 9 dígitos, y así
 * los encuentra el buscador de pacientes.
 */
export function normalizePhone(phone: string | undefined): string | undefined {
  const raw = (phone ?? '').trim();
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, '');
  if (/^51\d{9}$/.test(digits)) return digits.slice(2);
  return digits || undefined;
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

async function findExisting(externalId: string): Promise<CrmAppointmentResult | null> {
  const existing = await prisma.appointment.findUnique({
    where: { externalSource_externalId: { externalSource: CRM_SOURCE, externalId } },
    select: { id: true, patientId: true },
  });
  if (!existing) return null;
  return { appointmentId: existing.id, patientId: existing.patientId, patientCreated: false, created: false };
}

/**
 * A nombre de quién queda la cita. El vendedor del CRM, si tiene usuario en el
 * ERP con el mismo correo: así la comisión que se genera al atender la cita es
 * suya. Si no, el usuario configurado para la integración.
 */
async function resolveUser(tx: Prisma.TransactionClient, sellerEmail: string | undefined): Promise<string> {
  const candidates = [sellerEmail?.trim(), crmFallbackUserEmail()].filter(
    (email): email is string => Boolean(email)
  );

  for (const email of candidates) {
    const user = await tx.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, isActive: true },
      select: { id: true },
    });
    if (user) return user.id;
  }

  throw new AppError(
    sellerEmail
      ? `El vendedor ${sellerEmail} no tiene usuario activo en el ERP y no hay un usuario de integración configurado`
      : 'No hay un usuario de integración configurado en el ERP para registrar la cita',
    422
  );
}

async function resolvePatient(
  tx: Prisma.TransactionClient,
  input: CrmAppointmentInput,
  userId: string
): Promise<{ id: string; created: boolean }> {
  const phone = normalizePhone(input.patientPhone);
  const existing = await tx.patient.findUnique({
    where: { dni: input.patientDni },
    select: { id: true, phone: true },
  });

  if (existing) {
    // Lo que ya está en la ficha del ERP manda; solo se completa el teléfono
    // que faltaba.
    if (!existing.phone && phone) {
      await tx.patient.update({ where: { id: existing.id }, data: { phone } });
    }
    return { id: existing.id, created: false };
  }

  const { firstName, lastName } = splitFullName(input.patientName);
  // Igual que el alta manual (patients.controller.ts): el DNI es la clave
  // inicial del portal de pacientes.
  const passwordHash = await hashPassword(input.patientDni);

  const patient = await tx.patient.create({
    data: {
      firstName,
      lastName,
      dni: input.patientDni,
      phone,
      createdById: userId,
      passwordHash,
      hasPortalAccess: true,
      passwordSetByStaffId: userId,
      passwordSetAt: new Date(),
    },
    select: { id: true },
  });

  return { id: patient.id, created: true };
}

function appointmentNote(input: CrmAppointmentInput): string {
  const seller = input.sellerName?.trim();
  const lines = [seller ? `Agendada desde el CRM por ${seller}.` : 'Agendada desde el CRM.'];
  const notes = input.notes?.trim();
  if (notes) lines.push(notes);
  return lines.join('\n');
}

export async function createAppointmentFromCrm(input: CrmAppointmentInput): Promise<CrmAppointmentResult> {
  const already = await findExisting(input.externalId);
  if (already) return already;

  try {
    return await prisma.$transaction(async (tx) => {
      const userId = await resolveUser(tx, input.sellerEmail);

      const servicePackage = await tx.servicePackage.findFirst({
        where: {
          id: input.servicePackageId,
          isActive: true,
          deletedAt: null,
          service: { isActive: true, deletedAt: null },
        },
      });
      if (!servicePackage) {
        throw new AppError(
          'El paquete elegido ya no existe o está inactivo en el ERP. Sincroniza el catálogo en el CRM y vuelve a intentarlo',
          422
        );
      }

      const patient = await resolvePatient(tx, input, userId);

      const appointment = await tx.appointment.create({
        data: {
          patientId: patient.id,
          scheduledDate: input.scheduledDate,
          durationMinutes: input.durationMinutes,
          createdById: userId,
          status: 'reserved',
          externalSource: CRM_SOURCE,
          externalId: input.externalId,
        },
        select: { id: true },
      });

      // Una cita del CRM es siempre la primera sesión de un paquete nuevo. Si
      // en la consulta termina siendo otro servicio, se cambia desde el ERP.
      // El precio es el del ERP: el catálogo del CRM puede ir una hora atrás.
      const serviceInstance = await tx.serviceInstance.create({
        data: {
          patientId: patient.id,
          serviceId: servicePackage.serviceId,
          servicePackageId: servicePackage.id,
          totalSessions: servicePackage.sessions || 1,
          originalPrice: servicePackage.price,
          discount: 0,
          finalPrice: servicePackage.price,
          createdById: userId,
        },
        select: { id: true },
      });

      await tx.session.create({
        data: {
          appointmentId: appointment.id,
          serviceInstanceId: serviceInstance.id,
          sessionNumber: 1,
        },
      });

      await tx.appointmentNote.create({
        data: {
          appointmentId: appointment.id,
          note: appointmentNote(input),
          createdById: userId,
        },
      });

      // Mismo registro que deja "subir comprobante" en el ERP
      // (appointments.controller.ts, uploadReceipt): el adelanto es un pago de
      // reserva de la cita y queda como saldo a favor del paciente.
      if (input.reservation) {
        const { amount, method, receiptUrl } = input.reservation;
        await tx.payment.create({
          data: {
            patientId: patient.id,
            appointmentId: appointment.id,
            amountPaid: amount,
            paymentMethod: method,
            paymentType: 'reservation',
            receiptUrl: receiptUrl ?? null,
            receiptUrls: receiptUrl ? [receiptUrl] : [],
            createdById: userId,
          },
        });

        await tx.patient.update({
          where: { id: patient.id },
          data: { accountBalance: { increment: amount } },
        });
      }

      return {
        appointmentId: appointment.id,
        patientId: patient.id,
        patientCreated: patient.created,
        created: true,
      };
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;

    // Dos envíos de la misma cita a la vez (el CRM reintentó sin esperar la
    // respuesta): gana el primero y este devuelve lo que aquel creó.
    const winner = await findExisting(input.externalId);
    if (winner) return winner;

    // La colisión fue por el DNI: otra petición creó a ese paciente en el
    // mismo instante. Reintentar lo encuentra ya creado.
    throw new AppError('Se estaba registrando al mismo paciente en otra operación. Vuelve a intentarlo', 409);
  }
}

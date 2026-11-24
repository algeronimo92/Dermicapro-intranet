import { Prisma } from '@prisma/client';

/**
 * Filtro de los pagos que representan dinero que realmente entró a la clínica.
 * Úsalo en todo lo que sume pagos como ingreso ("Cobrado", ingresos por método,
 * tendencias, flujo de caja).
 *
 * - Los pagos anulados no cuentan.
 * - Los pagos con saldo a favor (`account_credit`) tampoco: ese dinero ya se
 *   contó cuando el paciente pagó la reserva o recargó saldo con efectivo, Yape,
 *   etc. Sumarlos otra vez al usar el saldo lo duplicaría.
 */
export const COLLECTED_PAYMENTS: Prisma.PaymentWhereInput = {
  voidedAt: null,
  paymentMethod: { not: 'account_credit' },
};

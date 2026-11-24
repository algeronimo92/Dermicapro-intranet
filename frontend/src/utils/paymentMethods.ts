import { PaymentMethod } from '../types';

// Nombres y emojis de los métodos de pago para mostrar en pantalla. Al ser
// Record<PaymentMethod, …>, si se agrega un método al enum TypeScript exige
// darle nombre aquí (así no vuelve a aparecer un código crudo como
// "account_credit" en un gráfico o un listado).
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.cash]: 'Efectivo',
  [PaymentMethod.card]: 'Tarjeta',
  [PaymentMethod.transfer]: 'Transferencia',
  [PaymentMethod.yape]: 'Yape',
  [PaymentMethod.plin]: 'Plin',
  [PaymentMethod.account_credit]: 'Saldo a favor',
};

export const PAYMENT_METHOD_ICONS: Record<PaymentMethod, string> = {
  [PaymentMethod.cash]: '💵',
  [PaymentMethod.card]: '💳',
  [PaymentMethod.transfer]: '🏦',
  [PaymentMethod.yape]: '📲',
  [PaymentMethod.plin]: '📱',
  [PaymentMethod.account_credit]: '💰',
};

/** Nombre legible de un método de pago que llega como texto desde la API. */
export const paymentMethodLabel = (method: string | null | undefined): string =>
  method ? PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method : '';

export const paymentMethodIcon = (method: string | null | undefined): string =>
  method ? PAYMENT_METHOD_ICONS[method as PaymentMethod] ?? '' : '';

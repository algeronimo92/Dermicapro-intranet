import { ServiceInstance } from '@prisma/client';
import { addDays } from '../utils/dateUtils';

interface CreatePaymentOrderDto {
  serviceInstanceIds: string[];
  patientId: string;
  createdById: string;
  dueDate?: Date;
}

/**
 * Factory Pattern para crear diferentes tipos de órdenes de pago
 */
export class PaymentOrderFactory {
  /**
   * Crea una orden de pago para una sola orden
   */
  static createSingleServiceInstancePaymentOrder(
    order: ServiceInstance,
    createdById: string,
    dueDate?: Date
  ): CreatePaymentOrderDto {
    return {
      serviceInstanceIds: [order.id],
      patientId: order.patientId,
      createdById,
      dueDate,
    };
  }

  /**
   * Crea una orden de pago consolidada para múltiples órdenes del mismo paciente
   */
  static createConsolidatedPaymentOrder(
    orders: ServiceInstance[],
    createdById: string,
    dueDate?: Date
  ): CreatePaymentOrderDto {
    if (orders.length === 0) {
      throw new Error('Debe proporcionar al menos una orden');
    }

    // Validar que todas las órdenes son del mismo paciente
    const patientId = orders[0].patientId;
    const allSamePatient = orders.every(o => o.patientId === patientId);

    if (!allSamePatient) {
      throw new Error('Todas las órdenes deben pertenecer al mismo paciente');
    }

    return {
      serviceInstanceIds: orders.map(o => o.id),
      patientId,
      createdById,
      dueDate,
    };
  }

  /**
   * Crea una orden de pago por IDs de órdenes seleccionadas
   * (útil cuando el usuario selecciona órdenes desde la UI)
   */
  static createFromServiceInstanceIds(
    serviceInstanceIds: string[],
    patientId: string,
    createdById: string,
    dueDate?: Date
  ): CreatePaymentOrderDto {
    if (serviceInstanceIds.length === 0) {
      throw new Error('Debe seleccionar al menos una orden');
    }

    return {
      serviceInstanceIds,
      patientId,
      createdById,
      dueDate,
    };
  }

  /**
   * Crea una orden de pago con fecha de vencimiento automática
   * (por ejemplo, 30 días desde hoy)
   */
  static createWithAutoPaymentDate(
    serviceInstanceIds: string[],
    patientId: string,
    createdById: string,
    daysUntilDue: number = 30
  ): CreatePaymentOrderDto {
    const dueDate = addDays(new Date(), daysUntilDue);

    return {
      serviceInstanceIds,
      patientId,
      createdById,
      dueDate,
    };
  }
}

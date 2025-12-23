import { Order } from '@prisma/client';
import { addDays } from '../utils/dateUtils';

interface CreateInvoiceDto {
  orderIds: string[];
  patientId: string;
  createdById: string;
  dueDate?: Date;
}

/**
 * Factory Pattern para crear diferentes tipos de facturas
 */
export class InvoiceFactory {
  /**
   * Crea una factura para una sola orden
   */
  static createSingleOrderInvoice(
    order: Order,
    createdById: string,
    dueDate?: Date
  ): CreateInvoiceDto {
    return {
      orderIds: [order.id],
      patientId: order.patientId,
      createdById,
      dueDate,
    };
  }

  /**
   * Crea una factura consolidada para múltiples órdenes del mismo paciente
   */
  static createConsolidatedInvoice(
    orders: Order[],
    createdById: string,
    dueDate?: Date
  ): CreateInvoiceDto {
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
      orderIds: orders.map(o => o.id),
      patientId,
      createdById,
      dueDate,
    };
  }

  /**
   * Crea una factura por IDs de órdenes seleccionadas
   * (útil cuando el usuario selecciona órdenes desde la UI)
   */
  static createFromOrderIds(
    orderIds: string[],
    patientId: string,
    createdById: string,
    dueDate?: Date
  ): CreateInvoiceDto {
    if (orderIds.length === 0) {
      throw new Error('Debe seleccionar al menos una orden');
    }

    return {
      orderIds,
      patientId,
      createdById,
      dueDate,
    };
  }

  /**
   * Crea una factura con fecha de vencimiento automática
   * (por ejemplo, 30 días desde hoy)
   */
  static createWithAutoDueDate(
    orderIds: string[],
    patientId: string,
    createdById: string,
    daysUntilDue: number = 30
  ): CreateInvoiceDto {
    const dueDate = addDays(new Date(), daysUntilDue);

    return {
      orderIds,
      patientId,
      createdById,
      dueDate,
    };
  }
}

import { PaymentOrder, PaymentOrderStatus, ServiceInstance } from '@prisma/client';
import { AppError } from '../middlewares/errorHandler';
import prisma from '../config/database';

interface CreatePaymentOrderDto {
  serviceInstanceIds: string[];
  patientId: string;
  createdById: string;
  dueDate?: Date;
}

interface PaymentOrderWithServiceInstances extends PaymentOrder {
  orders?: (ServiceInstance & { service?: any })[];
  payments?: any[];
}

export class PaymentOrderService {
  /**
   * Crea una orden de pago para una o múltiples órdenes
   * @param dto Datos para crear la orden de pago
   * @returns La orden de pago creada con sus órdenes asociadas
   */
  async createPaymentOrder(dto: CreatePaymentOrderDto): Promise<PaymentOrderWithServiceInstances> {
    const { serviceInstanceIds, patientId, createdById, dueDate } = dto;

    // Validar que se proporcionaron órdenes
    if (!serviceInstanceIds || serviceInstanceIds.length === 0) {
      throw new AppError('Debe seleccionar al menos una orden para generar la orden de pago', 400);
    }

    // Obtener todas las órdenes con sus servicios
    const orders = await prisma.serviceInstance.findMany({
      where: {
        id: { in: serviceInstanceIds },
      },
      include: {
        service: true,
        patient: true,
      },
    });

    // Validar que todas las órdenes existen
    if (orders.length !== serviceInstanceIds.length) {
      throw new AppError('Una o más órdenes no existen', 404);
    }

    // Validar que todas las órdenes pertenecen al mismo paciente
    const differentPatients = orders.some(order => order.patientId !== patientId);
    if (differentPatients) {
      throw new AppError('Todas las órdenes deben pertenecer al mismo paciente', 400);
    }

    // Validar que ninguna orden ya tiene orden de pago
    const alreadyBilled = orders.filter(order => order.paymentOrderId !== null);
    if (alreadyBilled.length > 0) {
      const billedServiceNames = alreadyBilled
        .map(o => o.service?.name || `Orden ${o.id.slice(0, 8)}`)
        .join(', ');
      throw new AppError(
        `Las siguientes órdenes ya tienen orden de pago: ${billedServiceNames}`,
        400
      );
    }

    // Calcular el monto total sumando los precios finales de todas las órdenes
    const totalAmount = orders.reduce((sum, order) => {
      return sum + Number(order.finalPrice);
    }, 0);

    // Crear la orden de pago en una transacción
    const paymentOrder = await prisma.$transaction(async (tx) => {
      // Crear la orden de pago
      const newPaymentOrder = await tx.paymentOrder.create({
        data: {
          patientId,
          totalAmount,
          status: PaymentOrderStatus.pending,
          dueDate: dueDate || null,
          createdById,
        },
      });

      // Asociar todas las órdenes con la orden de pago
      await tx.serviceInstance.updateMany({
        where: {
          id: { in: serviceInstanceIds },
        },
        data: {
          paymentOrderId: newPaymentOrder.id,
        },
      });

      // Retornar la orden de pago con sus órdenes
      return await tx.paymentOrder.findUnique({
        where: { id: newPaymentOrder.id },
        include: {
          orders: {
            include: {
              service: true,
            },
          },
          patient: true,
          payments: true,
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });
    });

    if (!paymentOrder) {
      throw new AppError('Error al crear la orden de pago', 500);
    }

    return paymentOrder;
  }

  /**
   * Obtiene una orden de pago por ID con todas sus órdenes y pagos
   */
  async getPaymentOrderById(paymentOrderId: string): Promise<PaymentOrderWithServiceInstances> {
    const paymentOrder = await prisma.paymentOrder.findUnique({
      where: { id: paymentOrderId },
      include: {
        orders: {
          include: {
            service: true,
          },
        },
        patient: true,
        payments: {
          include: {
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!paymentOrder) {
      throw new AppError('Orden de pago no encontrada', 404);
    }

    return paymentOrder;
  }

  /**
   * Obtiene todas las órdenes de pago de un paciente
   */
  async getPatientPaymentOrders(patientId: string): Promise<PaymentOrderWithServiceInstances[]> {
    const paymentOrders = await prisma.paymentOrder.findMany({
      where: { patientId },
      include: {
        orders: {
          include: {
            service: true,
          },
        },
        payments: {
          include: {
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return paymentOrders;
  }

  /**
   * Actualiza el estado de una orden de pago basándose en los pagos registrados
   */
  async updatePaymentOrderStatus(paymentOrderId: string): Promise<PaymentOrder> {
    const paymentOrder = await prisma.paymentOrder.findUnique({
      where: { id: paymentOrderId },
      include: {
        payments: true,
      },
    });

    if (!paymentOrder) {
      throw new AppError('Orden de pago no encontrada', 404);
    }

    // Calcular total pagado
    const totalPaid = paymentOrder.payments.reduce((sum, payment) => {
      return sum + Number(payment.amountPaid);
    }, 0);

    const totalAmount = Number(paymentOrder.totalAmount);

    // Determinar el nuevo estado
    let newStatus: PaymentOrderStatus;
    if (totalPaid === 0) {
      newStatus = PaymentOrderStatus.pending;
    } else if (totalPaid >= totalAmount) {
      newStatus = PaymentOrderStatus.paid;
    } else {
      newStatus = PaymentOrderStatus.partial;
    }

    // Actualizar el estado si cambió y devolver siempre el paymentOrder completo
    if (newStatus !== paymentOrder.status) {
      await prisma.paymentOrder.update({
        where: { id: paymentOrderId },
        data: { status: newStatus },
      });
    }

    return this.getPaymentOrderById(paymentOrderId);
  }

  /**
   * Obtiene las órdenes sin orden de pago de un paciente
   */
  async getOrdersWithoutPaymentOrder(patientId: string): Promise<ServiceInstance[]> {
    const orders = await prisma.serviceInstance.findMany({
      where: {
        patientId,
        paymentOrderId: null,
      },
      include: {
        service: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return orders;
  }

  /**
   * Cancela una orden de pago (solo si no tiene pagos registrados)
   */
  async cancelPaymentOrder(paymentOrderId: string): Promise<PaymentOrder> {
    const paymentOrder = await prisma.paymentOrder.findUnique({
      where: { id: paymentOrderId },
      include: {
        payments: true,
        orders: true,
      },
    });

    if (!paymentOrder) {
      throw new AppError('Orden de pago no encontrada', 404);
    }

    if (paymentOrder.payments.length > 0) {
      throw new AppError(
        'No se puede cancelar una orden de pago con pagos registrados',
        400
      );
    }

    // Usar transacción para cancelar orden de pago y desasociar órdenes
    return await prisma.$transaction(async (tx) => {
      // Desasociar las órdenes de la orden de pago
      await tx.serviceInstance.updateMany({
        where: {
          paymentOrderId: paymentOrder.id,
        },
        data: {
          paymentOrderId: null,
        },
      });

      // Marcar la orden de pago como cancelada
      return await tx.paymentOrder.update({
        where: { id: paymentOrderId },
        data: { status: PaymentOrderStatus.cancelled },
      });
    });
  }
}

export const paymentOrderService = new PaymentOrderService();

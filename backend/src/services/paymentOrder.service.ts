import { PrismaClient, PaymentOrder, PaymentOrderStatus, ServiceInstance } from '@prisma/client';
import { AppError } from '../middlewares/errorHandler';

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
  constructor(private prisma: PrismaClient) {}

  async createPaymentOrder(dto: CreatePaymentOrderDto): Promise<PaymentOrderWithServiceInstances> {
    const { serviceInstanceIds, patientId, createdById, dueDate } = dto;

    if (!serviceInstanceIds || serviceInstanceIds.length === 0) {
      throw new AppError('Debe seleccionar al menos una orden para generar la orden de pago', 400);
    }

    const orders = await this.prisma.serviceInstance.findMany({
      where: { id: { in: serviceInstanceIds } },
      include: { service: true, patient: true },
    });

    if (orders.length !== serviceInstanceIds.length) {
      throw new AppError('Una o más órdenes no existen', 404);
    }

    const differentPatients = orders.some(order => order.patientId !== patientId);
    if (differentPatients) {
      throw new AppError('Todas las órdenes deben pertenecer al mismo paciente', 400);
    }

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

    const totalAmount = orders.reduce((sum, order) => sum + Number(order.finalPrice), 0);

    const paymentOrder = await this.prisma.$transaction(async (tx) => {
      const newPaymentOrder = await tx.paymentOrder.create({
        data: {
          patientId,
          totalAmount,
          status: PaymentOrderStatus.pending,
          dueDate: dueDate || null,
          createdById,
        },
      });

      await tx.serviceInstance.updateMany({
        where: { id: { in: serviceInstanceIds } },
        data: { paymentOrderId: newPaymentOrder.id },
      });

      return await tx.paymentOrder.findUnique({
        where: { id: newPaymentOrder.id },
        include: {
          orders: { include: { service: true } },
          patient: true,
          payments: true,
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });
    });

    if (!paymentOrder) {
      throw new AppError('Error al crear la orden de pago', 500);
    }

    return paymentOrder;
  }

  async getPaymentOrderById(paymentOrderId: string): Promise<PaymentOrderWithServiceInstances> {
    const paymentOrder = await this.prisma.paymentOrder.findUnique({
      where: { id: paymentOrderId },
      include: {
        orders: { include: { service: true } },
        patient: true,
        payments: {
          include: {
            createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!paymentOrder) {
      throw new AppError('Orden de pago no encontrada', 404);
    }

    return paymentOrder;
  }

  async getPatientPaymentOrders(patientId: string): Promise<PaymentOrderWithServiceInstances[]> {
    return this.prisma.paymentOrder.findMany({
      where: { patientId },
      include: {
        orders: { include: { service: true } },
        payments: {
          include: {
            createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updatePaymentOrderStatus(paymentOrderId: string): Promise<PaymentOrder> {
    const paymentOrder = await this.prisma.paymentOrder.findUnique({
      where: { id: paymentOrderId },
      include: { payments: true },
    });

    if (!paymentOrder) {
      throw new AppError('Orden de pago no encontrada', 404);
    }

    const totalPaid = paymentOrder.payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
    const totalAmount = Number(paymentOrder.totalAmount);

    let newStatus: PaymentOrderStatus;
    if (totalPaid === 0) {
      newStatus = PaymentOrderStatus.pending;
    } else if (totalPaid >= totalAmount) {
      newStatus = PaymentOrderStatus.paid;
    } else {
      newStatus = PaymentOrderStatus.partial;
    }

    if (newStatus !== paymentOrder.status) {
      await this.prisma.paymentOrder.update({
        where: { id: paymentOrderId },
        data: { status: newStatus },
      });
    }

    return this.getPaymentOrderById(paymentOrderId);
  }

  async getOrdersWithoutPaymentOrder(patientId: string): Promise<ServiceInstance[]> {
    return this.prisma.serviceInstance.findMany({
      where: { patientId, paymentOrderId: null },
      include: { service: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancelPaymentOrder(paymentOrderId: string): Promise<PaymentOrder> {
    const paymentOrder = await this.prisma.paymentOrder.findUnique({
      where: { id: paymentOrderId },
      include: { payments: true, orders: true },
    });

    if (!paymentOrder) {
      throw new AppError('Orden de pago no encontrada', 404);
    }

    if (paymentOrder.payments.length > 0) {
      throw new AppError('No se puede cancelar una orden de pago con pagos registrados', 400);
    }

    return await this.prisma.$transaction(async (tx) => {
      await tx.serviceInstance.updateMany({
        where: { paymentOrderId: paymentOrder.id },
        data: { paymentOrderId: null },
      });

      return await tx.paymentOrder.update({
        where: { id: paymentOrderId },
        data: { status: PaymentOrderStatus.cancelled },
      });
    });
  }
}

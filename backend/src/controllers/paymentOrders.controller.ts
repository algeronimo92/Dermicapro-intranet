import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { paymentOrderService } from '../services/paymentOrder.service';
import { PaymentOrderFactory } from '../services/paymentOrder.factory';
import { parseStartOfDay } from '../utils/dateUtils';

export const getAllPaymentOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', patientId, status } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {};

    if (patientId) {
      where.patientId = patientId;
    }

    if (status) {
      where.status = status;
    }

    const [paymentOrders, total] = await Promise.all([
      prisma.paymentOrder.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dni: true,
            },
          },
          orders: {
            include: {
              service: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          payments: {
            orderBy: { paymentDate: 'desc' },
            select: {
              id: true,
              amountPaid: true,
              paymentMethod: true,
              paymentType: true,
              paymentDate: true,
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
      }),
      prisma.paymentOrder.count({ where }),
    ]);

    // Calcular balance para cada orden de pago
    const paymentOrdersWithBalance = paymentOrders.map((paymentOrder) => {
      const totalPaid = paymentOrder.payments.reduce(
        (sum, payment) => sum + parseFloat(payment.amountPaid.toString()),
        0
      );
      const balance = parseFloat(paymentOrder.totalAmount.toString()) - totalPaid;

      return {
        ...paymentOrder,
        totalPaid,
        balance,
      };
    });

    res.json({
      data: paymentOrdersWithBalance,
      pagination: {
        page: parseInt(page as string),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener órdenes de pago' });
  }
};

export const getPaymentOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const paymentOrder = await paymentOrderService.getPaymentOrderById(id);

    // Calcular total pagado y balance
    const totalPaid = paymentOrder.payments?.reduce(
      (sum, payment) => sum + parseFloat(payment.amountPaid.toString()),
      0
    ) || 0;
    const balance = parseFloat(paymentOrder.totalAmount.toString()) - totalPaid;

    res.json({
      ...paymentOrder,
      totalPaid,
      balance,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al obtener orden de pago' });
    }
  }
};

export const updatePaymentOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'partial', 'paid', 'cancelled'].includes(status)) {
      throw new AppError('Estado inválido. Debe ser uno de: pending, partial, paid, cancelled', 400);
    }

    const paymentOrder = await prisma.paymentOrder.update({
      where: { id },
      data: { status },
      include: {
        patient: true,
        orders: {
          include: {
            service: true,
          },
        },
        payments: true,
      },
    });

    res.json(paymentOrder);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al actualizar estado de orden de pago' });
    }
  }
};

export const getPaymentOrdersByPatient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;

    const paymentOrders = await paymentOrderService.getPatientPaymentOrders(patientId);

    // Calcular balance para cada orden de pago
    const paymentOrdersWithBalance = paymentOrders.map((paymentOrder) => {
      const totalPaid = paymentOrder.payments?.reduce(
        (sum, payment) => sum + parseFloat(payment.amountPaid.toString()),
        0
      ) || 0;
      const balance = parseFloat(paymentOrder.totalAmount.toString()) - totalPaid;

      return {
        ...paymentOrder,
        totalPaid,
        balance,
      };
    });

    res.json(paymentOrdersWithBalance);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener órdenes de pago del paciente' });
  }
};

export const getPaymentOrderSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;

    const paymentOrders = await prisma.paymentOrder.findMany({
      where: { patientId },
      include: {
        payments: true,
      },
    });

    // Calcular totales
    const summary = paymentOrders.reduce(
      (acc, paymentOrder) => {
        const totalPaid = paymentOrder.payments.reduce(
          (sum, payment) => sum + parseFloat(payment.amountPaid.toString()),
          0
        );
        const balance = parseFloat(paymentOrder.totalAmount.toString()) - totalPaid;

        acc.totalBilled += parseFloat(paymentOrder.totalAmount.toString());
        acc.totalPaid += totalPaid;
        acc.totalBalance += balance;

        if (paymentOrder.status === 'pending') acc.pendingCount++;
        if (paymentOrder.status === 'partial') acc.partialCount++;
        if (paymentOrder.status === 'paid') acc.paidCount++;

        return acc;
      },
      {
        totalBilled: 0,
        totalPaid: 0,
        totalBalance: 0,
        pendingCount: 0,
        partialCount: 0,
        paidCount: 0,
        totalPaymentOrders: paymentOrders.length,
      }
    );

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener resumen de orden de pago' });
  }
};

// ========== NUEVOS ENDPOINTS PARA N:1 RELATIONSHIP ==========

/**
 * Crea una orden de pago para una o múltiples órdenes
 */
export const createPaymentOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { serviceInstanceIds, patientId, dueDate, priceOverrides } = req.body;

    if (!serviceInstanceIds || !Array.isArray(serviceInstanceIds) || serviceInstanceIds.length === 0) {
      throw new AppError('serviceInstanceIds es requerido y debe ser un array no vacío', 400);
    }

    if (!patientId) {
      throw new AppError('patientId es requerido', 400);
    }

    // Actualizar precios si el usuario los modificó antes de generar la orden de pago
    if (priceOverrides && Array.isArray(priceOverrides) && priceOverrides.length > 0) {
      await Promise.all(
        (priceOverrides as { id: string; finalPrice: number }[]).map(override =>
          prisma.serviceInstance.update({
            where: { id: override.id },
            data: { finalPrice: override.finalPrice },
          })
        )
      );
    }

    const paymentOrderDto = PaymentOrderFactory.createFromServiceInstanceIds(
      serviceInstanceIds,
      patientId,
      req.user!.id,
      dueDate ? parseStartOfDay(dueDate) : undefined
    );

    const paymentOrder = await paymentOrderService.createPaymentOrder(paymentOrderDto);

    res.status(201).json(paymentOrder);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al crear orden de pago' });
    }
  }
};

/**
 * Obtiene las órdenes sin orden de pago de un paciente
 */
export const getOrdersWithoutPaymentOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;

    const orders = await paymentOrderService.getOrdersWithoutPaymentOrder(patientId);

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener órdenes sin orden de pago' });
  }
};

/**
 * Cancela una orden de pago (solo si no tiene pagos)
 */
export const cancelPaymentOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const paymentOrder = await paymentOrderService.cancelPaymentOrder(id);

    res.json(paymentOrder);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al cancelar orden de pago' });
    }
  }
};

/**
 * Actualiza automáticamente el estado de una orden de pago basándose en pagos
 */
export const autoUpdatePaymentOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const paymentOrder = await paymentOrderService.updatePaymentOrderStatus(id);

    res.json(paymentOrder);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al actualizar estado de orden de pago' });
    }
  }
};

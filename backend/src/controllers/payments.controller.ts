import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { parseStartOfDay } from '../utils/dateUtils';

export const getAllPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', patientId, paymentOrderId, appointmentId, paymentType } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {};

    if (patientId) {
      where.patientId = patientId;
    }

    if (paymentOrderId) {
      where.paymentOrderId = paymentOrderId;
    }

    if (appointmentId) {
      where.appointmentId = appointmentId;
    }

    if (paymentType) {
      where.paymentType = paymentType;
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take,
        orderBy: { paymentDate: 'desc' },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dni: true,
            },
          },
          paymentOrder: {
            select: {
              id: true,
              totalAmount: true,
              status: true,
              orders: {
                select: {
                  service: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
          appointment: {
            select: {
              id: true,
              scheduledDate: true,
              status: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({
      data: payments,
      pagination: {
        page: parseInt(page as string),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

export const getPaymentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        patient: true,
        paymentOrder: {
          include: {
            orders: {
              include: {
                service: true,
              },
            },
            payments: {
              orderBy: { paymentDate: 'desc' },
            },
          },
        },
        appointment: true,
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

    if (!payment) {
      throw new AppError('Payment not found', 404);
    }

    res.json(payment);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch payment' });
    }
  }
};

export const createPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      patientId,
      paymentOrderId,
      appointmentId,
      amountPaid,
      paymentMethod,
      paymentType,
      paymentDate,
      receiptUrl,
      notes,
    } = req.body;

    if (!patientId || !amountPaid || !paymentMethod || !paymentType) {
      throw new AppError('Missing required fields: patientId, amountPaid, paymentMethod, paymentType', 400);
    }

    const amount = parseFloat(amountPaid);
    if (amount <= 0) throw new AppError('Amount paid must be greater than 0', 400);

    if (paymentType === 'payment_order_payment' && !paymentOrderId) {
      throw new AppError('paymentOrderId es requerido para pagos de orden de pago', 400);
    }
    if ((paymentType === 'reservation' || paymentType === 'service_payment') && !appointmentId) {
      throw new AppError('appointmentId is required for reservation or service_payment type', 400);
    }

    // Si se usa saldo a favor, validar que el paciente tenga suficiente balance
    if (paymentMethod === 'account_credit') {
      const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { accountBalance: true } });
      if (!patient) throw new AppError('Patient not found', 404);
      if (parseFloat(patient.accountBalance.toString()) < amount) {
        throw new AppError(
          `Saldo insuficiente. Disponible: S/. ${parseFloat(patient.accountBalance.toString()).toFixed(2)}`,
          400
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          patientId,
          paymentOrderId: paymentOrderId || null,
          appointmentId: appointmentId || null,
          amountPaid: amount,
          paymentMethod,
          paymentType,
          paymentDate: paymentDate ? parseStartOfDay(paymentDate) : new Date(),
          receiptUrl,
          notes,
          createdById: req.user!.id,
        },
        include: {
          patient: true,
          paymentOrder: true,
          appointment: true,
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      // Agregar saldo a favor: incrementar accountBalance del paciente
      if (paymentType === 'account_credit') {
        await tx.patient.update({
          where: { id: patientId },
          data: { accountBalance: { increment: amount } },
        });
      }

      // Usar saldo a favor: decrementar accountBalance del paciente
      if (paymentMethod === 'account_credit') {
        await tx.patient.update({
          where: { id: patientId },
          data: { accountBalance: { decrement: amount } },
        });
      }

      // Actualizar status de orden de pago si corresponde
      if (paymentOrderId) {
        const paymentOrder = await tx.paymentOrder.findUnique({
          where: { id: paymentOrderId },
          include: { payments: true },
        });
        if (paymentOrder) {
          const totalPaid = paymentOrder.payments.reduce((sum, p) => sum + parseFloat(p.amountPaid.toString()), 0);
          let newStatus = paymentOrder.status;
          if (totalPaid >= parseFloat(paymentOrder.totalAmount.toString())) newStatus = 'paid';
          else if (totalPaid > 0) newStatus = 'partial';
          if (newStatus !== paymentOrder.status) {
            await tx.paymentOrder.update({ where: { id: paymentOrderId }, data: { status: newStatus } });
          }
        }
      }

      return payment;
    });

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error creating payment:', error);
      res.status(500).json({ error: 'Failed to create payment' });
    }
  }
};

export const addCredit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: patientId } = req.params;
    const { amount, paymentMethod, notes, receiptUrl } = req.body;

    if (!amount || !paymentMethod) {
      throw new AppError('amount y paymentMethod son requeridos', 400);
    }
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) throw new AppError('El monto debe ser mayor a 0', 400);
    if (paymentMethod === 'account_credit') {
      throw new AppError('No se puede usar saldo a favor para cargar saldo a favor', 400);
    }

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new AppError('Paciente no encontrado', 404);

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          patientId,
          amountPaid: parsed,
          paymentMethod,
          paymentType: 'account_credit',
          paymentDate: new Date(),
          notes,
          receiptUrl,
          createdById: req.user!.id,
        },
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      const updatedPatient = await tx.patient.update({
        where: { id: patientId },
        data: { accountBalance: { increment: parsed } },
        select: { id: true, accountBalance: true },
      });

      return { payment, accountBalance: updatedPatient.accountBalance };
    });

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error adding credit:', error);
      res.status(500).json({ error: 'Failed to add credit' });
    }
  }
};

export const updatePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes, receiptUrl } = req.body;

    const payment = await prisma.payment.update({
      where: { id },
      data: {
        notes,
        receiptUrl,
      },
      include: {
        patient: true,
        paymentOrder: true,
        appointment: true,
      },
    });

    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update payment' });
  }
};

export const deletePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Obtener el pago antes de eliminarlo para saber si tiene orden de pago asociada
    const payment = await prisma.payment.findUnique({
      where: { id },
      select: { paymentOrderId: true, amountPaid: true },
    });

    if (!payment) {
      throw new AppError('Payment not found', 404);
    }

    await prisma.$transaction(async (tx) => {
      // Eliminar el pago
      await tx.payment.delete({
        where: { id },
      });

      // Si tenía orden de pago asociada, recalcular el status
      if (payment.paymentOrderId) {
        const paymentOrder = await tx.paymentOrder.findUnique({
          where: { id: payment.paymentOrderId },
          include: {
            payments: true,
          },
        });

        if (paymentOrder) {
          // Calcular total pagado (sin incluir el pago eliminado)
          const totalPaid = paymentOrder.payments.reduce(
            (sum, p) => sum + parseFloat(p.amountPaid.toString()),
            0
          );

          // Determinar nuevo status
          let newStatus: 'pending' | 'partial' | 'paid' = 'pending';
          if (totalPaid >= parseFloat(paymentOrder.totalAmount.toString())) {
            newStatus = 'paid';
          } else if (totalPaid > 0) {
            newStatus = 'partial';
          }

          // Actualizar status
          await tx.paymentOrder.update({
            where: { id: payment.paymentOrderId },
            data: { status: newStatus },
          });
        }
      }
    });

    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to delete payment' });
    }
  }
};

export const uploadReceipt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    // Construir la URL del comprobante
    const receiptUrl = `/uploads/${req.file.filename}`;

    // Actualizar el pago con la URL del comprobante
    const payment = await prisma.payment.update({
      where: { id },
      data: { receiptUrl },
      include: {
        patient: true,
        paymentOrder: true,
        appointment: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.json(payment);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error uploading receipt:', error);
      res.status(500).json({ error: 'Failed to upload receipt' });
    }
  }
};

import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { parseStartOfDay } from '../utils/dateUtils';

export const getAllPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', patientId, invoiceId, appointmentId, paymentType } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {};

    if (patientId) {
      where.patientId = patientId;
    }

    if (invoiceId) {
      where.invoiceId = invoiceId;
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
          invoice: {
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
        invoice: {
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
      invoiceId,
      appointmentId,
      amountPaid,
      paymentMethod,
      paymentType,
      paymentDate,
      receiptUrl,
      notes,
    } = req.body;

    // Validaciones básicas
    if (!patientId || !amountPaid || !paymentMethod || !paymentType) {
      throw new AppError('Missing required fields: patientId, amountPaid, paymentMethod, paymentType', 400);
    }

    if (parseFloat(amountPaid) <= 0) {
      throw new AppError('Amount paid must be greater than 0', 400);
    }

    // Validar que el payment type sea consistente con los IDs proporcionados
    if (paymentType === 'invoice_payment' && !invoiceId) {
      throw new AppError('invoiceId is required for invoice_payment type', 400);
    }

    if ((paymentType === 'reservation' || paymentType === 'service_payment') && !appointmentId) {
      throw new AppError('appointmentId is required for reservation or service_payment type', 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Crear el pago
      const payment = await tx.payment.create({
        data: {
          patientId,
          invoiceId: invoiceId || null,
          appointmentId: appointmentId || null,
          amountPaid: parseFloat(amountPaid),
          paymentMethod,
          paymentType,
          // ✅ Parsear fecha correctamente usando dateUtils
          paymentDate: paymentDate ? parseStartOfDay(paymentDate) : new Date(),
          receiptUrl,
          notes,
          createdById: req.user!.id,
        },
        include: {
          patient: true,
          invoice: true,
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

      // Si el pago es para una factura, actualizar el status de la factura
      if (invoiceId) {
        const invoice = await tx.invoice.findUnique({
          where: { id: invoiceId },
          include: {
            payments: true,
          },
        });

        if (invoice) {
          // Calcular total pagado
          const totalPaid = invoice.payments.reduce(
            (sum, p) => sum + parseFloat(p.amountPaid.toString()),
            0
          );

          // Determinar nuevo status
          let newStatus = invoice.status;
          if (totalPaid >= parseFloat(invoice.totalAmount.toString())) {
            newStatus = 'paid';
          } else if (totalPaid > 0) {
            newStatus = 'partial';
          }

          // Actualizar status si cambió
          if (newStatus !== invoice.status) {
            await tx.invoice.update({
              where: { id: invoiceId },
              data: { status: newStatus },
            });
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
        invoice: true,
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

    // Obtener el pago antes de eliminarlo para saber si tiene factura asociada
    const payment = await prisma.payment.findUnique({
      where: { id },
      select: { invoiceId: true, amountPaid: true },
    });

    if (!payment) {
      throw new AppError('Payment not found', 404);
    }

    await prisma.$transaction(async (tx) => {
      // Eliminar el pago
      await tx.payment.delete({
        where: { id },
      });

      // Si tenía factura asociada, recalcular el status
      if (payment.invoiceId) {
        const invoice = await tx.invoice.findUnique({
          where: { id: payment.invoiceId },
          include: {
            payments: true,
          },
        });

        if (invoice) {
          // Calcular total pagado (sin incluir el pago eliminado)
          const totalPaid = invoice.payments.reduce(
            (sum, p) => sum + parseFloat(p.amountPaid.toString()),
            0
          );

          // Determinar nuevo status
          let newStatus: 'pending' | 'partial' | 'paid' = 'pending';
          if (totalPaid >= parseFloat(invoice.totalAmount.toString())) {
            newStatus = 'paid';
          } else if (totalPaid > 0) {
            newStatus = 'partial';
          }

          // Actualizar status
          await tx.invoice.update({
            where: { id: payment.invoiceId },
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
        invoice: true,
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

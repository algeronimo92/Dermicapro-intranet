import { Request, Response } from 'express';
import fs from 'fs';
import { getPrisma } from '../utils/tenant';
import { AppError } from '../middlewares/errorHandler';
import { parseStartOfDay } from '../utils/dateUtils';

export const getAllPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', patientId, paymentOrderId, appointmentId, paymentType, includeVoided } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {};

    // Por defecto excluye anulados; pasar includeVoided=true para verlos todos
    if (includeVoided !== 'true') {
      where.voidedAt = null;
    }

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
      getPrisma(req).payment.findMany({
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
            select: { id: true, firstName: true, lastName: true },
          },
          voidedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      getPrisma(req).payment.count({ where }),
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
    res.status(500).json({ error: 'Error al obtener pagos' });
  }
};

export const getPaymentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const payment = await getPrisma(req).payment.findUnique({
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
      throw new AppError('Pago no encontrado', 404);
    }

    res.json(payment);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al obtener pago' });
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
      throw new AppError('Faltan campos requeridos: patientId, amountPaid, paymentMethod, paymentType', 400);
    }

    const amount = parseFloat(amountPaid);
    if (amount <= 0) throw new AppError('El monto pagado debe ser mayor a 0', 400);

    if (paymentType === 'payment_order_payment' && !paymentOrderId) {
      throw new AppError('paymentOrderId es requerido para pagos de orden de pago', 400);
    }
    if ((paymentType === 'reservation' || paymentType === 'service_payment') && !appointmentId) {
      throw new AppError('Se requiere appointmentId para pagos de tipo reserva o servicio', 400);
    }

    // Si se usa saldo a favor, validar que el paciente tenga suficiente balance
    if (paymentMethod === 'account_credit') {
      const patient = await getPrisma(req).patient.findUnique({ where: { id: patientId }, select: { accountBalance: true } });
      if (!patient) throw new AppError('Paciente no encontrado', 404);
      if (parseFloat(patient.accountBalance.toString()) < amount) {
        throw new AppError(
          `Saldo insuficiente. Disponible: S/. ${parseFloat(patient.accountBalance.toString()).toFixed(2)}`,
          400
        );
      }
    }

    const result = await getPrisma(req).$transaction(async (tx) => {
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

      // Actualizar status de orden de pago si corresponde (excluye anulados)
      if (paymentOrderId) {
        const paymentOrder = await tx.paymentOrder.findUnique({
          where: { id: paymentOrderId },
          include: { payments: { where: { voidedAt: null } } },
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
      res.status(500).json({ error: 'Error al crear pago' });
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

    const patient = await getPrisma(req).patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new AppError('Paciente no encontrado', 404);

    const result = await getPrisma(req).$transaction(async (tx) => {
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
      res.status(500).json({ error: 'Error al agregar crédito' });
    }
  }
};

export const updatePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes, receiptUrl } = req.body;

    const payment = await getPrisma(req).payment.update({
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
    res.status(500).json({ error: 'Error al actualizar pago' });
  }
};

export const voidPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const payment = await getPrisma(req).payment.findUnique({
      where: { id },
      select: {
        paymentOrderId: true,
        voidedAt: true,
        paymentType: true,
        paymentMethod: true,
        appointmentId: true,
        patientId: true,
        amountPaid: true,
      },
    });

    if (!payment) throw new AppError('Pago no encontrado', 404);
    if (payment.voidedAt) throw new AppError('El pago ya fue anulado', 409);

    await getPrisma(req).$transaction(async (tx) => {
      // Soft delete: marcar como anulado
      await tx.payment.update({
        where: { id },
        data: {
          voidedAt: new Date(),
          voidedById: req.user!.id,
          voidReason: reason ?? null,
        },
      });

      // Si es pago de reserva: limpiar reserva en la cita y revertir saldo a favor
      if (payment.paymentType === 'reservation') {
        // appointment.reservationAmount field removed — payment.voidedAt is the source of truth

        if (payment.patientId) {
          await tx.patient.update({
            where: { id: payment.patientId },
            data: { accountBalance: { decrement: parseFloat(payment.amountPaid.toString()) } },
          });
        }
      }

      // Si se usó saldo a favor para pagar una orden, devolver el monto al balance
      if (payment.paymentMethod === 'account_credit' && payment.patientId) {
        await tx.patient.update({
          where: { id: payment.patientId },
          data: { accountBalance: { increment: parseFloat(payment.amountPaid.toString()) } },
        });
      }

      // Recalcular status de la orden de pago excluyendo pagos anulados
      if (payment.paymentOrderId) {
        const paymentOrder = await tx.paymentOrder.findUnique({
          where: { id: payment.paymentOrderId },
          include: { payments: { where: { voidedAt: null } } },
        });

        if (paymentOrder) {
          const totalPaid = paymentOrder.payments.reduce(
            (sum, p) => sum + parseFloat(p.amountPaid.toString()),
            0
          );

          let newStatus: 'pending' | 'partial' | 'paid' = 'pending';
          if (totalPaid >= parseFloat(paymentOrder.totalAmount.toString())) {
            newStatus = 'paid';
          } else if (totalPaid > 0) {
            newStatus = 'partial';
          }

          await tx.paymentOrder.update({
            where: { id: payment.paymentOrderId },
            data: { status: newStatus },
          });
        }
      }
    });

    res.json({ message: 'Pago anulado correctamente' });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al anular pago' });
    }
  }
};

export const uploadReceipt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      throw new AppError('No se subieron archivos', 400);
    }

    const existing = await getPrisma(req).payment.findUnique({
      where: { id },
      select: { receiptUrls: true },
    });
    if (!existing) throw new AppError('Pago no encontrado', 404);

    const currentUrls = existing.receiptUrls || [];
    if (currentUrls.length + files.length > 3) {
      files.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
      throw new AppError(`Solo se permiten 3 comprobantes. Ya tiene ${currentUrls.length}.`, 400);
    }

    const newUrls = files.map(f => `/uploads/${f.filename}`);

    const payment = await getPrisma(req).payment.update({
      where: { id },
      data: {
        receiptUrls: { push: newUrls },
        receiptUrl: currentUrls.length === 0 ? newUrls[0] : undefined,
      },
      include: {
        patient: true,
        paymentOrder: true,
        appointment: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    res.json(payment);
  } catch (error) {
    const files = req.files as Express.Multer.File[] | undefined;
    if (files) files.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error uploading receipt:', error);
      res.status(500).json({ error: 'Error al subir comprobante' });
    }
  }
};

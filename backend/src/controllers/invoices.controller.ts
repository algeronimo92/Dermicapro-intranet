import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { invoicingService } from '../services/invoicing.service';
import { InvoiceFactory } from '../services/invoice.factory';
import { parseStartOfDay } from '../utils/dateUtils';

export const getAllInvoices = async (req: Request, res: Response): Promise<void> => {
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

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
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
      prisma.invoice.count({ where }),
    ]);

    // Calcular balance para cada factura
    const invoicesWithBalance = invoices.map((invoice) => {
      const totalPaid = invoice.payments.reduce(
        (sum, payment) => sum + parseFloat(payment.amountPaid.toString()),
        0
      );
      const balance = parseFloat(invoice.totalAmount.toString()) - totalPaid;

      return {
        ...invoice,
        totalPaid,
        balance,
      };
    });

    res.json({
      data: invoicesWithBalance,
      pagination: {
        page: parseInt(page as string),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
};

export const getInvoiceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const invoice = await invoicingService.getInvoiceById(id);

    // Calcular total pagado y balance
    const totalPaid = invoice.payments?.reduce(
      (sum, payment) => sum + parseFloat(payment.amountPaid.toString()),
      0
    ) || 0;
    const balance = parseFloat(invoice.totalAmount.toString()) - totalPaid;

    res.json({
      ...invoice,
      totalPaid,
      balance,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch invoice' });
    }
  }
};

export const updateInvoiceStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'partial', 'paid', 'cancelled'].includes(status)) {
      throw new AppError('Invalid status. Must be one of: pending, partial, paid, cancelled', 400);
    }

    const invoice = await prisma.invoice.update({
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

    res.json(invoice);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update invoice status' });
    }
  }
};

export const getInvoicesByPatient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;

    const invoices = await invoicingService.getPatientInvoices(patientId);

    // Calcular balance para cada factura
    const invoicesWithBalance = invoices.map((invoice) => {
      const totalPaid = invoice.payments?.reduce(
        (sum, payment) => sum + parseFloat(payment.amountPaid.toString()),
        0
      ) || 0;
      const balance = parseFloat(invoice.totalAmount.toString()) - totalPaid;

      return {
        ...invoice,
        totalPaid,
        balance,
      };
    });

    res.json(invoicesWithBalance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patient invoices' });
  }
};

export const getInvoiceSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;

    const invoices = await prisma.invoice.findMany({
      where: { patientId },
      include: {
        payments: true,
      },
    });

    // Calcular totales
    const summary = invoices.reduce(
      (acc, invoice) => {
        const totalPaid = invoice.payments.reduce(
          (sum, payment) => sum + parseFloat(payment.amountPaid.toString()),
          0
        );
        const balance = parseFloat(invoice.totalAmount.toString()) - totalPaid;

        acc.totalInvoiced += parseFloat(invoice.totalAmount.toString());
        acc.totalPaid += totalPaid;
        acc.totalBalance += balance;

        if (invoice.status === 'pending') acc.pendingCount++;
        if (invoice.status === 'partial') acc.partialCount++;
        if (invoice.status === 'paid') acc.paidCount++;

        return acc;
      },
      {
        totalInvoiced: 0,
        totalPaid: 0,
        totalBalance: 0,
        pendingCount: 0,
        partialCount: 0,
        paidCount: 0,
        totalInvoices: invoices.length,
      }
    );

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoice summary' });
  }
};

// ========== NUEVOS ENDPOINTS PARA N:1 RELATIONSHIP ==========

/**
 * Crea una factura para una o múltiples órdenes
 */
export const createInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderIds, patientId, dueDate } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      throw new AppError('orderIds es requerido y debe ser un array no vacío', 400);
    }

    if (!patientId) {
      throw new AppError('patientId es requerido', 400);
    }

    const invoiceDto = InvoiceFactory.createFromOrderIds(
      orderIds,
      patientId,
      req.user!.id,
      dueDate ? parseStartOfDay(dueDate) : undefined
    );

    const invoice = await invoicingService.createInvoice(invoiceDto);

    res.status(201).json(invoice);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create invoice' });
    }
  }
};

/**
 * Obtiene las órdenes sin facturar de un paciente
 */
export const getUninvoicedOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;

    const orders = await invoicingService.getUninvoicedOrders(patientId);

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch uninvoiced orders' });
  }
};

/**
 * Cancela una factura (solo si no tiene pagos)
 */
export const cancelInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const invoice = await invoicingService.cancelInvoice(id);

    res.json(invoice);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to cancel invoice' });
    }
  }
};

/**
 * Actualiza automáticamente el estado de una factura basándose en pagos
 */
export const autoUpdateInvoiceStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const invoice = await invoicingService.updateInvoiceStatus(id);

    res.json(invoice);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update invoice status' });
    }
  }
};

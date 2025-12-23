import { PrismaClient, Invoice, InvoiceStatus, Order } from '@prisma/client';
import { AppError } from '../middlewares/errorHandler';

const prisma = new PrismaClient();

interface CreateInvoiceDto {
  orderIds: string[];
  patientId: string;
  createdById: string;
  dueDate?: Date;
}

interface InvoiceWithOrders extends Invoice {
  orders?: (Order & { service?: any })[];
  payments?: any[];
}

export class InvoicingService {
  /**
   * Crea una factura para una o múltiples órdenes
   * @param dto Datos para crear la factura
   * @returns La factura creada con sus órdenes asociadas
   */
  async createInvoice(dto: CreateInvoiceDto): Promise<InvoiceWithOrders> {
    const { orderIds, patientId, createdById, dueDate } = dto;

    // Validar que se proporcionaron órdenes
    if (!orderIds || orderIds.length === 0) {
      throw new AppError('Debe seleccionar al menos una orden para facturar', 400);
    }

    // Obtener todas las órdenes con sus servicios
    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
      },
      include: {
        service: true,
        patient: true,
      },
    });

    // Validar que todas las órdenes existen
    if (orders.length !== orderIds.length) {
      throw new AppError('Una o más órdenes no existen', 404);
    }

    // Validar que todas las órdenes pertenecen al mismo paciente
    const differentPatients = orders.some(order => order.patientId !== patientId);
    if (differentPatients) {
      throw new AppError('Todas las órdenes deben pertenecer al mismo paciente', 400);
    }

    // Validar que ninguna orden ya está facturada
    const alreadyInvoiced = orders.filter(order => order.invoiceId !== null);
    if (alreadyInvoiced.length > 0) {
      const invoicedServiceNames = alreadyInvoiced
        .map(o => o.service?.name || `Orden ${o.id.slice(0, 8)}`)
        .join(', ');
      throw new AppError(
        `Las siguientes órdenes ya están facturadas: ${invoicedServiceNames}`,
        400
      );
    }

    // Calcular el monto total sumando los precios finales de todas las órdenes
    const totalAmount = orders.reduce((sum, order) => {
      return sum + Number(order.finalPrice);
    }, 0);

    // Crear la factura en una transacción
    const invoice = await prisma.$transaction(async (tx) => {
      // Crear la factura
      const newInvoice = await tx.invoice.create({
        data: {
          patientId,
          totalAmount,
          status: InvoiceStatus.pending,
          dueDate: dueDate || null,
          createdById,
        },
      });

      // Asociar todas las órdenes con la factura
      await tx.order.updateMany({
        where: {
          id: { in: orderIds },
        },
        data: {
          invoiceId: newInvoice.id,
        },
      });

      // Retornar la factura con sus órdenes
      return await tx.invoice.findUnique({
        where: { id: newInvoice.id },
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

    if (!invoice) {
      throw new AppError('Error al crear la factura', 500);
    }

    return invoice;
  }

  /**
   * Obtiene una factura por ID con todas sus órdenes y pagos
   */
  async getInvoiceById(invoiceId: string): Promise<InvoiceWithOrders> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
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

    if (!invoice) {
      throw new AppError('Factura no encontrada', 404);
    }

    return invoice;
  }

  /**
   * Obtiene todas las facturas de un paciente
   */
  async getPatientInvoices(patientId: string): Promise<InvoiceWithOrders[]> {
    const invoices = await prisma.invoice.findMany({
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

    return invoices;
  }

  /**
   * Actualiza el estado de una factura basándose en los pagos registrados
   */
  async updateInvoiceStatus(invoiceId: string): Promise<Invoice> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        payments: true,
      },
    });

    if (!invoice) {
      throw new AppError('Factura no encontrada', 404);
    }

    // Calcular total pagado
    const totalPaid = invoice.payments.reduce((sum, payment) => {
      return sum + Number(payment.amountPaid);
    }, 0);

    const totalAmount = Number(invoice.totalAmount);

    // Determinar el nuevo estado
    let newStatus: InvoiceStatus;
    if (totalPaid === 0) {
      newStatus = InvoiceStatus.pending;
    } else if (totalPaid >= totalAmount) {
      newStatus = InvoiceStatus.paid;
    } else {
      newStatus = InvoiceStatus.partial;
    }

    // Actualizar el estado si cambió
    if (newStatus !== invoice.status) {
      return await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: newStatus },
      });
    }

    return invoice;
  }

  /**
   * Obtiene las órdenes sin facturar de un paciente
   */
  async getUninvoicedOrders(patientId: string): Promise<Order[]> {
    const orders = await prisma.order.findMany({
      where: {
        patientId,
        invoiceId: null, // Órdenes sin factura
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
   * Cancela una factura (solo si no tiene pagos registrados)
   */
  async cancelInvoice(invoiceId: string): Promise<Invoice> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        payments: true,
        orders: true,
      },
    });

    if (!invoice) {
      throw new AppError('Factura no encontrada', 404);
    }

    if (invoice.payments.length > 0) {
      throw new AppError(
        'No se puede cancelar una factura con pagos registrados',
        400
      );
    }

    // Usar transacción para cancelar factura y desasociar órdenes
    return await prisma.$transaction(async (tx) => {
      // Desasociar las órdenes de la factura
      await tx.order.updateMany({
        where: {
          invoiceId: invoice.id,
        },
        data: {
          invoiceId: null,
        },
      });

      // Marcar la factura como cancelada
      return await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: InvoiceStatus.cancelled },
      });
    });
  }
}

export const invoicingService = new InvoicingService();

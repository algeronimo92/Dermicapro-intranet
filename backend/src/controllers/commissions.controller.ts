import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';

/**
 * Obtener todas las comisiones con filtros
 */
export const getAllCommissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '20',
      status,
      salesPersonId,
      startDate,
      endDate,
      serviceId,
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {};

    // Filtro por estado
    if (status) {
      where.status = status;
    }

    // Filtro por vendedor
    if (salesPersonId) {
      where.salesPersonId = salesPersonId;
    } else if (req.user?.roleName === 'sales') {
      // Si es vendedor, solo ver sus propias comisiones
      where.salesPersonId = req.user.id;
    }

    // Filtro por servicio
    if (serviceId) {
      where.serviceId = serviceId;
    }

    // Filtro por rango de fechas
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    const [commissions, total] = await Promise.all([
      prisma.commission.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          salesPerson: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          appointment: {
            select: {
              id: true,
              scheduledDate: true,
              status: true,
              attendedAt: true,
              patient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  dni: true,
                },
              },
            },
          },
          service: {
            select: {
              id: true,
              name: true,
              basePrice: true,
            },
          },
          order: {
            select: {
              id: true,
              finalPrice: true,
              totalSessions: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          paidBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.commission.count({ where }),
    ]);

    // Calcular totales por estado
    const totals = await prisma.commission.groupBy({
      by: ['status'],
      where: salesPersonId ? { salesPersonId: salesPersonId as string } : {},
      _sum: {
        commissionAmount: true,
      },
      _count: true,
    });

    res.json({
      data: commissions,
      pagination: {
        page: parseInt(page as string),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
      summary: {
        totals: totals.map((t) => ({
          status: t.status,
          count: t._count,
          amount: t._sum.commissionAmount || 0,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching commissions:', error);
    res.status(500).json({ error: 'Failed to fetch commissions' });
  }
};

/**
 * Obtener una comisión por ID
 */
export const getCommissionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const commission = await prisma.commission.findUnique({
      where: { id },
      include: {
        salesPerson: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        appointment: {
          include: {
            patient: true,
          },
        },
        service: true,
        order: {
          include: {
            service: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        paidBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!commission) {
      throw new AppError('Commission not found', 404);
    }

    // Verificar permisos: solo admin o el vendedor pueden ver la comisión
    if (req.user?.roleName !== 'admin' && commission.salesPersonId !== req.user?.id) {
      throw new AppError('Unauthorized', 403);
    }

    res.json(commission);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error fetching commission:', error);
      res.status(500).json({ error: 'Failed to fetch commission' });
    }
  }
};

/**
 * Obtener resumen de comisiones por vendedor
 */
export const getCommissionsSummaryBySales = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};

    // Filtro por rango de fechas
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    // Agrupar por vendedor y estado
    const summary = await prisma.commission.groupBy({
      by: ['salesPersonId', 'status'],
      where,
      _sum: {
        commissionAmount: true,
      },
      _count: true,
    });

    // Obtener información de vendedores
    const salesPersonIds = [...new Set(summary.map((s) => s.salesPersonId))];
    const salesPersons = await prisma.user.findMany({
      where: {
        id: { in: salesPersonIds },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    // Agrupar por vendedor
    const result = salesPersons.map((person) => {
      const personCommissions = summary.filter((s) => s.salesPersonId === person.id);

      const byStatus = personCommissions.reduce(
        (acc, curr) => {
          const amount = curr._sum.commissionAmount || 0;
          acc[curr.status] = {
            count: curr._count,
            amount: Number(amount),
          };
          return acc;
        },
        {} as Record<string, { count: number; amount: number }>
      );

      const totalAmount = personCommissions.reduce(
        (sum, curr) => {
          const amount = curr._sum.commissionAmount || 0;
          return sum + Number(amount);
        },
        0
      );

      const totalCount = personCommissions.reduce((sum, curr) => sum + curr._count, 0);

      return {
        salesPerson: person,
        byStatus,
        totalAmount,
        totalCount,
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching commissions summary:', error);
    res.status(500).json({ error: 'Failed to fetch commissions summary' });
  }
};

/**
 * Aprobar una comisión
 */
export const approveCommission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    // Verificar que existe y obtener la cita asociada
    const existing = await prisma.commission.findUnique({
      where: { id },
      include: {
        appointment: {
          select: {
            id: true,
            status: true,
            attendedAt: true,
          },
        },
      },
    });

    if (!existing) {
      throw new AppError('Commission not found', 404);
    }

    if (existing.status !== 'pending') {
      throw new AppError(`Cannot approve commission with status: ${existing.status}`, 400);
    }

    // Validar que la cita fue atendida
    if (!existing.appointment || existing.appointment.status !== 'attended') {
      throw new AppError('Cannot approve commission: appointment has not been attended', 400);
    }

    // Aprobar
    const commission = await prisma.commission.update({
      where: { id },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        approvedById: req.user!.id,
        notes: notes || existing.notes,
      },
      include: {
        salesPerson: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        service: true,
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.json(commission);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error approving commission:', error);
      res.status(500).json({ error: 'Failed to approve commission' });
    }
  }
};

/**
 * Rechazar una comisión
 */
export const rejectCommission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      throw new AppError('Rejection reason is required', 400);
    }

    // Verificar que existe
    const existing = await prisma.commission.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Commission not found', 404);
    }

    if (existing.status !== 'pending') {
      throw new AppError(`Cannot reject commission with status: ${existing.status}`, 400);
    }

    // Rechazar
    const commission = await prisma.commission.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason,
        approvedById: req.user!.id,
        approvedAt: new Date(),
      },
      include: {
        salesPerson: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        service: true,
      },
    });

    res.json(commission);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error rejecting commission:', error);
      res.status(500).json({ error: 'Failed to reject commission' });
    }
  }
};

/**
 * Marcar comisión como pagada
 */
export const markAsPaid = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { paymentMethod, paymentReference, notes } = req.body;

    // Verificar que existe
    const existing = await prisma.commission.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Commission not found', 404);
    }

    if (existing.status !== 'approved') {
      throw new AppError(`Cannot pay commission with status: ${existing.status}. Must be approved first.`, 400);
    }

    // Marcar como pagada
    const commission = await prisma.commission.update({
      where: { id },
      data: {
        status: 'paid',
        paidAt: new Date(),
        paidById: req.user!.id,
        paymentMethod: paymentMethod || 'cash',
        paymentReference,
        notes: notes || existing.notes,
      },
      include: {
        salesPerson: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        service: true,
        paidBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.json(commission);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error marking commission as paid:', error);
      res.status(500).json({ error: 'Failed to mark commission as paid' });
    }
  }
};

/**
 * Aprobar múltiples comisiones en lote
 */
export const batchApprove = async (req: Request, res: Response): Promise<void> => {
  try {
    const { commissionIds, notes } = req.body;

    if (!commissionIds || !Array.isArray(commissionIds) || commissionIds.length === 0) {
      throw new AppError('Commission IDs array is required', 400);
    }

    // Verificar que todas las comisiones tengan citas atendidas
    const commissions = await prisma.commission.findMany({
      where: {
        id: { in: commissionIds },
      },
      include: {
        appointment: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    // Validar que todas las citas fueron atendidas
    const notAttendedCommissions = commissions.filter(
      c => !c.appointment || c.appointment.status !== 'attended'
    );

    if (notAttendedCommissions.length > 0) {
      throw new AppError(
        `Cannot approve ${notAttendedCommissions.length} commission(s): appointments have not been attended`,
        400
      );
    }

    // Actualizar en lote solo las que están pending
    const result = await prisma.commission.updateMany({
      where: {
        id: { in: commissionIds },
        status: 'pending',
      },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        approvedById: req.user!.id,
        notes,
      },
    });

    res.json({
      message: `${result.count} commission(s) approved successfully`,
      count: result.count,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error batch approving commissions:', error);
      res.status(500).json({ error: 'Failed to batch approve commissions' });
    }
  }
};

/**
 * Marcar múltiples comisiones como pagadas en lote
 */
export const batchMarkAsPaid = async (req: Request, res: Response): Promise<void> => {
  try {
    const { commissionIds, paymentMethod, paymentReference, notes } = req.body;

    if (!commissionIds || !Array.isArray(commissionIds) || commissionIds.length === 0) {
      throw new AppError('Commission IDs array is required', 400);
    }

    // Actualizar en lote
    const result = await prisma.commission.updateMany({
      where: {
        id: { in: commissionIds },
        status: 'approved',
      },
      data: {
        status: 'paid',
        paidAt: new Date(),
        paidById: req.user!.id,
        paymentMethod: paymentMethod || 'cash',
        paymentReference,
        notes,
      },
    });

    res.json({
      message: `${result.count} commission(s) marked as paid successfully`,
      count: result.count,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error batch marking commissions as paid:', error);
      res.status(500).json({ error: 'Failed to batch mark commissions as paid' });
    }
  }
};

/**
 * Cancelar una comisión
 */
export const cancelCommission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    // Verificar que existe
    const existing = await prisma.commission.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Commission not found', 404);
    }

    if (existing.status === 'paid') {
      throw new AppError('Cannot cancel a paid commission', 400);
    }

    // Cancelar
    const commission = await prisma.commission.update({
      where: { id },
      data: {
        status: 'cancelled',
        notes: notes || existing.notes,
      },
      include: {
        salesPerson: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        service: true,
      },
    });

    res.json(commission);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error cancelling commission:', error);
      res.status(500).json({ error: 'Failed to cancel commission' });
    }
  }
};

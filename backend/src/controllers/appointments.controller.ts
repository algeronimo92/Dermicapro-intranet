import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';

export const getAllAppointments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', status, date, userId } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (date) {
      const startDate = new Date(date as string);
      const endDate = new Date(date as string);
      endDate.setHours(23, 59, 59, 999);

      where.scheduledDate = {
        gte: startDate,
        lte: endDate,
      };
    }

    if (req.user?.role === 'sales') {
      where.createdById = req.user.id;
    }

    if (userId && req.user?.role === 'admin') {
      where.createdById = userId;
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take,
        orderBy: { scheduledDate: 'desc' },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dni: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
              basePrice: true,
            },
          },
          createdBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          attendedBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    res.json({
      data: appointments,
      pagination: {
        page: parseInt(page as string),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
};

export const getAppointmentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        service: true,
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        attendedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        treatmentSessions: {
          orderBy: { sessionNumber: 'asc' },
        },
        patientRecords: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    res.json(appointment);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch appointment' });
    }
  }
};

export const createAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId, serviceId, scheduledDate, durationMinutes, reservationAmount, notes } = req.body;

    if (!patientId || !serviceId || !scheduledDate) {
      throw new AppError('Missing required fields', 400);
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        serviceId,
        scheduledDate: new Date(scheduledDate),
        durationMinutes: durationMinutes ? parseInt(durationMinutes) : 60,
        reservationAmount: reservationAmount ? parseFloat(reservationAmount) : null,
        notes,
        createdById: req.user!.id,
        status: 'reserved',
      },
      include: {
        patient: true,
        service: true,
      },
    });

    if (reservationAmount && parseFloat(reservationAmount) > 0) {
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
      });

      if (service) {
        const commissionRate = 0.1; // 10% commission rate
        await prisma.commission.create({
          data: {
            salesPersonId: req.user!.id,
            appointmentId: appointment.id,
            commissionRate,
            commissionAmount: parseFloat(reservationAmount) * commissionRate,
            status: 'pending',
          },
        });
      }
    }

    res.status(201).json(appointment);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create appointment' });
    }
  }
};

export const updateAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { scheduledDate, durationMinutes, notes, status } = req.body;

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
        durationMinutes: durationMinutes ? parseInt(durationMinutes) : undefined,
        notes,
        status,
      },
      include: {
        patient: true,
        service: true,
      },
    });

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update appointment' });
  }
};

export const deleteAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Soft delete: marca la cita como cancelada en lugar de eliminarla
    // Esto preserva el historial, comisiones y registros asociados
    await prisma.appointment.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    res.json({ message: 'Appointment cancelled successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
};

export const markAsAttended = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'attended',
        attendedById: req.user!.id,
        attendedAt: new Date(),
        notes,
      },
      include: {
        patient: true,
        service: true,
      },
    });

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark appointment as attended' });
  }
};

export const uploadReceipt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const receiptUrl = `/uploads/${req.file.filename}`;

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        reservationReceiptUrl: receiptUrl,
      },
    });

    res.json({ url: receiptUrl, appointment });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to upload receipt' });
    }
  }
};

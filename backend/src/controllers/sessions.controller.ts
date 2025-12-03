import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';

export const getSessionsByAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { appointmentId } = req.params;

    const sessions = await prisma.treatmentSession.findMany({
      where: { appointmentId },
      orderBy: { sessionNumber: 'asc' },
    });

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
};

export const createSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { appointmentId } = req.params;
    const {
      sessionNumber,
      totalSessions,
      amountPaid,
      paymentMethod,
      performed,
      notes,
      weight,
      bodyMeasurement,
      healthNotes,
    } = req.body;

    if (!sessionNumber || !totalSessions || !amountPaid || !paymentMethod) {
      throw new AppError('Missing required fields', 400);
    }

    const session = await prisma.treatmentSession.create({
      data: {
        appointmentId,
        sessionNumber: parseInt(sessionNumber),
        totalSessions: parseInt(totalSessions),
        amountPaid: parseFloat(amountPaid),
        paymentMethod,
        performed: performed || false,
        notes,
      },
    });

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { patientId: true },
    });

    if (appointment) {
      await prisma.patientRecord.create({
        data: {
          patientId: appointment.patientId,
          appointmentId,
          weight: weight ? parseFloat(weight) : null,
          bodyMeasurement: bodyMeasurement || null,
          healthNotes,
          beforePhotoUrls: [],
          afterPhotoUrls: [],
          createdById: req.user!.id,
        },
      });
    }

    res.status(201).json(session);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create session' });
    }
  }
};

export const updateSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { amountPaid, paymentMethod, performed, notes } = req.body;

    const session = await prisma.treatmentSession.update({
      where: { id },
      data: {
        amountPaid: amountPaid ? parseFloat(amountPaid) : undefined,
        paymentMethod,
        performed,
        notes,
      },
    });

    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update session' });
  }
};

export const uploadPhotos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { type } = req.body; // 'before' or 'after'

    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      throw new AppError('No files uploaded', 400);
    }

    const photoUrls = req.files.map((file) => `/uploads/${file.filename}`);

    const session = await prisma.treatmentSession.findUnique({
      where: { id },
      select: { appointmentId: true },
    });

    if (!session) {
      throw new AppError('Session not found', 404);
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: session.appointmentId },
      select: { patientId: true },
    });

    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    const latestRecord = await prisma.patientRecord.findFirst({
      where: {
        appointmentId: session.appointmentId,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (latestRecord) {
      const updateData: any = {};
      if (type === 'before') {
        const existingUrls = (latestRecord.beforePhotoUrls as string[]) || [];
        updateData.beforePhotoUrls = [...existingUrls, ...photoUrls];
      } else if (type === 'after') {
        const existingUrls = (latestRecord.afterPhotoUrls as string[]) || [];
        updateData.afterPhotoUrls = [...existingUrls, ...photoUrls];
      }

      await prisma.patientRecord.update({
        where: { id: latestRecord.id },
        data: updateData,
      });
    }

    res.json({ urls: photoUrls, message: 'Photos uploaded successfully' });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to upload photos' });
    }
  }
};

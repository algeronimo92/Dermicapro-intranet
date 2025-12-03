import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';

export const getAllPatients = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', search = '', sex = '' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    // Construir condiciones de búsqueda
    const conditions: any = {};

    // Filtro de búsqueda por texto
    if (search) {
      conditions.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' as const } },
        { lastName: { contains: search as string, mode: 'insensitive' as const } },
        { dni: { contains: search as string } },
        { phone: { contains: search as string } },
        { email: { contains: search as string, mode: 'insensitive' as const } },
      ];
    }

    // Filtro por sexo
    if (sex) {
      conditions.sex = sex as string;
    }

    const where = Object.keys(conditions).length > 0 ? conditions : {};

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dni: true,
          dateOfBirth: true,
          sex: true,
          phone: true,
          email: true,
          createdAt: true,
          createdBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.patient.count({ where }),
    ]);

    res.json({
      data: patients,
      pagination: {
        page: parseInt(page as string),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
};

export const getPatientById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        appointments: {
          include: {
            service: true,
            treatmentSessions: true,
          },
          orderBy: { scheduledDate: 'desc' },
        },
      },
    });

    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    res.json(patient);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch patient' });
    }
  }
};

export const createPatient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, dni, dateOfBirth, sex, phone, email, address } = req.body;

    if (!firstName || !lastName || !dni || !dateOfBirth || !sex) {
      throw new AppError('Missing required fields', 400);
    }

    const existingPatient = await prisma.patient.findUnique({
      where: { dni },
    });

    if (existingPatient) {
      throw new AppError('Patient with this DNI already exists', 409);
    }

    const patient = await prisma.patient.create({
      data: {
        firstName,
        lastName,
        dni,
        dateOfBirth: new Date(dateOfBirth),
        sex,
        phone,
        email,
        address,
        createdById: req.user!.id,
      },
    });

    res.status(201).json(patient);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create patient' });
    }
  }
};

export const updatePatient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { firstName, lastName, dateOfBirth, sex, phone, email, address } = req.body;

    const patient = await prisma.patient.update({
      where: { id },
      data: {
        firstName,
        lastName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        sex,
        phone,
        email,
        address,
      },
    });

    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update patient' });
  }
};

export const deletePatient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.patient.delete({
      where: { id },
    });

    res.json({ message: 'Patient deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete patient' });
  }
};

export const getPatientHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const records = await prisma.patientRecord.findMany({
      where: { patientId: id },
      include: {
        appointment: {
          include: {
            service: true,
          },
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patient history' });
  }
};

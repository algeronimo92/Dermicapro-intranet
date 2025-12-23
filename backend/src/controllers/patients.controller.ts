import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { parseStartOfDay } from '../utils/dateUtils';

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
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          appointments: {
            where: {
              status: 'attended',
              attendedAt: {
                not: null,
              },
            },
            orderBy: {
              attendedAt: 'desc',
            },
            take: 1,
            select: {
              attendedAt: true,
              attendedBy: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),
      prisma.patient.count({ where }),
    ]);

    // Transformar los datos para incluir lastAttendedDate y lastAttendedBy
    const patientsWithLastAttended = patients.map(patient => {
      const lastAppointment = patient.appointments[0];
      return {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dni: patient.dni,
        dateOfBirth: patient.dateOfBirth,
        sex: patient.sex,
        phone: patient.phone,
        email: patient.email,
        createdAt: patient.createdAt,
        createdBy: patient.createdBy,
        lastAttendedDate: lastAppointment?.attendedAt || null,
        lastAttendedBy: lastAppointment?.attendedBy || null,
      };
    });

    res.json({
      data: patientsWithLastAttended,
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
            appointmentServices: {
              include: {
                order: {
                  include: {
                    service: true,
                  },
                },
              },
            },
            appointmentNotes: {
              orderBy: { createdAt: 'desc' },
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
            attendedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            patientRecords: {
              orderBy: { createdAt: 'desc' },
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
          },
          orderBy: { scheduledDate: 'desc' },
        },
        orders: {
          include: {
            service: true,
            appointmentServices: {
              include: {
                appointment: {
                  select: {
                    id: true,
                    scheduledDate: true,
                    status: true,
                  },
                },
              },
              orderBy: { sessionNumber: 'asc' },
            },
            invoice: {
              include: {
                payments: {
                  select: {
                    id: true,
                    amountPaid: true,
                    paymentMethod: true,
                    paymentDate: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
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
        dateOfBirth: parseStartOfDay(dateOfBirth),
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
        dateOfBirth: dateOfBirth ? parseStartOfDay(dateOfBirth) : undefined,
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

    // Obtener información del paciente
    const patient = await prisma.patient.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        createdAt: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    // Obtener todas las citas del paciente
    const appointments = await prisma.appointment.findMany({
      where: { patientId: id },
      include: {
        appointmentServices: {
          include: {
            order: {
              select: {
                id: true,
                totalSessions: true,
                service: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        attendedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        patientRecords: {
          include: {
            originalService: true,
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        appointmentNotes: {
          orderBy: { createdAt: 'desc' },
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
      },
      orderBy: { scheduledDate: 'desc' },
    });

    // Calcular estadísticas
    const totalAppointments = appointments.length;
    const attendedAppointments = appointments.filter(a => a.status === 'attended').length;
    const cancelledAppointments = appointments.filter(a => a.status === 'cancelled').length;
    const noShowAppointments = appointments.filter(a => a.status === 'no_show').length;

    const lastAttended = appointments.find(a => a.status === 'attended' && a.attendedAt);
    const lastAppointment = appointments[0];

    const history = {
      patient,
      statistics: {
        totalAppointments,
        attendedAppointments,
        cancelledAppointments,
        noShowAppointments,
        registrationDate: patient.createdAt,
        lastAttendedDate: lastAttended?.attendedAt || null,
        lastAppointmentDate: lastAppointment?.scheduledDate || null,
      },
      appointments,
    };

    res.json(history);
  } catch (error) {
    console.error('Error fetching patient history:', error);
    res.status(500).json({ error: 'Failed to fetch patient history' });
  }
};

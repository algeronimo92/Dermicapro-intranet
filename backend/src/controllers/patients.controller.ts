import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { parseStartOfDay } from '../utils/dateUtils';
import { hashPassword } from '../utils/password';

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
          photoUrl: true,
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
        photoUrl: patient.photoUrl ?? null,
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
    res.status(500).json({ error: 'Error al obtener pacientes' });
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
              where: { deletedAt: null },
              include: {
                serviceInstance: {
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
              where: { deletedAt: null },   // excluir sesiones soft-deleted
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
            paymentOrder: {
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
            concludedBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!patient) {
      throw new AppError('Paciente no encontrado', 404);
    }

    res.json(patient);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al obtener paciente' });
    }
  }
};

export const createPatient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, dni, dateOfBirth, sex, phone, email, address, photoUrl } = req.body;

    if (!firstName || !lastName || !dni || !dateOfBirth || !sex) {
      throw new AppError('Faltan campos requeridos', 400);
    }

    const existingPatient = await prisma.patient.findUnique({
      where: { dni },
    });

    if (existingPatient) {
      throw new AppError('Ya existe un paciente con este DNI', 409);
    }

    // Hash del DNI para usarlo como contraseña inicial
    const passwordHash = await hashPassword(dni);

    const patient = await prisma.patient.create({
      data: {
        firstName,
        lastName,
        dni,
        dateOfBirth: parseStartOfDay(dateOfBirth),
        sex,
        phone,
        email: email || dni,
        address,
        photoUrl: photoUrl || null,
        createdById: req.user!.id,
        passwordHash,
        hasPortalAccess: true,
        passwordSetByStaffId: req.user!.id,
        passwordSetAt: new Date(),
      },
    });

    res.status(201).json(patient);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al crear paciente' });
    }
  }
};

export const updatePatient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { firstName, lastName, dateOfBirth, sex, phone, email, address, photoUrl } = req.body;

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
        ...(photoUrl !== undefined && { photoUrl }),
      },
    });

    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar paciente' });
  }
};

export const resetPatientPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      throw new AppError('La nueva contraseña debe tener al menos 6 caracteres', 400);
    }

    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) throw new AppError('Paciente no encontrado', 404);

    const passwordHash = await hashPassword(newPassword);

    await prisma.patient.update({
      where: { id },
      data: {
        passwordHash,
        passwordSetByStaffId: req.user!.id,
        passwordSetAt: new Date(),
      },
    });

    res.json({ message: 'Contraseña del paciente actualizada correctamente' });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al restablecer contraseña del paciente' });
    }
  }
};

export const deletePatient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.patient.delete({
      where: { id },
    });

    res.json({ message: 'Paciente eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar paciente' });
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
        photoUrl: true,
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
      res.status(404).json({ error: 'Paciente no encontrado' });
      return;
    }

    // Obtener todas las citas del paciente
    const appointments = await prisma.appointment.findMany({
      where: { patientId: id },
      include: {
        appointmentServices: {
          where: { deletedAt: null },
          include: {
            serviceInstance: {
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

    // Tratamientos concluidos anticipadamente
    const concludedOrders = await prisma.serviceInstance.findMany({
      where: { patientId: id, concludedAt: { not: null } },
      include: {
        service: { select: { id: true, name: true } },
        concludedBy: { select: { id: true, firstName: true, lastName: true } },
        appointmentServices: {
          where: { deletedAt: null },
          include: { appointment: { select: { status: true } } },
        },
      },
      orderBy: { concludedAt: 'desc' },
    });

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
      concludedOrders,
    };

    res.json(history);
  } catch (error) {
    console.error('Error fetching patient history:', error);
    res.status(500).json({ error: 'Error al obtener historial del paciente' });
  }
};

export const getCreditHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const patient = await prisma.patient.findUnique({
      where: { id },
      select: { id: true, accountBalance: true },
    });
    if (!patient) { res.status(404).json({ error: 'Paciente no encontrado' }); return; }

    const credits = await prisma.payment.findMany({
      where: {
        patientId: id,
        OR: [
          { paymentType: 'account_credit' },
          { paymentMethod: 'account_credit' },
        ],
      },
      orderBy: { paymentDate: 'desc' },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        paymentOrder: { select: { id: true } },
      },
    });

    res.json({ accountBalance: patient.accountBalance, credits });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener historial de crédito' });
  }
};

export const closeServiceInstance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: patientId, orderId } = req.params;
    const { reason } = req.body;

    const order = await prisma.serviceInstance.findFirst({
      where: { id: orderId, patientId },
    });

    if (!order) {
      res.status(404).json({ error: 'Servicio no encontrado para este paciente' });
      return;
    }
    if (order.concludedAt) {
      res.status(400).json({ error: 'Este tratamiento ya fue concluido' });
      return;
    }

    const updated = await prisma.serviceInstance.update({
      where: { id: orderId },
      data: {
        concludedAt: new Date(),
        concludedById: req.user!.id,
        concludeReason: reason || 'Concluido anticipadamente',
      },
      include: { service: { select: { name: true } } },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error al concluir tratamiento' });
  }
};

export const reopenServiceInstance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: patientId, orderId } = req.params;

    const order = await prisma.serviceInstance.findFirst({
      where: { id: orderId, patientId },
    });

    if (!order) { res.status(404).json({ error: 'Servicio no encontrado' }); return; }

    const updated = await prisma.serviceInstance.update({
      where: { id: orderId },
      data: { concludedAt: null, concludedById: null, concludeReason: null },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error al reabrir tratamiento' });
  }
};

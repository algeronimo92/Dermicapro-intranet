import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { prepareDateRange } from '../utils/dateUtils';

export const getAllAppointments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', status, date, dateFrom, dateTo, userId, showCancelled } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {};

    if (status) {
      where.status = status;
    } else if (showCancelled !== 'true') {
      // Si showCancelled no es explícitamente 'true', excluir las citas canceladas por defecto
      where.status = {
        not: 'cancelled'
      };
    }

    // ✅ Soporte para fecha única (date) o rango de fechas (dateFrom/dateTo)
    if (date) {
      const dateRange = prepareDateRange(date as string, date as string);
      where.scheduledDate = dateRange;
    } else if (dateFrom || dateTo) {
      const dateRange = prepareDateRange(dateFrom as string | undefined, dateTo as string | undefined);
      if (dateRange.gte || dateRange.lte) {
        where.scheduledDate = dateRange;
      }
    }

    if (req.user?.roleName === 'sales') {
      where.createdById = req.user.id;
    }

    if (userId && req.user?.roleName === 'admin') {
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
          appointmentServices: {
            include: {
              order: {
                include: {
                  service: {
                    select: {
                      id: true,
                      name: true,
                      basePrice: true,
                    },
                  },
                },
              },
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
        },
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
    const { patientId, scheduledDate, durationMinutes, reservationAmount, services } = req.body;

    if (!patientId || !scheduledDate) {
      throw new AppError('Missing required fields: patientId and scheduledDate', 400);
    }

    if (!services || !Array.isArray(services) || services.length === 0) {
      throw new AppError('At least one service/session is required', 400);
    }

    // Validar que todas las sesiones tengan los campos requeridos
    for (const session of services) {
      if (!session.serviceId || session.sessionNumber === undefined) {
        throw new AppError('Each session must have serviceId and sessionNumber', 400);
      }
    }

    // Ejecutar todas las operaciones dentro de una transacción
    const appointment = await prisma.$transaction(async (tx) => {
      // ============================================
      // PASO 1: Crear el Appointment
      // ============================================
      const createdAppointment = await tx.appointment.create({
        data: {
          patientId,
          scheduledDate: new Date(scheduledDate),
          durationMinutes: durationMinutes ? parseInt(durationMinutes) : 60,
          reservationAmount: reservationAmount ? parseFloat(reservationAmount) : null,
          createdById: req.user!.id,
          status: 'reserved',
        },
      });

      // ============================================
      // PASO 2: Crear nuevos paquetes (Orders) para tempPackageIds
      // ============================================
      const tempPackageGroups = new Map<string, typeof services>();
      const newOrdersMap = new Map<string, string>(); // tempPackageId → orderId real

      services.forEach((session: any) => {
        if (session.tempPackageId) {
          if (!tempPackageGroups.has(session.tempPackageId)) {
            tempPackageGroups.set(session.tempPackageId, []);
          }
          tempPackageGroups.get(session.tempPackageId)!.push(session);
        }
      });

      for (const [tempPackageId, sessionsInPackage] of tempPackageGroups.entries()) {
        const firstSession = sessionsInPackage[0];
        const service = await tx.service.findUnique({
          where: { id: firstSession.serviceId },
        });

        if (!service) {
          throw new AppError(`Service not found: ${firstSession.serviceId}`, 404);
        }

        // Determinar precio final: usar customPrice si está disponible, sino basePrice
        const customPrice = firstSession.customPrice;
        const finalPrice = customPrice !== undefined && customPrice !== null
          ? parseFloat(customPrice.toString())
          : Number(service.basePrice);

        // Calcular descuento si hay precio personalizado
        const discount = customPrice !== undefined && customPrice !== null
          ? Number(service.basePrice) - finalPrice
          : 0;

        // Crear el nuevo Order
        const createdOrder = await tx.order.create({
          data: {
            patientId,
            serviceId: firstSession.serviceId,
            totalSessions: service.defaultSessions || sessionsInPackage.length,
            originalPrice: service.basePrice,
            discount,
            finalPrice,
            createdById: req.user!.id,
          },
        });

        // Mapear tempPackageId → orderId real
        newOrdersMap.set(tempPackageId, createdOrder.id);
      }

      // ============================================
      // PASO 3: Crear todas las sesiones (AppointmentServices)
      // ============================================
      for (const session of services) {
        let finalOrderId = session.orderId;

        // Si tiene tempPackageId, usar el orderId real recién creado
        if (session.tempPackageId) {
          finalOrderId = newOrdersMap.get(session.tempPackageId);

          if (!finalOrderId) {
            throw new AppError(
              `Order not found for tempPackageId: ${session.tempPackageId}`,
              500
            );
          }
        }

        if (!finalOrderId) {
          throw new AppError('OrderId or tempPackageId is required for each session', 400);
        }

        // Crear AppointmentService
        await tx.appointmentService.create({
          data: {
            appointmentId: createdAppointment.id,
            orderId: finalOrderId,
            sessionNumber: session.sessionNumber,
          },
        });
      }

      // ============================================
      // PASO 4: Crear comisión si hay reservationAmount
      // ============================================
      if (reservationAmount && parseFloat(reservationAmount) > 0) {
        const commissionRate = 0.1; // 10% commission rate
        await tx.commission.create({
          data: {
            salesPersonId: req.user!.id,
            appointmentId: createdAppointment.id,
            commissionRate,
            commissionAmount: parseFloat(reservationAmount) * commissionRate,
            status: 'pending',
          },
        });
      }

      // ============================================
      // PASO 5: Retornar appointment con todas las relaciones
      // ============================================
      const fullAppointment = await tx.appointment.findUnique({
        where: { id: createdAppointment.id },
        include: {
          patient: true,
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          appointmentServices: {
            include: {
              order: {
                include: {
                  service: true,
                },
              },
            },
          },
        },
      });

      return fullAppointment;
    });

    res.status(201).json(appointment);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error creating appointment:', error);
      res.status(500).json({ error: 'Failed to create appointment' });
    }
  }
};

export const updateAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { scheduledDate, durationMinutes, status, sessionOperations } = req.body;

    console.log('🔍 BACKEND DEBUG: Received sessionOperations =', JSON.stringify(sessionOperations, null, 2));
    console.log('🔍 BACKEND DEBUG: Full body =', JSON.stringify(req.body, null, 2));

    // Ejecutar todas las operaciones dentro de una transacción
    const appointment = await prisma.$transaction(async (tx) => {
      // ============================================
      // PASO 1: Soft delete de sesiones marcadas
      // ============================================
      if (sessionOperations?.toDelete && sessionOperations.toDelete.length > 0) {
        await tx.appointmentService.updateMany({
          where: {
            id: { in: sessionOperations.toDelete },
            appointmentId: id,  // Seguridad: solo de esta cita
          },
          data: {
            deletedAt: new Date(),
            deletedById: req.user!.id,
            deleteReason: 'Eliminado por usuario desde simulación',
          },
        });
      }

      // ============================================
      // PASO 2: Crear nuevos paquetes (Orders)
      // ============================================
      const newOrdersMap = new Map<string, string>(); // tempPackageId → orderId real

      if (sessionOperations?.newOrders && sessionOperations.newOrders.length > 0) {
        for (const newOrder of sessionOperations.newOrders) {
          const service = await tx.service.findUnique({
            where: { id: newOrder.serviceId },
          });

          if (!service) {
            throw new AppError(`Service not found: ${newOrder.serviceId}`, 404);
          }

          // Obtener el paciente de la cita
          const apt = await tx.appointment.findUnique({
            where: { id },
            select: { patientId: true },
          });

          if (!apt) {
            throw new AppError('Appointment not found', 404);
          }

          // Crear el nuevo Order
          const createdOrder = await tx.order.create({
            data: {
              patientId: apt.patientId,
              serviceId: newOrder.serviceId,
              totalSessions: newOrder.totalSessions,
              originalPrice: service.basePrice,
              discount: 0,
              finalPrice: service.basePrice,
              createdById: req.user!.id,
            },
          });

          // Mapear tempPackageId → orderId real
          newOrdersMap.set(newOrder.tempPackageId, createdOrder.id);
        }
      }

      // ============================================
      // PASO 3: Crear nuevas sesiones
      // ============================================
      if (sessionOperations?.toCreate && sessionOperations.toCreate.length > 0) {
        for (const newSession of sessionOperations.toCreate) {
          let finalOrderId = newSession.orderId;

          // Si tiene tempPackageId, usar el orderId real recién creado
          if (newSession.tempPackageId) {
            finalOrderId = newOrdersMap.get(newSession.tempPackageId);

            if (!finalOrderId) {
              throw new AppError(
                `Order not found for tempPackageId: ${newSession.tempPackageId}`,
                500
              );
            }
          }

          if (!finalOrderId) {
            throw new AppError('OrderId is required for new session', 400);
          }

          // Crear AppointmentService
          await tx.appointmentService.create({
            data: {
              appointmentId: id,
              orderId: finalOrderId,
              sessionNumber: newSession.sessionNumber,
            },
          });
        }
      }

      // ============================================
      // PASO 3.5: Actualizar precios de paquetes existentes
      // ============================================
      if (sessionOperations?.orderPriceUpdates && sessionOperations.orderPriceUpdates.length > 0) {
        for (const priceUpdate of sessionOperations.orderPriceUpdates) {
          await tx.order.update({
            where: { id: priceUpdate.orderId },
            data: {
              finalPrice: priceUpdate.finalPrice,
            },
          });
        }
      }

      // ============================================
      // PASO 4: Actualizar datos básicos del Appointment
      // ============================================
      const updatedAppointment = await tx.appointment.update({
        where: { id },
        data: {
          scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
          durationMinutes: durationMinutes ? parseInt(durationMinutes) : undefined,
          status,
        },
        include: {
          patient: true,
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
          },
          appointmentServices: {
            where: {
              deletedAt: null,  // Solo sesiones activas (no eliminadas)
            },
            include: {
              order: {
                include: {
                  service: true,
                },
              },
            },
          },
        },
      });

      return updatedAppointment;
    });

    res.json(appointment);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error updating appointment:', error);
      res.status(500).json({ error: 'Failed to update appointment' });
    }
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

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'attended',
        attendedById: req.user!.id,
        attendedAt: new Date(),
      },
      include: {
        patient: true,
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
        },
        appointmentServices: {
          include: {
            order: {
              include: {
                service: true,
              },
            },
          },
        },
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

export const uploadTreatmentPhotos = async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      throw new AppError('No files uploaded', 400);
    }

    const urls = files.map(file => `/uploads/${file.filename}`);
    res.json({ urls });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to upload photos' });
    }
  }
};

export const addPhotosToAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { photoUrls, type } = req.body;

    if (!photoUrls || !Array.isArray(photoUrls) || photoUrls.length === 0) {
      throw new AppError('No photo URLs provided', 400);
    }

    if (type !== 'before' && type !== 'after') {
      throw new AppError('Invalid photo type. Must be "before" or "after"', 400);
    }

    // Get the appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patientRecords: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    // Get or create patient record for this appointment
    let patientRecord = appointment.patientRecords[0];

    if (!patientRecord) {
      // Create a new patient record if none exists
      patientRecord = await prisma.patientRecord.create({
        data: {
          patientId: appointment.patientId,
          appointmentId: appointment.id,
          createdById: req.user!.id,
          beforePhotoUrls: type === 'before' ? photoUrls : [],
          afterPhotoUrls: type === 'after' ? photoUrls : [],
        },
      });
    } else {
      // Update existing patient record
      const currentBeforePhotos = (patientRecord.beforePhotoUrls as string[]) || [];
      const currentAfterPhotos = (patientRecord.afterPhotoUrls as string[]) || [];

      patientRecord = await prisma.patientRecord.update({
        where: { id: patientRecord.id },
        data: {
          beforePhotoUrls: type === 'before'
            ? [...currentBeforePhotos, ...photoUrls]
            : currentBeforePhotos,
          afterPhotoUrls: type === 'after'
            ? [...currentAfterPhotos, ...photoUrls]
            : currentAfterPhotos,
        },
      });
    }

    // Return updated appointment with patient records
    const updatedAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
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
        },
        appointmentServices: {
          include: {
            order: {
              include: {
                service: true,
              },
            },
          },
        },
      },
    });

    res.json(updatedAppointment);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to add photos to appointment' });
    }
  }
};

export const updateBodyMeasurements = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { weight, bodyMeasurement, healthNotes } = req.body;

    // Get the appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patientRecords: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    // Get or create patient record for this appointment
    let patientRecord = appointment.patientRecords[0];

    if (!patientRecord) {
      // Create a new patient record if none exists
      patientRecord = await prisma.patientRecord.create({
        data: {
          patientId: appointment.patientId,
          appointmentId: appointment.id,
          createdById: req.user!.id,
          weight: weight ? parseFloat(weight) : null,
          bodyMeasurement: bodyMeasurement || null,
          healthNotes: healthNotes || null,
        },
      });
    } else {
      // Update existing patient record
      patientRecord = await prisma.patientRecord.update({
        where: { id: patientRecord.id },
        data: {
          weight: weight !== undefined ? (weight ? parseFloat(weight) : null) : undefined,
          bodyMeasurement: bodyMeasurement !== undefined ? bodyMeasurement : undefined,
          healthNotes: healthNotes !== undefined ? healthNotes : undefined,
        },
      });
    }

    // Return updated appointment with patient records
    const updatedAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
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
        },
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
                role: true,
              },
            },
          },
        },
      },
    });

    res.json(updatedAppointment);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update body measurements' });
    }
  }
};

export const createAppointmentNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!note || note.trim() === '') {
      throw new AppError('Note content is required', 400);
    }

    // Verify appointment exists
    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    // Create the note
    const appointmentNote = await prisma.appointmentNote.create({
      data: {
        appointmentId: id,
        note: note.trim(),
        createdById: req.user!.id,
      },
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
    });

    res.status(201).json(appointmentNote);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create appointment note' });
    }
  }
};

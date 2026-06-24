import { Request, Response } from 'express';
import fs from 'fs';
import { getPrisma } from '../utils/tenant';
import { AppError } from '../middlewares/errorHandler';
import { prepareDateRange } from '../utils/dateUtils';
import { ROLES } from '../constants/roles';

export const getAllAppointments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', status, date, dateFrom, dateTo, userId, showCancelled, patientId } = req.query;

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

    if (patientId) {
      where.patientId = patientId;
    }

    if (userId && req.user?.roleName === ROLES.ADMIN) {
      where.createdById = userId;
    }

    const [appointments, total] = await Promise.all([
      getPrisma(req).appointment.findMany({
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
              photoUrl: true,
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
              serviceInstance: {
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
          payments: {
            where: { paymentType: 'reservation', voidedAt: null },
            select: { id: true, receiptUrl: true, receiptUrls: true, amountPaid: true, paymentMethod: true },
            take: 1,
          },
        },
      }),
      getPrisma(req).appointment.count({ where }),
    ]);

    res.json({
      data: appointments.map(withReservationPayment),
      pagination: {
        page: parseInt(page as string),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener citas' });
  }
};

export const getAppointmentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const appointment = await getPrisma(req).appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true, photoUrl: true },
        },
        attendedBy: {
          select: { id: true, firstName: true, lastName: true, email: true, photoUrl: true },
        },
        attendees: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, photoUrl: true },
            },
            addedBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { addedAt: 'asc' },
        },
        patientRecords: {
          orderBy: { createdAt: 'desc' },
        },
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
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        payments: {
          where: { paymentType: 'reservation', voidedAt: null },
          select: { id: true, receiptUrl: true, receiptUrls: true, amountPaid: true, paymentMethod: true },
          take: 1,
        },
      },
    });

    if (!appointment) {
      throw new AppError('Cita no encontrada', 404);
    }

    res.json(withReservationPayment(appointment));
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al obtener cita' });
    }
  }
};

export const createAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId, scheduledDate, durationMinutes, reservationAmount, reservationPaymentMethod, services } = req.body;

    if (!patientId || !scheduledDate) {
      throw new AppError('Faltan campos requeridos: patientId y scheduledDate', 400);
    }

    if (!services || !Array.isArray(services) || services.length === 0) {
      throw new AppError('Se requiere al menos un servicio/sesión', 400);
    }

    // Validar que todas las sesiones tengan los campos requeridos
    for (const session of services) {
      if (!session.serviceId || session.sessionNumber === undefined) {
        throw new AppError('Cada sesión debe tener serviceId y sessionNumber', 400);
      }
    }

    // Ejecutar todas las operaciones dentro de una transacción
    const appointment = await getPrisma(req).$transaction(async (tx) => {
      // ============================================
      // PASO 1: Crear el Appointment
      // ============================================
      const createdAppointment = await tx.appointment.create({
        data: {
          patientId,
          scheduledDate: new Date(scheduledDate),
          durationMinutes: durationMinutes ? parseInt(durationMinutes) : 60,
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
        const service = await tx.serviceTemplate.findUnique({
          where: { id: firstSession.serviceId },
        });

        if (!service) {
          throw new AppError(`Servicio no encontrado: ${firstSession.serviceId}`, 404);
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
        const createdOrder = await tx.serviceInstance.create({
          data: {
            patientId,
            serviceTemplateId: firstSession.serviceId,
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
              `Orden no encontrada para tempPackageId: ${session.tempPackageId}`,
              500
            );
          }
        }

        if (!finalOrderId) {
          throw new AppError('Se requiere orderId o tempPackageId para cada sesión', 400);
        }

        // Crear AppointmentService
        await tx.session.create({
          data: {
            appointmentId: createdAppointment.id,
            serviceInstanceId: finalOrderId,
            sessionNumber: session.sessionNumber,
          },
        });
      }

      // ============================================
      // PASO 4: Crear comisiones por cada paquete/servicio vendido
      // ============================================
      // Nota: Las comisiones se generan cuando se marca la cita como "attended"

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
              serviceInstance: {
                include: {
                  service: true,
                },
              },
            },
          },
        },
      });

      // ============================================
      // PASO FINAL: Registrar pago de reserva y acreditar al paciente
      // ============================================
      const parsedReservation = reservationAmount ? parseFloat(reservationAmount) : 0;
      if (parsedReservation > 0 && reservationPaymentMethod && fullAppointment) {
        await tx.payment.create({
          data: {
            patientId,
            appointmentId: fullAppointment.id,
            amountPaid: parsedReservation,
            paymentMethod: reservationPaymentMethod,
            paymentType: 'reservation',
            createdById: req.user!.id,
          },
        });

        await tx.patient.update({
          where: { id: patientId },
          data: { accountBalance: { increment: parsedReservation } },
        });
      }

      return fullAppointment;
    });

    res.status(201).json(appointment);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error creating appointment:', error);
      res.status(500).json({ error: 'Error al crear cita' });
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
    const appointment = await getPrisma(req).$transaction(async (tx) => {
      // ============================================
      // PASO 1: Soft delete de sesiones marcadas
      // ============================================
      if (sessionOperations?.toDelete && sessionOperations.toDelete.length > 0) {
        // Obtener las sesiones a eliminar para saber a qué orders pertenecen
        const sessionsToDelete = await tx.session.findMany({
          where: { id: { in: sessionOperations.toDelete }, appointmentId: id },
          select: { id: true, serviceInstanceId: true },
        });

        await tx.session.updateMany({
          where: {
            id: { in: sessionOperations.toDelete },
            appointmentId: id,
          },
          data: {
            deletedAt: new Date(),
            deletedById: req.user!.id,
            deleteReason: 'Eliminado por usuario desde simulación',
          },
        });

        // Si un serviceInstance queda sin sesiones activas Y sin orden de pago → eliminarlo
        const affectedOrderIds = [...new Set(sessionsToDelete.map(s => s.serviceInstanceId).filter(Boolean))];
        for (const orderId of affectedOrderIds) {
          const order = await tx.serviceInstance.findUnique({
            where: { id: orderId! },
            include: { appointmentServices: { where: { deletedAt: null } } },
          });
          if (order && order.appointmentServices.length === 0 && !order.paymentOrderId) {
            // Eliminar primero TODAS las sesiones (incluidas soft-deleted) para liberar el FK
            await tx.session.deleteMany({ where: { serviceInstanceId: orderId! } });
            // Ahora eliminar el serviceInstance
            await tx.serviceInstance.delete({ where: { id: orderId! } });
          }
        }
      }

      // ============================================
      // PASO 2: Crear nuevos paquetes (Orders)
      // ============================================
      const newOrdersMap = new Map<string, string>(); // tempPackageId → orderId real

      if (sessionOperations?.newOrders && sessionOperations.newOrders.length > 0) {
        for (const newOrder of sessionOperations.newOrders) {
          const service = await tx.serviceTemplate.findUnique({
            where: { id: newOrder.serviceId },
          });

          if (!service) {
            throw new AppError(`Servicio no encontrado: ${newOrder.serviceId}`, 404);
          }

          // Obtener el paciente de la cita
          const apt = await tx.appointment.findUnique({
            where: { id },
            select: { patientId: true },
          });

          if (!apt) {
            throw new AppError('Cita no encontrada', 404);
          }

          // Crear el nuevo Order
          const createdOrder = await tx.serviceInstance.create({
            data: {
              patientId: apt.patientId,
              serviceTemplateId: newOrder.serviceId,
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
                `Orden no encontrada para tempPackageId: ${newSession.tempPackageId}`,
                500
              );
            }
          }

          if (!finalOrderId) {
            throw new AppError('Se requiere orderId para la nueva sesión', 400);
          }

          // Crear AppointmentService
          await tx.session.create({
            data: {
              appointmentId: id,
              serviceInstanceId: finalOrderId,
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
          await tx.serviceInstance.update({
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
              serviceInstance: {
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
      res.status(500).json({ error: 'Error al actualizar cita' });
    }
  }
};

export const deleteAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Soft delete: marca la cita como cancelada en lugar de eliminarla
    // Esto preserva el historial, comisiones y registros asociados
    await getPrisma(req).appointment.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    res.json({ message: 'Cita cancelada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al cancelar cita' });
  }
};

const APPOINTMENT_INCLUDE_WITH_ATTENDEES = {
  patient: true,
  createdBy: {
    select: { id: true, firstName: true, lastName: true, email: true, photoUrl: true },
  },
  attendedBy: {
    select: { id: true, firstName: true, lastName: true, email: true, photoUrl: true },
  },
  attendees: {
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true, photoUrl: true },
      },
      addedBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { addedAt: 'asc' as const },
  },
  patientRecords: { orderBy: { createdAt: 'desc' as const } },
  appointmentServices: {
    where: { deletedAt: null },
    include: { serviceInstance: { include: { service: true } } },
  },
  payments: {
    where: { paymentType: 'reservation' as const, voidedAt: null },
    select: { id: true, receiptUrl: true, receiptUrls: true, amountPaid: true, paymentMethod: true },
    take: 1,
  },
};

const withReservationPayment = (apt: any) => {
  if (!apt) return apt;
  const { payments, ...rest } = apt;
  return { ...rest, reservationPayment: payments?.[0] ?? null };
};

export const markAsAttended = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const appointment = await getPrisma(req).$transaction(async (tx) => {
      const existingAppointment = await tx.appointment.findUnique({
        where: { id },
        include: {
          createdBy: true,
          appointmentServices: {
            where: { deletedAt: null },
            include: { serviceInstance: { include: { service: true } } },
          },
        },
      });

      if (!existingAppointment) {
        throw new AppError('Cita no encontrada', 404);
      }

      if (existingAppointment.status === 'attended') {
        throw new AppError('La cita ya fue atendida', 400);
      }

      // Exigir al menos un asistente registrado antes de marcar como attended
      const attendeeCount = await tx.appointmentAttendee.count({
        where: { appointmentId: id },
      });
      if (attendeeCount === 0) {
        throw new AppError('Debe agregar al menos un profesional antes de marcar como atendida', 400);
      }

      // Marcar como attended — attendedById es audit trail inmutable de quién presionó el botón
      const updatedAppointment = await tx.appointment.update({
        where: { id },
        data: {
          status: 'attended',
          attendedById: req.user!.id,
          attendedAt: new Date(),
        },
        include: APPOINTMENT_INCLUDE_WITH_ATTENDEES,
      });

      // Generar comisiones por cada orden única
      const serviceInstanceIds = [...new Set(
        existingAppointment.appointmentServices
          .map(as => as.serviceInstanceId)
          .filter(Boolean)
      )];

      for (const serviceInstanceId of serviceInstanceIds) {
        const appointmentService = existingAppointment.appointmentServices.find(
          as => as.serviceInstanceId === serviceInstanceId
        );

        if (!appointmentService?.serviceInstance) continue;

        const order = appointmentService.serviceInstance;

        const existingCommission = await tx.commission.findFirst({
          where: { appointmentId: id, serviceInstanceId },
        });

        if (!existingCommission) {
          const baseAmount = order.finalPrice;
          let commissionAmount = 0;
          let commissionRate = null;
          const commissionType = order.service.commissionType || 'percentage';

          if (commissionType === 'percentage') {
            commissionRate = order.service.commissionRate || 0.05;
            commissionAmount = Number(baseAmount) * Number(commissionRate);
          } else if (commissionType === 'fixed') {
            commissionAmount = Number(order.service.commissionFixedAmount || 0);
          }

          await tx.commission.create({
            data: {
              salesPersonId: existingAppointment.createdBy.id,
              appointmentId: id,
              serviceInstanceId,
              serviceTemplateId: order.serviceTemplateId,
              commissionRate: commissionRate || 0,
              baseAmount,
              commissionAmount,
              status: 'pending',
              notes: `Comisión por asistencia a ${order.service.name}`,
            },
          });
        }
      }

      return updatedAppointment;
    });

    res.json(withReservationPayment(appointment));
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error marking appointment as attended:', error);
      res.status(500).json({ error: 'Error al marcar cita como atendida' });
    }
  }
};

export const addAttendee = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'Se requiere userId' });
      return;
    }

    const appointment = await getPrisma(req).appointment.findUnique({ where: { id } });
    if (!appointment) {
      res.status(404).json({ error: 'Cita no encontrada' });
      return;
    }

    const canManagePostAttended = ['admin', 'sales'].includes(req.user!.roleName ?? '');
    if (appointment.status === 'attended' && !canManagePostAttended) {
      res.status(403).json({ error: 'Solo administradores o vendedores pueden modificar los asistentes de una cita ya atendida' });
      return;
    }

    const userExists = await getPrisma(req).user.findUnique({ where: { id: userId } });
    if (!userExists) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    await getPrisma(req).appointmentAttendee.upsert({
      where: { appointmentId_userId: { appointmentId: id, userId } },
      create: { appointmentId: id, userId, addedById: req.user!.id },
      update: {},
    });

    const updated = await getPrisma(req).appointment.findUnique({
      where: { id },
      include: APPOINTMENT_INCLUDE_WITH_ATTENDEES,
    });

    res.json(withReservationPayment(updated));
  } catch (error) {
    console.error('Error adding attendee:', error);
    res.status(500).json({ error: 'Error al agregar asistente' });
  }
};

export const removeAttendee = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, userId } = req.params;

    const appointment = await getPrisma(req).appointment.findUnique({ where: { id } });
    if (!appointment) {
      res.status(404).json({ error: 'Cita no encontrada' });
      return;
    }

    const canManagePostAttended = ['admin', 'sales'].includes(req.user!.roleName ?? '');
    if (appointment.status === 'attended' && !canManagePostAttended) {
      res.status(403).json({ error: 'Solo administradores o vendedores pueden modificar los asistentes de una cita ya atendida' });
      return;
    }

    const attendee = await getPrisma(req).appointmentAttendee.findUnique({
      where: { appointmentId_userId: { appointmentId: id, userId } },
    });

    if (!attendee) {
      res.status(404).json({ error: 'Asistente no encontrado' });
      return;
    }

    await getPrisma(req).appointmentAttendee.delete({
      where: { appointmentId_userId: { appointmentId: id, userId } },
    });

    const updated = await getPrisma(req).appointment.findUnique({
      where: { id },
      include: APPOINTMENT_INCLUDE_WITH_ATTENDEES,
    });

    res.json(withReservationPayment(updated));
  } catch (error) {
    console.error('Error removing attendee:', error);
    res.status(500).json({ error: 'Error al eliminar asistente' });
  }
};

export const uploadReceipt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const amount = req.body.amount ? parseFloat(req.body.amount) : 0;
    const paymentMethod = req.body.paymentMethod ?? 'cash';
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      throw new AppError('No se subieron archivos', 400);
    }

    const receiptUrls = files.map(f => `/uploads/${f.filename}`);

    const appointment = await getPrisma(req).$transaction(async (tx) => {
      const apt = await tx.appointment.findUnique({
        where: { id },
        select: { id: true, patientId: true },
      });
      if (!apt) throw new AppError('Cita no encontrada', 404);

      if (amount > 0) {
        const existing = await tx.payment.findFirst({
          where: { appointmentId: id, paymentType: 'reservation', voidedAt: null },
        });

        if (!existing) {
          await tx.payment.create({
            data: {
              patientId: apt.patientId,
              appointmentId: id,
              amountPaid: amount,
              paymentMethod,
              paymentType: 'reservation',
              receiptUrl: receiptUrls[0],
              receiptUrls,
              createdById: req.user!.id,
            },
          });

          await tx.patient.update({
            where: { id: apt.patientId },
            data: { accountBalance: { increment: amount } },
          });
        } else {
          const currentUrls = existing.receiptUrls || [];
          const mergedUrls = [...currentUrls, ...receiptUrls].slice(0, 3);
          await tx.payment.update({
            where: { id: existing.id },
            data: {
              receiptUrl: mergedUrls[0],
              receiptUrls: mergedUrls,
            },
          });
        }
      }

      return apt;
    });

    const fresh = await getPrisma(req).appointment.findUnique({
      where: { id },
      include: {
        payments: {
          where: { paymentType: 'reservation', voidedAt: null },
          select: { id: true, receiptUrl: true, receiptUrls: true, amountPaid: true, paymentMethod: true },
          take: 1,
        },
      },
    });

    res.json({ urls: receiptUrls, appointment: withReservationPayment(fresh ?? appointment) });
  } catch (error) {
    const files = req.files as Express.Multer.File[] | undefined;
    if (files) files.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al subir comprobante' });
    }
  }
};

export const uploadTreatmentPhotos = async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      throw new AppError('No se subieron archivos', 400);
    }

    const urls = files.map(file => `/uploads/${file.filename}`);
    res.json({ urls });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al subir fotos' });
    }
  }
};

export const addPhotosToAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { photoUrls, type } = req.body;

    if (!photoUrls || !Array.isArray(photoUrls) || photoUrls.length === 0) {
      throw new AppError('No se proporcionaron URLs de fotos', 400);
    }

    if (type !== 'before' && type !== 'after') {
      throw new AppError('Tipo de foto inválido. Debe ser "before" o "after"', 400);
    }

    // Get the appointment
    const appointment = await getPrisma(req).appointment.findUnique({
      where: { id },
      include: {
        patientRecords: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!appointment) {
      throw new AppError('Cita no encontrada', 404);
    }

    // Get or create patient record for this appointment
    let patientRecord = appointment.patientRecords[0];

    if (!patientRecord) {
      // Create a new patient record if none exists
      patientRecord = await getPrisma(req).patientRecord.create({
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

      patientRecord = await getPrisma(req).patientRecord.update({
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
    const updatedAppointment = await getPrisma(req).appointment.findUnique({
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
            serviceInstance: {
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
      res.status(500).json({ error: 'Error al agregar fotos a la cita' });
    }
  }
};

export const removePhotoFromAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { type, photoUrl } = req.body;

    if (!photoUrl || typeof photoUrl !== 'string') {
      throw new AppError('Se requiere photoUrl', 400);
    }
    if (type !== 'before' && type !== 'after') {
      throw new AppError('El tipo debe ser "before" o "after"', 400);
    }

    const appointment = await getPrisma(req).appointment.findUnique({
      where: { id },
      include: {
        patientRecords: {
          orderBy: { createdAt: 'desc' as const },
          take: 1,
        },
      },
    });

    if (!appointment) throw new AppError('Cita no encontrada', 404);

    const patientRecord = appointment.patientRecords[0];
    if (!patientRecord) throw new AppError('No se encontró registro del paciente', 404);

    const currentBefore = (patientRecord.beforePhotoUrls as string[]) || [];
    const currentAfter  = (patientRecord.afterPhotoUrls  as string[]) || [];

    await getPrisma(req).patientRecord.update({
      where: { id: patientRecord.id },
      data: {
        beforePhotoUrls: type === 'before' ? currentBefore.filter(u => u !== photoUrl) : currentBefore,
        afterPhotoUrls:  type === 'after'  ? currentAfter.filter(u => u !== photoUrl)  : currentAfter,
      },
    });

    // Delete file from disk (best-effort)
    const filename = photoUrl.replace(/^\/uploads\//, '');
    const filePath = `${process.env.UPLOAD_DIR || './uploads'}/${filename}`;
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch { /* ignore */ }

    const updatedAppointment = await getPrisma(req).appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        attendedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        patientRecords: { orderBy: { createdAt: 'desc' as const } },
        appointmentServices: {
          include: { serviceInstance: { include: { service: true } } },
        },
      },
    });

    res.json(updatedAppointment);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al eliminar foto' });
    }
  }
};

export const updateBodyMeasurements = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { weight, bodyMeasurement, healthNotes } = req.body;

    // Get the appointment
    const appointment = await getPrisma(req).appointment.findUnique({
      where: { id },
      include: {
        patientRecords: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!appointment) {
      throw new AppError('Cita no encontrada', 404);
    }

    // Get or create patient record for this appointment
    let patientRecord = appointment.patientRecords[0];

    if (!patientRecord) {
      // Create a new patient record if none exists
      patientRecord = await getPrisma(req).patientRecord.create({
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
      patientRecord = await getPrisma(req).patientRecord.update({
        where: { id: patientRecord.id },
        data: {
          weight: weight !== undefined ? (weight ? parseFloat(weight) : null) : undefined,
          bodyMeasurement: bodyMeasurement !== undefined ? bodyMeasurement : undefined,
          healthNotes: healthNotes !== undefined ? healthNotes : undefined,
        },
      });
    }

    // Return updated appointment with patient records
    const updatedAppointment = await getPrisma(req).appointment.findUnique({
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
      res.status(500).json({ error: 'Error al actualizar medidas corporales' });
    }
  }
};

export const createAppointmentNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!note || note.trim() === '') {
      throw new AppError('El contenido de la nota es requerido', 400);
    }

    // Verify appointment exists
    const appointment = await getPrisma(req).appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      throw new AppError('Cita no encontrada', 404);
    }

    // Create the note
    const appointmentNote = await getPrisma(req).appointmentNote.create({
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
      res.status(500).json({ error: 'Error al crear nota de cita' });
    }
  }
};

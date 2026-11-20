import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { ROLES } from '../constants/roles';
import { logUnexpectedError } from './errorHandler';

type Action = 'edit' | 'photos' | 'receipt' | 'attend' | 'attendees';

// Transiciones de appointmentStateMachine.config.ts, aplicadas también en la API.
const staff = [ROLES.ADMIN, ROLES.MEDICAL_STAFF, ROLES.SALES, ROLES.ASSISTANT];
const managers = [ROLES.ADMIN, ROLES.MEDICAL_STAFF, ROLES.SALES];
const transitions: Record<string, readonly string[]> = {
  'reserved:in_progress': staff,
  'reserved:cancelled': managers,
  'reserved:no_show': managers,
  'in_progress:attended': staff,
  'in_progress:reserved': staff,
  'in_progress:cancelled': managers,
  'in_progress:no_show': managers,
  'attended:in_progress': [ROLES.ADMIN, ROLES.MEDICAL_STAFF],
  'cancelled:reserved': managers,
  'no_show:reserved': managers,
  'no_show:in_progress': [ROLES.ADMIN],
};

// Permisos de acciones de appointmentStates.config.ts.
// El estado se consulta en la base de datos, nunca se toma del cliente.
export const authorizeAppointment = (action: Action) => async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id }, select: { status: true },
    });
    if (!appointment) {
      res.status(404).json({ error: 'Cita no encontrada' });
      return;
    }
    const role = req.user.roleName;
    const isAdmin = role === ROLES.ADMIN;
    const isSales = role === ROLES.SALES;
    const isMedical = role === ROLES.MEDICAL_STAFF;
    const isStaff = isAdmin || isSales || isMedical || role === ROLES.ASSISTANT;
    const active = ['reserved', 'in_progress', 'attended'].includes(appointment.status);
    const editable = ['reserved', 'in_progress'].includes(appointment.status);
    let allowed = false;
    switch (action) {
      case 'edit': {
        const editsDetails = ['scheduledDate', 'durationMinutes', 'sessionOperations']
          .some(key => req.body?.[key] !== undefined);
        // Los asistentes pueden cambiar el estado, pero no editar detalles.
        allowed = isStaff && (!editsDetails || isAdmin || (editable && (isSales || isMedical)));
        const targetStatus = req.body?.status;
        if (targetStatus !== undefined && targetStatus !== appointment.status) {
          allowed = allowed && (transitions[`${appointment.status}:${targetStatus}`]?.includes(role ?? '') ?? false);
        }
        break;
      }
      case 'photos':
        allowed = active && isStaff;
        break;
      case 'attend':
        allowed = appointment.status === 'in_progress' && isStaff;
        break;
      case 'receipt':
        allowed = active && (isAdmin || isSales);
        break;
      case 'attendees':
        allowed = active && (appointment.status === 'attended' ? isAdmin || isSales : isStaff);
        break;
    }
    if (!allowed) {
      res.status(403).json({ error: 'No tienes permiso para esta acción en el estado actual de la cita' });
      return;
    }
    next();
  } catch (error) {
    logUnexpectedError(req, error);
    res.status(500).json({ error: 'Error al verificar permisos de la cita' });
  }
};

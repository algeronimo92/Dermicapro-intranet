import { AppointmentStatus, Role } from '../types';

/**
 * State Machine Configuration for Appointment Status Transitions
 *
 * Matriz de transiciones por rol (basada en diagramas de negocio):
 *
 *  Asistente:     reserved ↔ in_progress → attended
 *  Médico:        reserved ↔ in_progress ↔ attended (puede deshacer)
 *  Ventas:        reserved ↔ in_progress → attended | cancelled | no_show
 *  Admin:         todos los movimientos
 */

export interface TransitionGuard {
  allowedRoles: Role[];
  condition?: (context: TransitionContext) => boolean;
  errorMessage?: string;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

export interface TransitionContext {
  appointment?: any;
  user?: any;
  metadata?: Record<string, any>;
}

export interface StateTransition {
  from: AppointmentStatus;
  to: AppointmentStatus;
  guards: TransitionGuard;
  label: string;
  description: string;
  icon?: string;
  beforeTransition?: (context: TransitionContext) => Promise<void>;
  afterTransition?: (context: TransitionContext) => Promise<void>;
}

// Helper para extraer el nombre del rol (string | RoleInfo)
const resolveRole = (userRole: any): Role | undefined => {
  if (!userRole) return undefined;
  if (typeof userRole === 'string') return userRole as Role;
  if (typeof userRole === 'object' && userRole.name) return userRole.name as Role;
  return undefined;
};

// ============================================
// TRANSICIONES
// ============================================

export const STATE_TRANSITIONS: StateTransition[] = [

  // ══════════════════════════ DESDE RESERVED ══════════════════════════

  {
    from: AppointmentStatus.reserved,
    to: AppointmentStatus.in_progress,
    guards: {
      // Todos los roles pueden iniciar la atención
      allowedRoles: [Role.admin, Role.medical_staff, Role.sales, Role.assistant],
      errorMessage: 'No tienes permiso para iniciar la atención',
    },
    label: 'Iniciar Atención',
    description: 'El paciente llegó y comienza la atención',
    icon: 'play',
  },
  {
    from: AppointmentStatus.reserved,
    to: AppointmentStatus.cancelled,
    guards: {
      allowedRoles: [Role.admin, Role.medical_staff, Role.sales],
      requiresConfirmation: true,
      confirmationMessage: '¿Cancelar esta cita? Esta acción puede afectar las comisiones.',
      errorMessage: 'Solo administradores, personal médico y ventas pueden cancelar citas',
    },
    label: 'Cancelar Cita',
    description: 'Cancelar la cita antes de que inicie',
    icon: 'x',
  },
  {
    from: AppointmentStatus.reserved,
    to: AppointmentStatus.no_show,
    guards: {
      allowedRoles: [Role.admin, Role.medical_staff, Role.sales],
      requiresConfirmation: true,
      confirmationMessage: '¿Confirmas que el paciente no se presentó?',
      errorMessage: 'Solo administradores, personal médico y ventas pueden marcar como no asistió',
    },
    label: 'Paciente no Asistió',
    description: 'El paciente no se presentó a la cita',
    icon: 'user-x',
  },

  // ══════════════════════════ DESDE IN_PROGRESS ══════════════════════════

  {
    from: AppointmentStatus.in_progress,
    to: AppointmentStatus.attended,
    guards: {
      // Todos los roles pueden finalizar la atención
      allowedRoles: [Role.admin, Role.medical_staff, Role.sales, Role.assistant],
      errorMessage: 'No tienes permiso para finalizar la atención',
    },
    label: 'Finalizar Atención',
    description: 'Marcar como atendida y completar el tratamiento',
    icon: 'check',
  },
  {
    from: AppointmentStatus.in_progress,
    to: AppointmentStatus.reserved,
    guards: {
      // Todos los roles pueden revertir a reservada (para corregir errores)
      allowedRoles: [Role.admin, Role.medical_staff, Role.sales, Role.assistant],
      requiresConfirmation: true,
      confirmationMessage: '¿Revertir a Reservada? Se mantendrán los datos ingresados.',
      errorMessage: 'No tienes permiso para revertir el estado',
    },
    label: 'Revertir a Reservada',
    description: 'Regresar al estado reservada',
    icon: 'arrow-left',
  },
  {
    from: AppointmentStatus.in_progress,
    to: AppointmentStatus.cancelled,
    guards: {
      allowedRoles: [Role.admin, Role.medical_staff, Role.sales],
      requiresConfirmation: true,
      confirmationMessage: '¿Cancelar la cita durante la atención?',
      errorMessage: 'Solo administradores, personal médico y ventas pueden cancelar durante la atención',
    },
    label: 'Cancelar',
    description: 'Cancelar la atención en curso',
    icon: 'x',
  },
  {
    from: AppointmentStatus.in_progress,
    to: AppointmentStatus.no_show,
    guards: {
      allowedRoles: [Role.admin, Role.medical_staff, Role.sales],
      requiresConfirmation: true,
      confirmationMessage: '¿Marcar como no asistió? El paciente estaba en atención.',
      errorMessage: 'Solo administradores, personal médico y ventas pueden marcar como no asistió',
    },
    label: 'Paciente no Asistió',
    description: 'El paciente se fue antes de finalizar',
    icon: 'user-x',
  },

  // ══════════════════════════ DESDE ATTENDED ══════════════════════════

  {
    from: AppointmentStatus.attended,
    to: AppointmentStatus.in_progress,
    guards: {
      // Solo médico y admin pueden deshacer una atención finalizada
      allowedRoles: [Role.admin, Role.medical_staff],
      requiresConfirmation: true,
      confirmationMessage: '¿Reabrir la atención? Se podrá agregar más información.',
      errorMessage: 'Solo administradores y personal médico pueden reabrir una atención',
    },
    label: 'Reabrir Atención',
    description: 'Volver a En Atención para agregar información',
    icon: 'refresh',
  },

  // ══════════════════════════ DESDE CANCELLED ══════════════════════════

  {
    from: AppointmentStatus.cancelled,
    to: AppointmentStatus.reserved,
    guards: {
      allowedRoles: [Role.admin, Role.medical_staff, Role.sales],
      requiresConfirmation: true,
      confirmationMessage: '¿Reactivar esta cita cancelada?',
      errorMessage: 'Solo administradores, personal médico y ventas pueden reactivar citas',
    },
    label: 'Reactivar Cita',
    description: 'Restaurar la cita cancelada',
    icon: 'refresh',
  },

  // ══════════════════════════ DESDE NO_SHOW ══════════════════════════

  {
    from: AppointmentStatus.no_show,
    to: AppointmentStatus.reserved,
    guards: {
      allowedRoles: [Role.admin, Role.medical_staff, Role.sales],
      requiresConfirmation: true,
      confirmationMessage: '¿Corregir a Reservada? ¿El estado fue un error?',
      errorMessage: 'Solo administradores, personal médico y ventas pueden corregir este estado',
    },
    label: 'Corregir a Reservada',
    description: 'El estado "no asistió" fue un error',
    icon: 'refresh',
  },
  {
    from: AppointmentStatus.no_show,
    to: AppointmentStatus.in_progress,
    guards: {
      allowedRoles: [Role.admin],
      requiresConfirmation: true,
      confirmationMessage: '¿El paciente llegó tarde? Cambiar a En Atención.',
      errorMessage: 'Solo administradores pueden hacer esta corrección',
    },
    label: 'Paciente Llegó Tarde',
    description: 'El paciente llegó después del horario',
    icon: 'clock',
  },
];

// ============================================
// HELPERS — ahora SÍ filtran por rol
// ============================================

/**
 * Devuelve las transiciones disponibles PARA EL ROL DEL USUARIO
 */
export const getAvailableTransitions = (
  fromStatus: AppointmentStatus,
  userRole?: any,
  context?: TransitionContext
): StateTransition[] => {
  const role = resolveRole(userRole);

  return STATE_TRANSITIONS.filter(t => {
    if (t.from !== fromStatus) return false;

    // Filtrar por rol — si no hay rol, no se muestra ninguna transición
    if (role && !t.guards.allowedRoles.includes(role)) return false;

    if (t.guards.condition && context) {
      return t.guards.condition(context);
    }

    return true;
  });
};

/**
 * Verifica si la transición está permitida para el rol actual
 */
export const canTransition = (
  from: AppointmentStatus,
  to: AppointmentStatus,
  userRole?: any,
  context?: TransitionContext
): { allowed: boolean; reason?: string } => {
  const transition = STATE_TRANSITIONS.find(t => t.from === from && t.to === to);

  if (!transition) {
    return { allowed: false, reason: 'Transición no definida en el sistema' };
  }

  const role = resolveRole(userRole);
  if (role && !transition.guards.allowedRoles.includes(role)) {
    return {
      allowed: false,
      reason: transition.guards.errorMessage || 'No tienes permiso para este cambio de estado',
    };
  }

  if (transition.guards.condition && context) {
    if (!transition.guards.condition(context)) {
      return {
        allowed: false,
        reason: transition.guards.errorMessage || 'No se cumplen las condiciones',
      };
    }
  }

  return { allowed: true };
};

export const getTransition = (
  from: AppointmentStatus,
  to: AppointmentStatus
): StateTransition | undefined =>
  STATE_TRANSITIONS.find(t => t.from === from && t.to === to);

export const getNextStates = (
  currentStatus: AppointmentStatus,
  userRole?: Role,
  context?: TransitionContext
): AppointmentStatus[] =>
  getAvailableTransitions(currentStatus, userRole, context).map(t => t.to);

export const requiresConfirmation = (from: AppointmentStatus, to: AppointmentStatus): boolean =>
  getTransition(from, to)?.guards.requiresConfirmation || false;

export const getConfirmationMessage = (from: AppointmentStatus, to: AppointmentStatus): string | undefined =>
  getTransition(from, to)?.guards.confirmationMessage;

export interface StateTransitionLog {
  appointmentId: string;
  fromStatus: AppointmentStatus;
  toStatus: AppointmentStatus;
  userId: string;
  timestamp: Date;
  reason?: string;
}

export const createTransitionLog = (log: StateTransitionLog): void => {
  console.log('[State Transition]', { ...log, timestamp: log.timestamp.toISOString() });
};

export default STATE_TRANSITIONS;

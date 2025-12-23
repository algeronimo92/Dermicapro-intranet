import { AppointmentStatus, Role } from '../types';

/**
 * State Machine Configuration for Appointment Status Transitions
 *
 * Implementa el patrón State Machine + Guard Conditions
 * Permite definir transiciones válidas con guards basados en roles y condiciones
 */

// ============================================
// TIPOS Y INTERFACES
// ============================================

export interface TransitionGuard {
  /** Roles permitidos para realizar esta transición */
  allowedRoles: Role[];

  /** Condición adicional que debe cumplirse (opcional) */
  condition?: (context: TransitionContext) => boolean;

  /** Mensaje de error si la transición no es permitida */
  errorMessage?: string;

  /** Requiere confirmación del usuario */
  requiresConfirmation?: boolean;

  /** Mensaje de confirmación */
  confirmationMessage?: string;
}

export interface TransitionContext {
  /** Cita actual */
  appointment?: any;

  /** Usuario actual */
  user?: any;

  /** Datos adicionales */
  metadata?: Record<string, any>;
}

export interface StateTransition {
  /** Estado origen */
  from: AppointmentStatus;

  /** Estado destino */
  to: AppointmentStatus;

  /** Guards que validan si la transición es permitida */
  guards: TransitionGuard;

  /** Label para mostrar en UI */
  label: string;

  /** Descripción de la transición */
  description: string;

  /** Icono para la transición */
  icon?: string;

  /** Acciones a ejecutar antes de la transición */
  beforeTransition?: (context: TransitionContext) => Promise<void>;

  /** Acciones a ejecutar después de la transición */
  afterTransition?: (context: TransitionContext) => Promise<void>;
}

// ============================================
// CONFIGURACIÓN DE TRANSICIONES
// ============================================

/**
 * Mapa completo de todas las transiciones válidas en el sistema
 * Cada transición define:
 * - Quién puede hacerla (roles)
 * - Bajo qué condiciones
 * - Qué validaciones requiere
 */
export const STATE_TRANSITIONS: StateTransition[] = [
  // ==================== DESDE RESERVED ====================
  {
    from: AppointmentStatus.reserved,
    to: AppointmentStatus.in_progress,
    guards: {
      allowedRoles: [Role.admin, Role.nurse],
      errorMessage: 'Solo administradores y enfermeras pueden iniciar la atención',
    },
    label: 'Iniciar Atención',
    description: 'El paciente llegó y comienza la atención',
    icon: 'play',
  },
  {
    from: AppointmentStatus.reserved,
    to: AppointmentStatus.cancelled,
    guards: {
      allowedRoles: [Role.admin, Role.sales],
      requiresConfirmation: true,
      confirmationMessage: '¿Estás seguro de cancelar esta cita? Esta acción puede afectar las comisiones.',
      errorMessage: 'Solo administradores y ventas pueden cancelar citas',
    },
    label: 'Cancelar Cita',
    description: 'Cancelar la cita antes de que inicie',
    icon: 'x',
  },
  {
    from: AppointmentStatus.reserved,
    to: AppointmentStatus.no_show,
    guards: {
      allowedRoles: [Role.admin, Role.sales],
      requiresConfirmation: true,
      confirmationMessage: '¿Confirmas que el paciente no se presentó a la cita?',
      errorMessage: 'Solo administradores y ventas pueden marcar como no asistió',
    },
    label: 'Paciente no Asistió',
    description: 'El paciente no se presentó a la cita',
    icon: 'user-x',
  },

  // ==================== DESDE IN_PROGRESS ====================
  {
    from: AppointmentStatus.in_progress,
    to: AppointmentStatus.attended,
    guards: {
      allowedRoles: [Role.admin, Role.nurse],
      // NO validamos en condition para que el botón siempre aparezca
      // La validación se hace al hacer click y se muestra el error
      errorMessage: 'Debes subir al menos fotos de ANTES para finalizar la atención',
    },
    label: 'Finalizar Atención',
    description: 'Marcar como atendida y completar el tratamiento',
    icon: 'check',
  },
  {
    from: AppointmentStatus.in_progress,
    to: AppointmentStatus.reserved,
    guards: {
      allowedRoles: [Role.admin, Role.nurse],
      requiresConfirmation: true,
      confirmationMessage: '¿Regresar a estado Reservada? Se perderá el progreso de la atención.',
      errorMessage: 'Solo administradores y enfermeras pueden revertir el estado de atención',
    },
    label: 'Revertir a Reservada',
    description: 'Regresar al estado reservada',
    icon: 'arrow-left',
  },
  {
    from: AppointmentStatus.in_progress,
    to: AppointmentStatus.cancelled,
    guards: {
      allowedRoles: [Role.admin, Role.sales],
      requiresConfirmation: true,
      confirmationMessage: '¿Cancelar la cita durante la atención? Esto es inusual.',
      errorMessage: 'Solo administradores y ventas pueden cancelar durante la atención',
    },
    label: 'Cancelar',
    description: 'Cancelar la atención en curso',
    icon: 'x',
  },

  // ==================== DESDE ATTENDED ====================
  {
    from: AppointmentStatus.attended,
    to: AppointmentStatus.in_progress,
    guards: {
      allowedRoles: [Role.admin],
      requiresConfirmation: true,
      confirmationMessage: '¿Regresar a estado En Atención? Esto es inusual para una cita ya atendida.',
      errorMessage: 'Solo administradores pueden revertir citas atendidas',
    },
    label: 'Reabrir Atención',
    description: 'Volver a atención para agregar información',
    icon: 'refresh',
  },

  // ==================== DESDE CANCELLED ====================
  {
    from: AppointmentStatus.cancelled,
    to: AppointmentStatus.reserved,
    guards: {
      allowedRoles: [Role.admin, Role.sales],
      requiresConfirmation: true,
      confirmationMessage: '¿Reactivar esta cita cancelada?',
      errorMessage: 'Solo administradores y ventas pueden reactivar citas',
    },
    label: 'Reactivar Cita',
    description: 'Restaurar la cita cancelada',
    icon: 'refresh',
  },

  // ==================== DESDE NO_SHOW ====================
  {
    from: AppointmentStatus.no_show,
    to: AppointmentStatus.reserved,
    guards: {
      allowedRoles: [Role.admin, Role.sales],
      requiresConfirmation: true,
      confirmationMessage: '¿Cambiar a Reservada? El paciente sí asistió?',
      errorMessage: 'Solo administradores y ventas pueden corregir el estado',
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
// HELPER FUNCTIONS
// ============================================

/**
 * Obtiene todas las transiciones válidas desde un estado específico
 */
export const getAvailableTransitions = (
  fromStatus: AppointmentStatus,
  userRole?: Role,
  context?: TransitionContext
): StateTransition[] => {
  return STATE_TRANSITIONS.filter(transition => {
    // Filtrar por estado origen
    if (transition.from !== fromStatus) return false;

    // Filtrar por rol
    if (!userRole || !transition.guards.allowedRoles.includes(userRole)) {
      return false;
    }

    // Evaluar condición adicional si existe
    if (transition.guards.condition && context) {
      return transition.guards.condition(context);
    }

    return true;
  });
};

/**
 * Valida si una transición específica es permitida
 */
export const canTransition = (
  from: AppointmentStatus,
  to: AppointmentStatus,
  userRole?: Role,
  context?: TransitionContext
): { allowed: boolean; reason?: string } => {
  if (!userRole) {
    return { allowed: false, reason: 'Usuario no autenticado' };
  }

  // Buscar la transición
  const transition = STATE_TRANSITIONS.find(
    t => t.from === from && t.to === to
  );

  if (!transition) {
    return { allowed: false, reason: 'Transición no definida en el sistema' };
  }

  // Validar rol
  if (!transition.guards.allowedRoles.includes(userRole)) {
    return {
      allowed: false,
      reason: transition.guards.errorMessage || 'No tienes permisos para esta acción'
    };
  }

  // Validar condición
  if (transition.guards.condition && context) {
    if (!transition.guards.condition(context)) {
      return {
        allowed: false,
        reason: transition.guards.errorMessage || 'No se cumplen las condiciones para esta transición'
      };
    }
  }

  return { allowed: true };
};

/**
 * Obtiene la configuración de una transición específica
 */
export const getTransition = (
  from: AppointmentStatus,
  to: AppointmentStatus
): StateTransition | undefined => {
  return STATE_TRANSITIONS.find(t => t.from === from && t.to === to);
};

/**
 * Obtiene todos los estados a los que se puede transicionar desde un estado dado
 */
export const getNextStates = (
  currentStatus: AppointmentStatus,
  userRole?: Role,
  context?: TransitionContext
): AppointmentStatus[] => {
  const transitions = getAvailableTransitions(currentStatus, userRole, context);
  return transitions.map(t => t.to);
};

/**
 * Verifica si una transición requiere confirmación
 */
export const requiresConfirmation = (
  from: AppointmentStatus,
  to: AppointmentStatus
): boolean => {
  const transition = getTransition(from, to);
  return transition?.guards.requiresConfirmation || false;
};

/**
 * Obtiene el mensaje de confirmación para una transición
 */
export const getConfirmationMessage = (
  from: AppointmentStatus,
  to: AppointmentStatus
): string | undefined => {
  const transition = getTransition(from, to);
  return transition?.guards.confirmationMessage;
};

// ============================================
// AUDIT LOG
// ============================================

export interface StateTransitionLog {
  appointmentId: string;
  fromStatus: AppointmentStatus;
  toStatus: AppointmentStatus;
  userId: string;
  timestamp: Date;
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * Crea un log de auditoría para una transición de estado
 * (Esta función se puede extender para persistir en backend)
 */
export const createTransitionLog = (log: StateTransitionLog): void => {
  console.log('[State Transition]', {
    ...log,
    timestamp: log.timestamp.toISOString(),
  });

  // TODO: Enviar al backend para auditoría
  // await fetch('/api/audit/state-transitions', {
  //   method: 'POST',
  //   body: JSON.stringify(log),
  // });
};

export default STATE_TRANSITIONS;

import { AppointmentStatus, Role } from '../types';

/**
 * Configuración centralizada de estados de citas
 *
 * Este archivo define el comportamiento, permisos y UI para cada estado de cita.
 * Modificar aquí es más seguro que buscar código en múltiples archivos.
 */

// ============================================
// TIPOS Y INTERFACES
// ============================================

export interface StatePermissions {
  canView: Role[];
  canEdit: Role[];
  canDelete: Role[];
  canChangeStatus: Role[];
  canUploadPhotos: Role[];
  canUploadReceipt: Role[];
  canMarkAttended: Role[];
}

export interface StateVisibility {
  showWorkflowGuide: boolean;
  showPhotoGallery: (hasPhotos: boolean) => boolean;
  showPaymentCard: boolean;
  showSystemInfo: {
    visible: boolean;
    defaultExpanded: boolean;
  };
  showActionButtons: {
    edit: boolean;
    delete: boolean;
    attend: boolean;
  };
}

export interface StateCTA {
  label: string;
  icon: string; // SVG path or emoji
  variant: 'primary' | 'success' | 'secondary' | 'danger';
  action: 'start' | 'finish' | 'reschedule' | 'next-session';
  roles: Role[];
  pulse?: boolean; // Animación de pulso
}

export interface StatePaymentHighlight {
  urgency: 'none' | 'warning' | 'urgent';
  condition: (hasReceipt: boolean, hasPendingPayment: boolean) => boolean;
}

export interface StateLabel {
  singular: string;
  plural: string;
  color: string; // Clase CSS
  badge: string; // Clase de badge
}

export interface AppointmentStateConfig {
  status: AppointmentStatus;
  label: StateLabel;
  permissions: StatePermissions;
  visibility: StateVisibility;
  cta?: StateCTA; // Call-to-action principal
  paymentHighlight: StatePaymentHighlight;
  nextStates: AppointmentStatus[]; // Estados a los que puede transicionar
  description: string; // Para documentación
}

// ============================================
// CONFIGURACIÓN POR ESTADO
// ============================================

const STATES_CONFIG: Record<AppointmentStatus, AppointmentStateConfig> = {
  // ==================== RESERVADA ====================
  [AppointmentStatus.reserved]: {
    status: AppointmentStatus.reserved,
    label: {
      singular: 'Reservada',
      plural: 'Reservadas',
      color: 'status-reserved',
      badge: 'badge-blue',
    },
    permissions: {
      canView: [Role.admin, Role.nurse, Role.sales],
      canEdit: [Role.admin, Role.sales],
      canDelete: [Role.admin],
      canChangeStatus: [Role.admin, Role.nurse],
      canUploadPhotos: [],
      canUploadReceipt: [Role.admin, Role.sales],
      canMarkAttended: [Role.admin, Role.nurse],
    },
    visibility: {
      showWorkflowGuide: true,
      showPhotoGallery: (hasPhotos) => hasPhotos, // Solo si ya hay fotos
      showPaymentCard: true,
      showSystemInfo: {
        visible: true,
        defaultExpanded: false, // Colapsado por defecto
      },
      showActionButtons: {
        edit: true,
        delete: true,
        attend: false, // Se usa CTA en su lugar
      },
    },
    cta: {
      label: 'Iniciar Atención',
      icon: 'play',
      variant: 'primary',
      action: 'start',
      roles: [Role.admin, Role.nurse],
      pulse: true, // Animación para llamar atención
    },
    paymentHighlight: {
      urgency: 'warning',
      condition: (hasReceipt, _hasPendingPayment) => !hasReceipt,
    },
    nextStates: [AppointmentStatus.in_progress, AppointmentStatus.cancelled, AppointmentStatus.no_show],
    description: 'Cita confirmada pero aún no iniciada. Esperando llegada del paciente.',
  },

  // ==================== EN ATENCIÓN ====================
  [AppointmentStatus.in_progress]: {
    status: AppointmentStatus.in_progress,
    label: {
      singular: 'En Atención',
      plural: 'En Atención',
      color: 'status-in-progress',
      badge: 'badge-orange',
    },
    permissions: {
      canView: [Role.admin, Role.nurse, Role.sales],
      canEdit: [Role.admin, Role.sales],
      canDelete: [Role.admin],
      canChangeStatus: [Role.admin, Role.nurse],
      canUploadPhotos: [Role.admin, Role.nurse],
      canUploadReceipt: [Role.admin, Role.sales],
      canMarkAttended: [Role.admin, Role.nurse],
    },
    visibility: {
      showWorkflowGuide: true,
      showPhotoGallery: (_hasPhotos) => true, // Siempre visible para subir fotos
      showPaymentCard: true,
      showSystemInfo: {
        visible: true,
        defaultExpanded: false, // Colapsado - enfoque en tratamiento
      },
      showActionButtons: {
        edit: true,
        delete: false, // No eliminar en progreso
        attend: false, // Se usa CTA
      },
    },
    cta: {
      label: 'Finalizar Atención',
      icon: 'check',
      variant: 'success',
      action: 'finish',
      roles: [Role.admin, Role.nurse],
      pulse: false,
    },
    paymentHighlight: {
      urgency: 'none',
      condition: () => false, // No destacar pago durante atención
    },
    nextStates: [AppointmentStatus.attended, AppointmentStatus.cancelled],
    description: 'Paciente siendo atendido. Se pueden subir fotos del tratamiento.',
  },

  // ==================== ATENDIDA ====================
  [AppointmentStatus.attended]: {
    status: AppointmentStatus.attended,
    label: {
      singular: 'Atendida',
      plural: 'Atendidas',
      color: 'status-attended',
      badge: 'badge-green',
    },
    permissions: {
      canView: [Role.admin, Role.nurse, Role.sales],
      canEdit: [Role.admin],
      canDelete: [Role.admin],
      canChangeStatus: [Role.admin],
      canUploadPhotos: [Role.admin, Role.nurse], // Pueden agregar fotos adicionales
      canUploadReceipt: [Role.admin, Role.sales],
      canMarkAttended: [],
    },
    visibility: {
      showWorkflowGuide: false, // Workflow completado
      showPhotoGallery: (_hasPhotos) => true, // Mostrar siempre para revisar/agregar
      showPaymentCard: true,
      showSystemInfo: {
        visible: true,
        defaultExpanded: true, // Expandido - importante para auditoría
      },
      showActionButtons: {
        edit: true,
        delete: true,
        attend: false,
      },
    },
    cta: {
      label: 'Siguiente Sesión',
      icon: 'calendar',
      variant: 'secondary',
      action: 'next-session',
      roles: [Role.admin, Role.sales, Role.nurse],
      pulse: false,
    },
    paymentHighlight: {
      urgency: 'urgent',
      condition: (_hasReceipt, hasPendingPayment) => hasPendingPayment,
    },
    nextStates: [], // Estado final - no transiciones
    description: 'Cita completada. Se debe verificar pago pendiente.',
  },

  // ==================== CANCELADA ====================
  [AppointmentStatus.cancelled]: {
    status: AppointmentStatus.cancelled,
    label: {
      singular: 'Cancelada',
      plural: 'Canceladas',
      color: 'status-cancelled',
      badge: 'badge-red',
    },
    permissions: {
      canView: [Role.admin, Role.nurse, Role.sales],
      canEdit: [Role.admin],
      canDelete: [Role.admin],
      canChangeStatus: [Role.admin],
      canUploadPhotos: [],
      canUploadReceipt: [],
      canMarkAttended: [],
    },
    visibility: {
      showWorkflowGuide: false,
      showPhotoGallery: (_hasPhotos) => false, // No relevante
      showPaymentCard: true, // Mostrar reembolsos si aplica
      showSystemInfo: {
        visible: true,
        defaultExpanded: true, // Ver quién/cuándo canceló
      },
      showActionButtons: {
        edit: true,
        delete: true,
        attend: false,
      },
    },
    cta: {
      label: 'Reagendar',
      icon: 'refresh',
      variant: 'secondary',
      action: 'reschedule',
      roles: [Role.admin, Role.sales],
      pulse: false,
    },
    paymentHighlight: {
      urgency: 'none',
      condition: () => false,
    },
    nextStates: [AppointmentStatus.reserved], // Puede reagendarse
    description: 'Cita cancelada por paciente o clínica.',
  },

  // ==================== NO ASISTIÓ ====================
  [AppointmentStatus.no_show]: {
    status: AppointmentStatus.no_show,
    label: {
      singular: 'No asistió',
      plural: 'No asistieron',
      color: 'status-no-show',
      badge: 'badge-gray',
    },
    permissions: {
      canView: [Role.admin, Role.nurse, Role.sales],
      canEdit: [Role.admin],
      canDelete: [Role.admin],
      canChangeStatus: [Role.admin],
      canUploadPhotos: [],
      canUploadReceipt: [],
      canMarkAttended: [],
    },
    visibility: {
      showWorkflowGuide: false,
      showPhotoGallery: (_hasPhotos) => false,
      showPaymentCard: true, // Mostrar penalidades
      showSystemInfo: {
        visible: true,
        defaultExpanded: true, // Ver hora esperada vs real
      },
      showActionButtons: {
        edit: true,
        delete: true,
        attend: false,
      },
    },
    cta: {
      label: 'Reagendar',
      icon: 'refresh',
      variant: 'secondary',
      action: 'reschedule',
      roles: [Role.admin, Role.sales],
      pulse: false,
    },
    paymentHighlight: {
      urgency: 'warning',
      condition: (hasReceipt, _hasPendingPayment) => hasReceipt, // Si pagó reserva
    },
    nextStates: [AppointmentStatus.reserved],
    description: 'Paciente no se presentó a la cita programada.',
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Obtiene la configuración completa para un estado
 */
export const getStateConfig = (status: AppointmentStatus): AppointmentStateConfig => {
  return STATES_CONFIG[status];
};

/**
 * Verifica si un rol tiene un permiso específico para un estado
 */
export const hasPermission = (
  status: AppointmentStatus,
  permission: keyof StatePermissions,
  userRole?: Role
): boolean => {
  if (!userRole) return false;
  const config = getStateConfig(status);
  return config.permissions[permission].includes(userRole);
};

/**
 * Obtiene el CTA apropiado para un estado y rol
 */
export const getCTA = (
  status: AppointmentStatus,
  userRole?: Role
): StateCTA | null => {
  const config = getStateConfig(status);
  if (!config.cta || !userRole) return null;

  return config.cta.roles.includes(userRole) ? config.cta : null;
};

/**
 * Determina el nivel de urgencia del pago
 */
export const getPaymentUrgency = (
  status: AppointmentStatus,
  hasReceipt: boolean,
  hasPendingPayment: boolean
): 'none' | 'warning' | 'urgent' => {
  const config = getStateConfig(status);
  const shouldHighlight = config.paymentHighlight.condition(hasReceipt, hasPendingPayment);

  return shouldHighlight ? config.paymentHighlight.urgency : 'none';
};

/**
 * Obtiene los estados válidos a los que puede transicionar
 */
export const getValidTransitions = (
  currentStatus: AppointmentStatus,
  userRole?: Role
): AppointmentStatus[] => {
  if (!userRole) return [];

  const config = getStateConfig(currentStatus);
  const canChangeStatus = hasPermission(currentStatus, 'canChangeStatus', userRole);

  return canChangeStatus ? config.nextStates : [];
};

/**
 * Verifica si debe mostrar un elemento de UI
 */
export const shouldShow = (
  status: AppointmentStatus,
  element: keyof StateVisibility,
  context?: { hasPhotos?: boolean }
): boolean => {
  const config = getStateConfig(status);
  const visibility = config.visibility[element];

  if (typeof visibility === 'boolean') {
    return visibility;
  }

  if (typeof visibility === 'function' && element === 'showPhotoGallery') {
    return visibility(context?.hasPhotos ?? false);
  }

  if (typeof visibility === 'object' && 'visible' in visibility) {
    return visibility.visible;
  }

  return false;
};

// ============================================
// EXPORTAR CONFIGURACIÓN
// ============================================

export default STATES_CONFIG;

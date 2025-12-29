/**
 * Sistema de permisos jerárquico escalable
 *
 * Patrón usado:
 * - module.action: Formato estándar para permisos
 * - 'access': Permiso base que da acceso a la página/módulo
 * - Futuro: Se pueden agregar acciones granulares como 'create', 'edit', 'delete', 'export', etc.
 *
 * Ejemplo de evolución:
 * 1. Ahora: 'patients.access' -> da acceso completo al módulo
 * 2. Futuro: 'patients.access', 'patients.create', 'patients.edit', 'patients.delete'
 *            donde 'patients.access' es el permiso base y los demás son opcionales
 *
 * El sistema de verificación puede implementar:
 * - Verificación simple: hasPermission('patients.access')
 * - Verificación granular: hasPermission('patients.create')
 * - Verificación con fallback: hasPermission('patients.edit') || hasPermission('patients.access')
 */

// Módulos del sistema - centralizado para evitar hardcoding
export const MODULES = {
  DASHBOARD: 'dashboard',
  PATIENTS: 'patients',
  APPOINTMENTS: 'appointments',
  SERVICES: 'services',
  EMPLOYEES: 'employees',
  ROLES: 'roles',
  ANALYTICS: 'analytics',
  INVOICES: 'invoices',
  MEDICAL_RECORDS: 'medical_records',
  SETTINGS: 'settings',
} as const;

// Acciones disponibles - extensible para permisos granulares futuros
export const ACTIONS = {
  ACCESS: 'access',     // Permiso base - acceso al módulo
  // Futuro: descomentar cuando se implementen permisos granulares
  // CREATE: 'create',
  // EDIT: 'edit',
  // DELETE: 'delete',
  // EXPORT: 'export',
  // IMPORT: 'import',
  // APPROVE: 'approve',
} as const;

// Configuración de módulos - metadata para UI y permisos
export const MODULE_CONFIG = [
  {
    module: MODULES.DASHBOARD,
    displayName: 'Dashboard',
    icon: '📊',
    description: 'Panel principal del sistema',
    route: '/',
  },
  {
    module: MODULES.PATIENTS,
    displayName: 'Pacientes',
    icon: '👥',
    description: 'Gestión de pacientes',
    route: '/patients',
  },
  {
    module: MODULES.APPOINTMENTS,
    displayName: 'Citas',
    icon: '📅',
    description: 'Gestión de citas',
    route: '/appointments',
  },
  {
    module: MODULES.SERVICES,
    displayName: 'Servicios',
    icon: '💉',
    description: 'Gestión de servicios',
    route: '/services',
  },
  {
    module: MODULES.EMPLOYEES,
    displayName: 'Recursos Humanos',
    icon: '👔',
    description: 'Gestión de empleados',
    route: '/employees',
  },
  {
    module: MODULES.ROLES,
    displayName: 'Roles y Permisos',
    icon: '🔐',
    description: 'Gestión de roles y permisos',
    route: '/roles',
  },
  {
    module: MODULES.ANALYTICS,
    displayName: 'Analíticas',
    icon: '📈',
    description: 'Analíticas y reportes',
    route: '/analytics',
  },
  {
    module: MODULES.INVOICES,
    displayName: 'Facturación',
    icon: '💰',
    description: 'Facturas y pagos',
    route: '/invoices',
  },
  {
    module: MODULES.MEDICAL_RECORDS,
    displayName: 'Historiales Médicos',
    icon: '📋',
    description: 'Historiales clínicos',
    route: '/patients/:id/history',
  },
  {
    module: MODULES.SETTINGS,
    displayName: 'Configuración',
    icon: '⚙️',
    description: 'Configuración del sistema',
    route: '/settings',
  },
] as const;

/**
 * Genera el nombre del permiso a partir del módulo y acción
 * @example getPermissionName('patients', 'access') => 'patients.access'
 */
export function getPermissionName(module: string, action: string): string {
  return `${module}.${action}`;
}

/**
 * Mapeo de módulos a nombres display - útil para UI
 */
export const MODULE_DISPLAY_NAMES = MODULE_CONFIG.reduce((acc, config) => {
  acc[config.module] = config.displayName;
  return acc;
}, {} as Record<string, string>);

/**
 * Mapeo de módulos a iconos - útil para UI
 */
export const MODULE_ICONS = MODULE_CONFIG.reduce((acc, config) => {
  acc[config.module] = config.icon;
  return acc;
}, {} as Record<string, string>);

/**
 * Mapeo de rutas a módulos - útil para verificar permisos por ruta
 */
export const ROUTE_TO_MODULE = MODULE_CONFIG.reduce((acc, config) => {
  acc[config.route] = config.module;
  return acc;
}, {} as Record<string, string>);

// Tipos TypeScript para autocompletado
export type Module = typeof MODULES[keyof typeof MODULES];
export type Action = typeof ACTIONS[keyof typeof ACTIONS];
export type PermissionName = `${Module}.${Action}`;

import { User, Role, RoleInfo } from '../types';
import { getPermissionName, ACTIONS, type PermissionName } from '../constants/permissions';

/**
 * Helper para verificar si un usuario tiene un rol específico
 * Soporta tanto el formato legacy (string) como el nuevo sistema (objeto RoleInfo)
 */
export function hasRole(user: User | null | undefined, roleName: string): boolean {
  if (!user?.role) return false;

  // Si es un string (formato legacy)
  if (typeof user.role === 'string') {
    return user.role === roleName;
  }

  // Si es un objeto RoleInfo (nuevo sistema)
  return user.role.name === roleName;
}

/**
 * Helper para obtener el nombre del rol de un usuario
 */
export function getRoleName(user: User | null | undefined): string | null {
  if (!user?.role) return null;

  if (typeof user.role === 'string') {
    return user.role;
  }

  return user.role.name;
}

/**
 * Helper para obtener el nombre para mostrar del rol
 */
export function getRoleDisplayName(user: User | null | undefined): string | null {
  if (!user?.role) return null;

  if (typeof user.role === 'string') {
    // Capitalizar primera letra para formato legacy
    return user.role.charAt(0).toUpperCase() + user.role.slice(1);
  }

  return user.role.displayName;
}

/**
 * Interfaz para permisos del usuario (simplificada del backend)
 */
interface UserPermission {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  module: string;
  action: string;
}

/**
 * Usuario extendido con permisos - para uso en verificación de permisos
 * TODO: Actualizar el tipo User global cuando el backend incluya permisos
 */
interface UserWithPermissions extends User {
  permissions?: UserPermission[];
}

/**
 * Verifica si un usuario tiene un permiso específico
 *
 * Soporta dos formas de uso:
 * 1. hasPermission(user, 'patients.access') - verificación directa por nombre
 * 2. hasPermission(user, 'patients', 'access') - verificación por módulo y acción
 *
 * @example
 * hasPermission(user, 'patients.access')
 * hasPermission(user, 'patients', 'access')
 * hasPermission(user, MODULES.PATIENTS, ACTIONS.ACCESS)
 */
export function hasPermission(
  user: User | null | undefined,
  moduleOrPermission: string,
  action?: string
): boolean {
  if (!user) return false;

  // Admin siempre tiene todos los permisos
  if (hasRole(user, 'admin')) return true;

  const userWithPerms = user as UserWithPermissions;
  if (!userWithPerms.permissions || userWithPerms.permissions.length === 0) {
    return false;
  }

  // Determinar el nombre del permiso a buscar
  const permissionName = action
    ? getPermissionName(moduleOrPermission, action)
    : moduleOrPermission;

  // Verificar si el usuario tiene el permiso
  return userWithPerms.permissions.some(p => p.name === permissionName);
}

/**
 * Verifica si un usuario tiene acceso a un módulo específico
 * Esta es una función de conveniencia que verifica el permiso de acceso base
 *
 * @example
 * hasModuleAccess(user, 'patients') // Verifica 'patients.access'
 * hasModuleAccess(user, MODULES.PATIENTS)
 */
export function hasModuleAccess(
  user: User | null | undefined,
  module: string
): boolean {
  return hasPermission(user, module, ACTIONS.ACCESS);
}

/**
 * Obtiene todos los módulos a los que un usuario tiene acceso
 * Útil para generar menús de navegación dinámicos
 *
 * @returns Array de nombres de módulos a los que el usuario tiene acceso
 */
export function getUserAccessibleModules(user: User | null | undefined): string[] {
  if (!user) return [];

  // Admin tiene acceso a todo
  if (hasRole(user, 'admin')) {
    // TODO: Retornar todos los módulos de MODULE_CONFIG
    return [];
  }

  const userWithPerms = user as UserWithPermissions;
  if (!userWithPerms.permissions) return [];

  // Extraer módulos de los permisos de tipo 'access'
  return userWithPerms.permissions
    .filter(p => p.action === ACTIONS.ACCESS)
    .map(p => p.module);
}

import { AsyncLocalStorage } from 'async_hooks';

/**
 * Rol de PostgreSQL con el que corren las consultas de la petición en curso.
 *
 * Cada rol de la aplicación (salvo admin) tiene su rol de base de datos
 * `app_<rol>`, sin login, con los privilegios de objeto (SELECT, INSERT,
 * UPDATE, DELETE por tabla) que el admin le otorga desde Empleados. Cada
 * empleado tiene además su propio rol `emp_<id>`, miembro de `app_<rol>`. El
 * pool de `pg` (config/database.ts) ejecuta `SET ROLE emp_<id>` al entregar
 * cada conexión: PostgreSQL hace cumplir los privilegios heredados del tipo de
 * rol y current_user identifica a la persona.
 *
 * Sin contexto (login, portal de pacientes, tareas de fondo, métricas) o con
 * el rol admin, las consultas corren como el dueño de la base: igual que el
 * administrador de base de datos, a él no se le aplican privilegios.
 */
export interface DbRoleStore {
  dbRole: string | null;
  /** Tabla de la última consulta rechazada por falta de privilegios. */
  deniedTable?: string;
}

export const dbRoleContext = new AsyncLocalStorage<DbRoleStore>();

/** Roles de la aplicación que tienen rol de base de datos propio. */
export const DB_MANAGED_ROLES = ['medical_staff', 'assistant', 'sales', 'accountant', 'inventory'] as const;
export type DbManagedRole = typeof DB_MANAGED_ROLES[number];

export const dbRoleFor = (appRole: string | undefined | null): string | null =>
  appRole && (DB_MANAGED_ROLES as readonly string[]).includes(appRole) ? `app_${appRole}` : null;

/**
 * Rol de PostgreSQL propio de un empleado: emp_<uuid sin guiones>. Hereda los
 * privilegios de app_<rol> y permite que current_user identifique a la persona.
 */
export const employeeDbRoleFor = (userId: string): string => {
  const compact = userId.replace(/-/g, '').toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(compact)) throw new Error('Id de usuario no válido para rol de base de datos');
  return `emp_${compact}`;
};

export const currentDbRole = (): string | null => dbRoleContext.getStore()?.dbRole ?? null;

/** Código SQLSTATE de PostgreSQL para "permission denied". */
export const INSUFFICIENT_PRIVILEGE = '42501';

// El store se recibe explícito: el callback de `pg` llega desde el socket, fuera
// del contexto asíncrono de la petición, así que getStore() ahí devuelve nada.
export const markPrivilegeDenied = (store: DbRoleStore | undefined, message: string): void => {
  if (!store) return;
  const match = /permission denied for (?:table|relation) ("?)([\w]+)\1/i.exec(message);
  store.deniedTable = match?.[2] ?? 'desconocida';
};

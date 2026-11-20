import prisma from '../config/database';
import { DB_MANAGED_ROLES, dbRoleFor, employeeDbRoleFor } from '../config/dbRoleContext';

/**
 * Mantiene el rol de PostgreSQL de cada empleado (emp_<id>) al día:
 * que exista, que el usuario de la aplicación pueda cambiar a él y que sea
 * miembro sólo del rol de su tipo (app_<rol>), del que hereda los privilegios.
 *
 * Se llama en cada autenticación, pero sólo sincroniza cuando el rol del
 * empleado cambió desde la última vez que este proceso lo sincronizó, o cuando
 * pasó SYNC_TTL_MS. Lo primero cubre cambiar el rol de alguien (y devolverlo);
 * lo segundo, que con dos backends (blue/green) el otro proceso haya cambiado
 * la membresía en la base sin que este se entere. Por eso no hace falta
 * engancharlo a crear/editar empleado.
 */
const SYNC_TTL_MS = 60_000;
const synced = new Map<string, { groupRole: string; at: number }>();

const quoteLiteral = (text: string) => `'${text.replace(/'/g, "''")}'`;

export async function ensureEmployeeDbRole(
  userId: string,
  appRole: string,
  fullName: string,
): Promise<string | null> {
  const groupRole = dbRoleFor(appRole);
  if (!groupRole) return null; // admin y roles sin privilegios administrables
  const empRole = employeeDbRoleFor(userId);
  const last = synced.get(empRole);
  if (last && last.groupRole === groupRole && Date.now() - last.at < SYNC_TTL_MS) return empRole;

  const others = DB_MANAGED_ROLES.map(r => dbRoleFor(r)!).filter(r => r !== groupRole);

  // Nombres validados por employeeDbRoleFor/dbRoleFor: CREATE ROLE, GRANT y
  // COMMENT no admiten parámetros. El bloque DO tolera que dos peticiones
  // simultáneas del mismo empleado intenten crear el rol a la vez.
  await prisma.$transaction([
    prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${empRole}') THEN
          BEGIN
            CREATE ROLE ${empRole} NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE;
          EXCEPTION WHEN duplicate_object THEN NULL;
          END;
        END IF;
      END
      $$`),
    prisma.$executeRawUnsafe(`
      DO $$
      DECLARE other TEXT;
      BEGIN
        IF NOT pg_has_role(CURRENT_USER, '${empRole}', 'MEMBER') THEN
          EXECUTE format('GRANT %I TO CURRENT_USER', '${empRole}');
        END IF;
        IF NOT pg_has_role('${empRole}', '${groupRole}', 'MEMBER') THEN
          EXECUTE format('GRANT %I TO %I', '${groupRole}', '${empRole}');
        END IF;
        FOREACH other IN ARRAY ARRAY[${others.map(o => `'${o}'`).join(', ')}] LOOP
          IF pg_has_role('${empRole}', other, 'MEMBER') THEN
            EXECUTE format('REVOKE %I FROM %I', other, '${empRole}');
          END IF;
        END LOOP;
      END
      $$`),
    prisma.$executeRawUnsafe(`COMMENT ON ROLE ${empRole} IS ${quoteLiteral(fullName.slice(0, 200))}`),
  ]);

  synced.set(empRole, { groupRole, at: Date.now() });
  return empRole;
}

/** Sincroniza a todos los empleados activos. Se ejecuta al arrancar el servidor. */
export async function syncAllEmployeeDbRoles(): Promise<number> {
  const users = await prisma.user.findMany({
    where: { isActive: true, role: { name: { in: [...DB_MANAGED_ROLES] } } },
    select: { id: true, firstName: true, lastName: true, role: { select: { name: true } } },
  });
  for (const u of users) {
    await ensureEmployeeDbRole(u.id, u.role!.name, `${u.firstName} ${u.lastName}`);
  }
  return users.length;
}

/** Sólo para pruebas. */
export const resetEmployeeDbRoleCache = () => synced.clear();

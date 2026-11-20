import prisma from '../config/database';
import { DB_MANAGED_ROLES, dbRoleFor } from '../config/dbRoleContext';
import { DB_TABLE_NAMES, DB_TABLES, OBJECT_PRIVILEGES, ObjectPrivilege } from '../constants/dbPrivileges';
import { AppError } from '../middlewares/errorHandler';

export type RoleGrants = Record<string, ObjectPrivilege[]>;

export interface SystemPrivileges {
  superuser: boolean;
  createDb: boolean;
  createRole: boolean;
  login: boolean;
  createInSchema: boolean;
}

export interface RoleMember {
  dbRole: string;
  name: string;
}

export interface RolePrivileges {
  appRole: string;
  dbRole: string;
  displayName: string;
  /** Roles emp_<id> de los empleados que heredan estos privilegios. */
  members: RoleMember[];
  grants: RoleGrants;
  system: SystemPrivileges;
}

const MODIFYING: ObjectPrivilege[] = ['INSERT', 'UPDATE', 'DELETE'];

/**
 * Valida el estado deseado de un rol y lo normaliza.
 *
 * Prisma usa RETURNING en INSERT/UPDATE/DELETE y filtra con WHERE, y ambas cosas
 * exigen SELECT: sin él, cualquier escritura falla. Por eso se rechaza en vez
 * de dejar al admin con una casilla marcada que no sirve.
 */
export function normalizeGrants(input: unknown): RoleGrants {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AppError('Formato de privilegios inválido', 400);
  }
  const result: RoleGrants = {};
  for (const [table, privileges] of Object.entries(input as Record<string, unknown>)) {
    if (!DB_TABLE_NAMES.has(table)) throw new AppError(`Tabla no administrable: ${table}`, 400);
    if (!Array.isArray(privileges)) throw new AppError(`Privilegios inválidos para ${table}`, 400);
    const set = new Set<ObjectPrivilege>();
    for (const p of privileges) {
      if (!(OBJECT_PRIVILEGES as readonly unknown[]).includes(p)) {
        throw new AppError(`Privilegio no válido: ${String(p)}`, 400);
      }
      set.add(p as ObjectPrivilege);
    }
    if (MODIFYING.some(p => set.has(p)) && !set.has('SELECT')) {
      throw new AppError(`"${table}": INSERT, UPDATE y DELETE necesitan también SELECT`, 400);
    }
    result[table] = OBJECT_PRIVILEGES.filter(p => set.has(p));
  }
  return result;
}

/** Diferencia entre el estado actual y el deseado, como sentencias SQL. */
export function diffToStatements(dbRole: string, current: RoleGrants, desired: RoleGrants): string[] {
  const statements: string[] = [];
  for (const { name } of DB_TABLES) {
    if (!(name in desired)) continue;
    const have = new Set(current[name] ?? []);
    const want = new Set(desired[name]);
    const grant = OBJECT_PRIVILEGES.filter(p => want.has(p) && !have.has(p));
    const revoke = OBJECT_PRIVILEGES.filter(p => have.has(p) && !want.has(p));
    if (grant.length) statements.push(`GRANT ${grant.join(', ')} ON public."${name}" TO ${dbRole}`);
    if (revoke.length) statements.push(`REVOKE ${revoke.join(', ')} ON public."${name}" FROM ${dbRole}`);
  }
  return statements;
}

async function readGrants(): Promise<Map<string, RoleGrants>> {
  const rows = await prisma.$queryRaw<Array<{ grantee: string; table_name: string; privilege_type: string }>>`
    SELECT grantee, table_name, privilege_type
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND grantee LIKE 'app\\_%'
  `;
  const byRole = new Map<string, RoleGrants>();
  for (const row of rows) {
    if (!DB_TABLE_NAMES.has(row.table_name)) continue;
    if (!(OBJECT_PRIVILEGES as readonly string[]).includes(row.privilege_type)) continue;
    const grants = byRole.get(row.grantee) ?? {};
    (grants[row.table_name] ??= []).push(row.privilege_type as ObjectPrivilege);
    byRole.set(row.grantee, grants);
  }
  for (const grants of byRole.values()) {
    for (const table of Object.keys(grants)) {
      grants[table] = OBJECT_PRIVILEGES.filter(p => grants[table].includes(p));
    }
  }
  return byRole;
}

export async function getRolePrivileges(): Promise<RolePrivileges[]> {
  const dbRoles = DB_MANAGED_ROLES.map(r => dbRoleFor(r)!) ;
  const [grants, attrs, appRoles, memberRows] = await Promise.all([
    readGrants(),
    prisma.$queryRaw<Array<{
      rolname: string; rolsuper: boolean; rolcreatedb: boolean; rolcreaterole: boolean;
      rolcanlogin: boolean; create_in_schema: boolean;
    }>>`
      SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolcanlogin,
             has_schema_privilege(rolname, 'public', 'CREATE') AS create_in_schema
      FROM pg_roles WHERE rolname = ANY(${dbRoles})
    `,
    prisma.role.findMany({ where: { name: { in: [...DB_MANAGED_ROLES] } }, select: { name: true, displayName: true } }),
    prisma.$queryRaw<Array<{ group_role: string; member: string; name: string | null }>>`
      SELECT g.rolname AS group_role, m.rolname AS member,
             shobj_description(m.oid, 'pg_authid') AS name
      FROM pg_auth_members am
      JOIN pg_roles g ON g.oid = am.roleid
      JOIN pg_roles m ON m.oid = am.member
      WHERE g.rolname = ANY(${dbRoles}) AND m.rolname LIKE 'emp\_%'
      ORDER BY name
    `,
  ]);

  return DB_MANAGED_ROLES.flatMap((appRole) => {
    const dbRole = dbRoleFor(appRole)!;
    const attr = attrs.find(a => a.rolname === dbRole);
    if (!attr) return []; // migración no aplicada todavía
    return [{
      appRole,
      dbRole,
      displayName: appRoles.find(r => r.name === appRole)?.displayName ?? appRole,
      grants: grants.get(dbRole) ?? {},
      members: memberRows
        .filter(m => m.group_role === dbRole)
        .map(m => ({ dbRole: m.member, name: m.name ?? m.member })),
      system: {
        superuser: attr.rolsuper,
        createDb: attr.rolcreatedb,
        createRole: attr.rolcreaterole,
        login: attr.rolcanlogin,
        createInSchema: attr.create_in_schema,
      },
    }];
  });
}

/**
 * Aplica el estado deseado de un rol con GRANT/REVOKE en una transacción: o
 * cambia todo o nada. Corre como el dueño de la base (la petición es de admin).
 */
export async function setRolePrivileges(appRole: string, desiredInput: unknown) {
  const dbRole = dbRoleFor(appRole);
  if (!dbRole) throw new AppError('Ese rol no tiene privilegios de base de datos administrables', 400);
  const desired = normalizeGrants(desiredInput);

  const current = (await readGrants()).get(dbRole) ?? {};
  const statements = diffToStatements(dbRole, current, desired);
  if (statements.length) {
    // Los nombres salen de la lista blanca y de dbRoleFor(): no hay texto del
    // cliente en el SQL. GRANT/REVOKE no admiten parámetros.
    await prisma.$transaction(statements.map(sql => prisma.$executeRawUnsafe(sql)));
  }
  return statements;
}

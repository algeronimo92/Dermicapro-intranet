import prisma from '../config/database';
import { dbRoleFor, employeeDbRoleFor } from '../config/dbRoleContext';
import { ROLES } from '../constants/roles';
import { MODULES, ModuleAccess, ModuleKey, TablePrivilege } from '../constants/modules';

const moduleKeys = Object.keys(MODULES) as ModuleKey[];

const fill = (value: boolean): ModuleAccess =>
  Object.fromEntries(moduleKeys.map(m => [
    m,
    Object.fromEntries(Object.keys(MODULES[m]).map(a => [a, value])),
  ])) as ModuleAccess;

/** Pares (tabla, privilegio) distintos que aparecen en el catálogo. */
const allPairs = (): TablePrivilege[] => {
  const seen = new Map<string, TablePrivilege>();
  for (const m of moduleKeys) {
    for (const pairs of Object.values(MODULES[m]) as readonly TablePrivilege[][]) {
      for (const pair of pairs) seen.set(`${pair[0]}:${pair[1]}`, pair);
    }
  }
  return [...seen.values()];
};

/** Arma el acceso a partir de los privilegios que tiene el rol. */
export function accessFromGrants(has: (table: string, privilege: string) => boolean): ModuleAccess {
  const access = fill(false);
  for (const m of moduleKeys) {
    const actions = MODULES[m] as Record<string, readonly TablePrivilege[]>;
    const allowed = (pairs: readonly TablePrivilege[]) => pairs.every(([t, p]) => has(t, p));
    const canView = allowed(actions.view);
    for (const [action, pairs] of Object.entries(actions)) {
      (access[m] as Record<string, boolean>)[action] = canView && allowed(pairs);
    }
  }
  return access;
}

/**
 * Lo que la persona puede hacer en los módulos manejados por privilegios.
 * Admin corre como dueño de la base: todo. El resto, lo que PostgreSQL le
 * concede a su rol (emp_<id>, que hereda de app_<rol>).
 */
export async function getModuleAccess(userId: string, roleName: string | undefined): Promise<ModuleAccess> {
  if (roleName === ROLES.ADMIN) return fill(true);
  const appRole = dbRoleFor(roleName);
  if (!appRole) return fill(false);

  const pairs = allPairs();
  // Si el rol propio del empleado todavía no existe, se mira el de su tipo de rol.
  const rows = await prisma.$queryRaw<Array<{ table_name: string; privilege: string; granted: boolean }>>`
    WITH r AS (
      SELECT COALESCE((SELECT rolname FROM pg_roles WHERE rolname = ${employeeDbRoleFor(userId)}), ${appRole}) AS name
    )
    SELECT p.table_name, p.privilege,
           has_table_privilege(r.name, 'public.' || quote_ident(p.table_name), p.privilege) AS granted
    FROM r, unnest(${pairs.map(([t]) => t)}::text[], ${pairs.map(([, p]) => p)}::text[]) AS p(table_name, privilege)
  `;
  const granted = new Set(rows.filter(r => r.granted).map(r => `${r.table_name}:${r.privilege}`));
  return accessFromGrants((t, p) => granted.has(`${t}:${p}`));
}

import { ObjectPrivilege } from './dbPrivileges';

/**
 * Módulos cuyo acceso decide la matriz de Empleados -> Privilegios en vez de un
 * rol fijo. Cada acción lista todo lo que sus consultas tocan, para que el
 * botón aparezca sólo si la operación completa va a pasar en PostgreSQL (si
 * no, una subida de adjuntos podría quedar a medias).
 *
 * Toda acción exige además la de "view": sin ver el módulo no se llega a ella.
 */
export type TablePrivilege = readonly [table: string, privilege: ObjectPrivilege];

export const MODULES = {
  invoices: {
    view: [['registered_invoices', 'SELECT'], ['registered_invoice_attachments', 'SELECT']],
    create: [['registered_invoices', 'INSERT'], ['registered_invoice_attachments', 'INSERT']],
    edit: [
      ['registered_invoices', 'UPDATE'],
      ['registered_invoice_attachments', 'INSERT'],
      ['registered_invoice_attachments', 'DELETE'],
      ['invoice_object_deletions', 'INSERT'],
    ],
    // Los adjuntos se borran en cascada (lo hace PostgreSQL, sin privilegio aparte).
    delete: [['registered_invoices', 'DELETE'], ['invoice_object_deletions', 'INSERT']],
  },
  inventory: {
    view: [['products', 'SELECT'], ['inventory_movements', 'SELECT']],
    // Un producto nuevo con stock inicial registra su movimiento de entrada.
    create: [['products', 'INSERT'], ['inventory_movements', 'INSERT']],
    edit: [['products', 'UPDATE']],
    move: [['products', 'UPDATE'], ['inventory_movements', 'INSERT']],
  },
} as const satisfies Record<string, Record<string, readonly TablePrivilege[]>>;

export type ModuleKey = keyof typeof MODULES;
export type ModuleAction<M extends ModuleKey = ModuleKey> = keyof (typeof MODULES)[M] & string;

/** Qué puede hacer la persona en cada módulo: { invoices: { view, create, ... }, ... } */
export type ModuleAccess = { [M in ModuleKey]: Record<ModuleAction<M>, boolean> };

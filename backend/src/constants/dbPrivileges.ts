/**
 * Catálogo de lo que el admin puede administrar desde
 * Empleados -> Privilegios de base de datos.
 *
 * Es una lista blanca: el backend sólo ejecuta GRANT/REVOKE sobre estas tablas
 * y estos privilegios, nunca sobre un nombre que venga del cliente sin pasar
 * por aquí. Una tabla nueva no aparece en la pantalla hasta agregarla.
 */
export const OBJECT_PRIVILEGES = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] as const;
export type ObjectPrivilege = typeof OBJECT_PRIVILEGES[number];

export interface DbTable {
  name: string;
  label: string;
  module: string;
}

export const DB_TABLES: DbTable[] = [
  { name: 'patients',                       label: 'Pacientes',                   module: 'Pacientes' },
  { name: 'patient_records',                label: 'Historias clínicas',          module: 'Pacientes' },
  { name: 'appointments',                   label: 'Citas',                       module: 'Citas' },
  { name: 'appointment_attendees',          label: 'Personal asignado a citas',   module: 'Citas' },
  { name: 'appointment_notes',              label: 'Notas de citas',              module: 'Citas' },
  { name: 'sessions',                       label: 'Sesiones de citas',           module: 'Citas' },
  { name: 'services',                       label: 'Servicios',                   module: 'Servicios' },
  { name: 'service_packages',               label: 'Paquetes de servicios',       module: 'Servicios' },
  { name: 'service_instances',              label: 'Paquetes vendidos',           module: 'Servicios' },
  { name: 'ordenes_de_pago',                label: 'Órdenes de pago',             module: 'Pagos' },
  { name: 'payments',                       label: 'Pagos',                       module: 'Pagos' },
  { name: 'commissions',                    label: 'Comisiones',                  module: 'Pagos' },
  { name: 'registered_invoices',            label: 'Facturas',                    module: 'Facturas' },
  { name: 'registered_invoice_attachments', label: 'Adjuntos de facturas',        module: 'Facturas' },
  { name: 'invoice_object_deletions',       label: 'Limpieza de adjuntos',        module: 'Facturas' },
  { name: 'products',                       label: 'Productos',                   module: 'Inventario' },
  { name: 'inventory_movements',            label: 'Movimientos de inventario',   module: 'Inventario' },
  { name: 'users',                          label: 'Usuarios',                    module: 'Sistema' },
  { name: 'roles',                          label: 'Roles',                       module: 'Sistema' },
  { name: 'system_settings',                label: 'Configuración del sistema',   module: 'Sistema' },
];

export const DB_TABLE_NAMES = new Set(DB_TABLES.map(t => t.name));

export const tableLabel = (name: string): string =>
  DB_TABLES.find(t => t.name === name)?.label ?? name;

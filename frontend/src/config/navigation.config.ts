import { ModuleAccess, Role } from '../types';

export interface NavItem {
  to: string;
  label: string;
  icon: string;       // nombre de icono Lucide
  end?: boolean;
  roles: Role[] | 'all';
  meta?: boolean;     // true = perfil/config, se renderiza como icono en el pie
  section?: string;   // título del grupo en el sidebar; sin valor = grupo principal
  /** Módulo manejado por privilegios de la base: lo ve quien tenga permiso de consulta, sin importar el rol. */
  module?: keyof ModuleAccess;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/',            label: 'Dashboard',       icon: 'LayoutDashboard', end: true, roles: 'all' },
  { to: '/patients',    label: 'Pacientes',        icon: 'Users',                     roles: 'all' },
  { to: '/appointments',label: 'Citas',            icon: 'CalendarDays',              roles: 'all' },
  { to: '/services',    label: 'Servicios',        icon: 'Syringe',                   roles: [Role.admin, Role.sales], section: 'Gestión' },
  { to: '/employees',   label: 'Empleados',        icon: 'UserCog',                   roles: [Role.admin], section: 'Gestión' },
  { to: '/commissions', label: 'Comisiones',       icon: 'BadgeDollarSign',           roles: [Role.admin], section: 'Gestión' },
  { to: '/payments',    label: 'Pagos',             icon: 'Banknote',                  roles: [Role.admin], section: 'Gestión' },
  { to: '/inventory',   label: 'Inventario',        icon: 'Package',                   roles: 'all', module: 'inventory', section: 'Gestión' },
  { to: '/invoices',    label: 'Facturas',          icon: 'FileText',                  roles: 'all', module: 'invoices', section: 'Gestión' },
  { to: '/analytics',   label: 'Analíticas',       icon: 'BarChart3',                 roles: [Role.admin], section: 'Análisis' },
  { to: '/styleguide',  label: 'Ficha de Estilos', icon: 'Palette',                   roles: [Role.admin], section: 'Análisis' },
  { to: '/profile',     label: 'Mi Perfil',        icon: 'CircleUser',                roles: 'all', meta: true },
  { to: '/settings',    label: 'Configuración',    icon: 'Settings',                  roles: 'all', meta: true },
];

export const canAccessNav = (item: NavItem, roleName: string, modules: ModuleAccess): boolean => {
  if (item.module) return modules[item.module].view;
  // Contador e inventario sólo ven los módulos que les dan sus privilegios.
  if (roleName === Role.accountant || roleName === Role.inventory) return false;
  if (item.roles === 'all') return true;
  return (item.roles as Role[]).includes(roleName as Role);
};

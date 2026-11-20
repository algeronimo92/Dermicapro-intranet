import { Role } from '../types';

export interface NavItem {
  to: string;
  label: string;
  icon: string;       // nombre de icono Lucide
  end?: boolean;
  roles: Role[] | 'all';
  meta?: boolean;     // true = perfil/config, se renderiza como icono en el pie
  section?: string;   // título del grupo en el sidebar; sin valor = grupo principal
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/',            label: 'Dashboard',       icon: 'LayoutDashboard', end: true, roles: 'all' },
  { to: '/patients',    label: 'Pacientes',        icon: 'Users',                     roles: 'all' },
  { to: '/appointments',label: 'Citas',            icon: 'CalendarDays',              roles: 'all' },
  { to: '/services',    label: 'Servicios',        icon: 'Syringe',                   roles: [Role.admin, Role.sales], section: 'Gestión' },
  { to: '/employees',   label: 'Empleados',        icon: 'UserCog',                   roles: [Role.admin], section: 'Gestión' },
  { to: '/commissions', label: 'Comisiones',       icon: 'BadgeDollarSign',           roles: [Role.admin], section: 'Gestión' },
  { to: '/payments',    label: 'Pagos',             icon: 'Banknote',                  roles: [Role.admin], section: 'Gestión' },
  { to: '/inventory',   label: 'Inventario',        icon: 'Package',                   roles: [Role.admin, Role.inventory, Role.sales, Role.assistant], section: 'Gestión' },
  { to: '/invoices',    label: 'Facturas',          icon: 'FileText',                  roles: [Role.admin, Role.accountant], section: 'Gestión' },
  { to: '/analytics',   label: 'Analíticas',       icon: 'BarChart3',                 roles: [Role.admin], section: 'Análisis' },
  { to: '/styleguide',  label: 'Ficha de Estilos', icon: 'Palette',                   roles: [Role.admin], section: 'Análisis' },
  { to: '/profile',     label: 'Mi Perfil',        icon: 'CircleUser',                roles: 'all', meta: true },
  { to: '/settings',    label: 'Configuración',    icon: 'Settings',                  roles: 'all', meta: true },
];

export const canAccessNav = (item: NavItem, roleName: string): boolean => {
  if (roleName === Role.accountant) return item.to === '/invoices';
  if (roleName === Role.inventory) return item.to === '/inventory';
  if (item.roles === 'all') return true;
  return (item.roles as Role[]).includes(roleName as Role);
};

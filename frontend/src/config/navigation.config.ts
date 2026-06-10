import { Role } from '../types';

export interface NavItem {
  to: string;
  label: string;
  icon: string;       // nombre de icono Lucide
  end?: boolean;
  roles: Role[] | 'all';
  meta?: boolean;     // true = perfil/config, se renderiza en sección inferior
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/',            label: 'Dashboard',       icon: 'LayoutDashboard', end: true, roles: 'all' },
  { to: '/patients',    label: 'Pacientes',        icon: 'Users',                     roles: 'all' },
  { to: '/appointments',label: 'Citas',            icon: 'CalendarDays',              roles: 'all' },
  { to: '/services',    label: 'Servicios',        icon: 'Syringe',                   roles: [Role.admin, Role.sales] },
  { to: '/employees',   label: 'Empleados',        icon: 'UserCog',                   roles: [Role.admin] },
  { to: '/commissions', label: 'Comisiones',       icon: 'BadgeDollarSign',           roles: [Role.admin] },
  { to: '/payments',    label: 'Pagos',             icon: 'Banknote',                  roles: [Role.admin] },
  { to: '/analytics',   label: 'Analíticas',       icon: 'BarChart3',                 roles: [Role.admin] },
  { to: '/styleguide',  label: 'Ficha de Estilos', icon: 'Palette',                   roles: [Role.admin] },
  { to: '/profile',     label: 'Mi Perfil',        icon: 'CircleUser',                roles: 'all', meta: true },
  { to: '/settings',    label: 'Configuración',    icon: 'Settings',                  roles: 'all', meta: true },
];

export const canAccessNav = (item: NavItem, roleName: string): boolean => {
  if (item.roles === 'all') return true;
  return (item.roles as Role[]).includes(roleName as Role);
};

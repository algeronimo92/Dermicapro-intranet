import React, { useState, useEffect, useCallback } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, CalendarDays, Syringe, UserCog,
  BadgeDollarSign, BarChart3, Palette, CircleUser, Settings, FileText,
  LogOut, PanelLeftClose, PanelLeftOpen, LucideIcon, AlertTriangle, Timer, Menu, X, Banknote,
  CalendarPlus, Sun, Moon,
} from 'lucide-react';
import { NavItem } from '../config/navigation.config';
import { useTheme } from '../contexts/ThemeContext';
import { useIdleCountdown, formatCountdown } from '../hooks/useIdleTimeout';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, Users, CalendarDays, Syringe, UserCog,
  BadgeDollarSign, BarChart3, Palette, CircleUser, Settings, Banknote, FileText,
};

const COLLAPSED_KEY = 'dermicapro_sidebar_collapsed';
const MOBILE_BREAKPOINT = 768;

export interface SidebarUser {
  firstName?: string;
  lastName?: string;
  roleDisplay?: string;
  photoUrl?: string | null;
}

export interface SidebarIdle {
  getMsRemaining: () => number;
  /** Duración total de la sesión, para decidir el color del contador */
  timeout: number;
}

export interface SidebarProps {
  user: SidebarUser;
  navItems: NavItem[];
  onLogout: () => void;
  /** Cambia entre claro y oscuro; el layout lo guarda en el perfil del usuario */
  onToggleTheme?: () => void;
  idle?: SidebarIdle;
}

function NavIcon({ name, size = 20 }: { name: string; size?: number }) {
  const Icon = ICON_MAP[name];
  if (!Icon) return null;
  return <Icon size={size} strokeWidth={1.75} />;
}

/** Contador de inactividad: solo el reloj y el tiempo. Lleva su propio tic. */
function IdleCountdown({ idle, compact }: { idle: SidebarIdle; compact: boolean }) {
  const ms = useIdleCountdown(idle.getMsRemaining);
  const pct = (ms / idle.timeout) * 100;
  const level = pct > 50 ? 'ok' : pct > 20 ? 'warn' : 'critical';
  return (
    <div
      className={`sidebar-idle sidebar-idle--${level}${compact ? ' sidebar-idle--compact' : ''}`}
      title="Tiempo restante antes de cerrar la sesión por inactividad"
      aria-label={`La sesión se cierra por inactividad en ${formatCountdown(ms)}`}
    >
      <Timer size={compact ? 18 : 20} strokeWidth={1.75} />
      <span className="sidebar-idle__time">{formatCountdown(ms)}</span>
    </div>
  );
}

/** Agrupa los items conservando el orden de la configuración */
function groupBySection(items: NavItem[]) {
  const groups: { title?: string; items: NavItem[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.title === item.section) last.items.push(item);
    else groups.push({ title: item.section, items: [item] });
  }
  return groups;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, navItems, onLogout, onToggleTheme, idle }) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(() =>
    localStorage.getItem(COLLAPSED_KEY) === 'true'
  );
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= MOBILE_BREAKPOINT);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const handler = () => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile) setIsMobileOpen(false);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Bloquear scroll del body cuando el drawer está abierto en móvil
  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileOpen]);

  // Sincronizar ancho del sidebar como CSS variable para barras fijas
  useEffect(() => {
    const width = isMobile ? '0px' : isCollapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)';
    document.documentElement.style.setProperty('--sidebar-current-width', width);
    return () => { document.documentElement.style.removeProperty('--sidebar-current-width'); };
  }, [isCollapsed, isMobile]);

  const toggle = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, String(next));
      return next;
    });
  };

  const closeMobileMenu = () => setIsMobileOpen(false);
  const onNavigate = isMobile ? closeMobileMenu : undefined;

  const handleLogoutClick   = () => { setShowLogoutConfirm(true); closeMobileMenu(); };
  const handleLogoutCancel  = () => setShowLogoutConfirm(false);
  const handleLogoutConfirm = () => { setShowLogoutConfirm(false); onLogout(); };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowLogoutConfirm(false);
      setIsMobileOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const groups      = groupBySection(navItems.filter(i => !i.meta));
  const metaItems   = navItems.filter(i => i.meta);
  const profileItem = metaItems.find(i => i.to === '/profile');
  const footerItems = metaItems.filter(i => i.to !== '/profile');
  const canCreateAppointment = navItems.some(i => i.to === '/appointments');
  const initials = (user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '');

  // En móvil el drawer siempre muestra el texto completo
  const showLabels = isMobile ? true : !isCollapsed;
  const isDark = resolvedTheme === 'dark';

  const avatarEl = (
    <span className="sidebar-avatar">
      {user.photoUrl
        ? <img src={user.photoUrl} alt="" className="sidebar-avatar__img" />
        : initials}
    </span>
  );

  const brand = (
    <Link to="/" className="sidebar-brand" onClick={onNavigate} aria-label="DermicaPro, ir al inicio">
      <img src="/logo-mark-64.png" alt="" className="sidebar-brand__mark" width={34} height={34} />
      {showLabels && (
        <span className="sidebar-brand__text">
          <span className="sidebar-brand__name">DermicaPro</span>
          <span className="sidebar-brand__tagline">Skincare Clinic</span>
        </span>
      )}
    </Link>
  );

  const userBlock = (
    <div className="sidebar-user">
      {profileItem ? (
        <NavLink
          to={profileItem.to}
          className="sidebar-user__link"
          onClick={onNavigate}
          title={!showLabels ? `${user.firstName ?? ''} ${user.lastName ?? ''} — Mi perfil` : 'Mi perfil'}
        >
          {avatarEl}
          {showLabels && (
            <span className="sidebar-user__info">
              <span className="sidebar-user__name">{user.firstName} {user.lastName}</span>
              <span className="sidebar-user__role">{user.roleDisplay}</span>
            </span>
          )}
        </NavLink>
      ) : avatarEl}
    </div>
  );

  return (
    <>
      {/* ── Header fijo en móvil ── */}
      {isMobile && (
        <header className="sidebar-mobile-header">
          <button
            className="sidebar-mobile-hamburger"
            onClick={() => setIsMobileOpen(p => !p)}
            aria-label={isMobileOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {isMobileOpen ? <X size={22} strokeWidth={2} /> : <Menu size={22} strokeWidth={2} />}
          </button>
          <span className="sidebar-mobile-logo">
            <img src="/logo-mark-64.png" alt="" width={26} height={26} />
            DermicaPro
          </span>
          <div className="sidebar-mobile-avatar">{avatarEl}</div>
        </header>
      )}

      {isMobile && isMobileOpen && (
        <div className="sidebar-backdrop" onClick={closeMobileMenu} aria-hidden="true" />
      )}

      <aside
        className={[
          'dashboard-sidebar',
          !isMobile && isCollapsed ? 'is-collapsed' : '',
          isMobile && isMobileOpen ? 'is-mobile-open' : '',
        ].filter(Boolean).join(' ')}
        aria-label="Navegación principal"
      >
        {/* Marca + colapsar */}
        <div className="sidebar-header">
          {brand}
          {isMobile ? (
            <button className="sidebar-icon-btn" onClick={closeMobileMenu} aria-label="Cerrar menú">
              <X size={18} strokeWidth={2} />
            </button>
          ) : (
            <button
              className="sidebar-icon-btn sidebar-collapse-btn"
              onClick={toggle}
              aria-label={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
              title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            >
              {isCollapsed ? <PanelLeftOpen size={18} strokeWidth={1.75} /> : <PanelLeftClose size={18} strokeWidth={1.75} />}
            </button>
          )}
        </div>

        {/* Navegación */}
        <nav className="sidebar-nav">
          {canCreateAppointment && (
            <Link
              to="/appointments/new"
              className="sidebar-cta"
              onClick={onNavigate}
              title={!showLabels ? 'Nueva cita' : undefined}
            >
              <CalendarPlus size={18} strokeWidth={2} />
              {showLabels && 'Nueva cita'}
            </Link>
          )}

          {groups.map((group, gi) => (
            <div key={group.title ?? `grupo-${gi}`} className="sidebar-nav-group">
              {group.title && (showLabels
                ? <p className="sidebar-nav-section">{group.title}</p>
                : <div className="sidebar-nav-section-divider" aria-hidden="true" />)}
              <ul className="sidebar-nav-list">
                {group.items.map(item => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className="sidebar-nav-link"
                      title={!showLabels ? item.label : undefined}
                      onClick={onNavigate}
                    >
                      <span className="sidebar-nav-icon"><NavIcon name={item.icon} /></span>
                      {showLabels && <span className="sidebar-nav-label">{item.label}</span>}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Pie: acciones rápidas, contador de sesión y usuario */}
        <div className="sidebar-footer">
          <div className="sidebar-footer__actions">
            <button
              className="sidebar-icon-btn"
              onClick={onToggleTheme ?? toggleTheme}
              aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              title={isDark ? 'Modo claro' : 'Modo oscuro'}
            >
              {isDark ? <Sun size={19} strokeWidth={1.75} /> : <Moon size={19} strokeWidth={1.75} />}
            </button>
            {footerItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className="sidebar-icon-btn"
                aria-label={item.label}
                title={item.label}
                onClick={onNavigate}
              >
                <NavIcon name={item.icon} size={19} />
              </NavLink>
            ))}
            <button
              className="sidebar-icon-btn sidebar-icon-btn--danger sidebar-logout-btn"
              onClick={handleLogoutClick}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut size={19} strokeWidth={1.75} />
            </button>
            {idle && <IdleCountdown idle={idle} compact={!showLabels} />}
          </div>

          {userBlock}
        </div>
      </aside>

      {showLogoutConfirm && (
        <div className="app-dialog__backdrop" onClick={handleLogoutCancel}>
          <div
            className="app-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="app-dialog__icon app-dialog__icon--danger">
              <AlertTriangle size={24} strokeWidth={1.75} />
            </div>
            <div>
              <h2 id="logout-dialog-title" className="app-dialog__title">¿Cerrar sesión?</h2>
              <p className="app-dialog__text">Serás redirigido a la pantalla de inicio de sesión.</p>
            </div>
            <div className="app-dialog__actions">
              <button type="button" className="app-dialog__btn app-dialog__btn--ghost" onClick={handleLogoutCancel} autoFocus>
                Cancelar
              </button>
              <button type="button" className="app-dialog__btn app-dialog__btn--danger" onClick={handleLogoutConfirm}>
                <LogOut size={15} strokeWidth={2} />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

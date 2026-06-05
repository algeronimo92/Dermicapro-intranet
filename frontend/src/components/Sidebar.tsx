import React, { useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, CalendarDays, Syringe, UserCog,
  BadgeDollarSign, BarChart3, Palette, CircleUser, Settings,
  LogOut, ChevronLeft, ChevronRight, LucideIcon, AlertTriangle, Timer,
} from 'lucide-react';
import { NavItem } from '../config/navigation.config';
import { APP_VERSION } from '../config/version';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, Users, CalendarDays, Syringe, UserCog,
  BadgeDollarSign, BarChart3, Palette, CircleUser, Settings,
};

const COLLAPSED_KEY = 'dermicapro_sidebar_collapsed';

export interface SidebarUser {
  firstName?: string;
  lastName?: string;
  roleDisplay?: string;
  photoUrl?: string | null;
}

export interface SidebarIdleInfo {
  percentage: number;   // 100 = recién activo, 0 = expirado
  msRemaining: number;  // ms hasta logout
}

export interface SidebarProps {
  user: SidebarUser;
  navItems: NavItem[];
  onLogout: () => void;
  idleInfo?: SidebarIdleInfo; // solo para admins
}

function NavIcon({ name }: { name: string }) {
  const Icon = ICON_MAP[name];
  if (!Icon) return null;
  return <Icon size={18} strokeWidth={1.75} />;
}

function formatMs(ms: number): string {
  const totalSecs = Math.ceil(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function idleColor(pct: number): string {
  if (pct > 50) return 'var(--color-success)';
  if (pct > 25) return 'var(--color-warning)';
  return 'var(--color-error)';
}

export const Sidebar: React.FC<SidebarProps> = ({ user, navItems, onLogout, idleInfo }) => {
  const [isCollapsed, setIsCollapsed] = useState(() =>
    localStorage.getItem(COLLAPSED_KEY) === 'true'
  );
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const toggle = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, String(next));
      return next;
    });
  };

  const handleLogoutClick   = () => setShowLogoutConfirm(true);
  const handleLogoutCancel  = () => setShowLogoutConfirm(false);
  const handleLogoutConfirm = () => { setShowLogoutConfirm(false); onLogout(); };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setShowLogoutConfirm(false);
  }, []);

  useEffect(() => {
    if (showLogoutConfirm) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showLogoutConfirm, handleKeyDown]);

  const mainItems = navItems.filter(i => !i.meta);
  const metaItems = navItems.filter(i => i.meta);
  const initials  = (user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '');

  // Props del indicador de inactividad
  const showIdle     = idleInfo !== undefined;
  const idlePct      = idleInfo?.percentage ?? 100;
  const idleMs       = idleInfo?.msRemaining ?? 0;
  const idleCritical = idlePct <= 20;
  const color        = idleColor(idlePct);

  return (
    <>
      <aside className={`dashboard-sidebar${isCollapsed ? ' is-collapsed' : ''}`}>
        {/* Header */}
        {isCollapsed ? (
          <button className="sidebar-header--collapsed" onClick={toggle} aria-label="Expandir menú">
            <div className="sidebar-header--collapsed-inner">
              <ChevronRight size={18} strokeWidth={2.5} />
              <span className="sidebar-header--collapsed-hint">Abrir</span>
            </div>
          </button>
        ) : (
          <div className="sidebar-header">
            <h1 className="sidebar-logo">DermicaPro</h1>
            <button className="sidebar-toggle-btn" onClick={toggle} aria-label="Colapsar menú">
              <ChevronLeft size={15} strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* User */}
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {user.photoUrl
              ? <img src={user.photoUrl} alt={initials} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-full)' }} />
              : initials}
          </div>
          {!isCollapsed && (
            <div>
              <p className="sidebar-user-name">{user.firstName} {user.lastName}</p>
              <p className="sidebar-user-role">{user.roleDisplay}</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <ul className="sidebar-nav-list">
            {mainItems.map(item => (
              <li key={item.to} className="sidebar-nav-item">
                <NavLink to={item.to} end={item.end} className="sidebar-nav-link" data-label={item.label}>
                  <span className="sidebar-nav-icon"><NavIcon name={item.icon} /></span>
                  {!isCollapsed && item.label}
                </NavLink>
              </li>
            ))}
          </ul>
          {metaItems.length > 0 && (
            <>
              <div className="sidebar-nav-divider" />
              <ul className="sidebar-nav-list">
                {metaItems.map(item => (
                  <li key={item.to} className="sidebar-nav-item">
                    <NavLink to={item.to} end={item.end} className="sidebar-nav-link sidebar-nav-link--meta" data-label={item.label}>
                      <span className="sidebar-nav-icon"><NavIcon name={item.icon} /></span>
                      {!isCollapsed && item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button
            onClick={handleLogoutClick}
            className="sidebar-logout-btn"
            title={isCollapsed ? 'Cerrar Sesión' : undefined}
          >
            <LogOut size={16} strokeWidth={2} />
            {!isCollapsed && 'Cerrar Sesión'}
          </button>

            {/* Indicador de inactividad — solo admins */}
          {showIdle && (
            <div className={`sidebar-idle-indicator${idleCritical ? ' sidebar-idle-indicator--pulse' : ''}`}>
              {!isCollapsed ? (
                /* Expandido: icono + tiempo + barra */
                <div className="sidebar-idle-row">
                  <Timer size={12} strokeWidth={2} style={{ color, flexShrink: 0 }} />
                  <span className="sidebar-idle-time" style={{ color }}>
                    {formatMs(idleMs)}
                  </span>
                  <div className="sidebar-idle-track">
                    <div
                      className="sidebar-idle-fill"
                      style={{
                        width: `${idlePct}%`,
                        background: color,
                        boxShadow: idleCritical ? `0 0 5px ${color}` : 'none',
                      }}
                    />
                  </div>
                </div>
              ) : (
                /* Colapsado: solo la barra */
                <div className="sidebar-idle-track">
                  <div
                    className="sidebar-idle-fill"
                    style={{
                      width: `${idlePct}%`,
                      background: color,
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {!isCollapsed && <div className="sidebar-footer-version">v{APP_VERSION}</div>}
        </div>
      </aside>

      {/* Modal de confirmación de logout manual */}
      {showLogoutConfirm && (
        <div
          onClick={handleLogoutCancel}
          style={{
            position: 'fixed', inset: 0,
            background: 'var(--color-bg-overlay)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 'var(--z-modal-backdrop)' as any,
            padding: 'var(--spacing-md)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--color-bg-primary)',
              borderRadius: 'var(--radius-2xl)',
              boxShadow: 'var(--shadow-2xl)',
              border: '1px solid var(--color-border-secondary)',
              width: '100%', maxWidth: 380,
              overflow: 'hidden',
            }}
          >
            <div style={{
              padding: 'var(--spacing-xl) var(--spacing-xl) var(--spacing-md)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 'var(--spacing-md)', textAlign: 'center',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 'var(--radius-full)',
                background: 'var(--color-error-alpha-10)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AlertTriangle size={24} strokeWidth={1.75} color="var(--color-error)" />
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: 6 }}>
                  ¿Cerrar sesión?
                </div>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 'var(--line-height-normal)' }}>
                  Serás redirigido a la pantalla de inicio de sesión.
                </div>
              </div>
            </div>
            <div style={{ padding: 'var(--spacing-md) var(--spacing-xl) var(--spacing-xl)', display: 'flex', gap: 'var(--spacing-sm)' }}>
              <button
                onClick={handleLogoutCancel}
                autoFocus
                style={{
                  flex: 1, padding: '10px var(--spacing-md)',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--color-border-primary)',
                  background: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)',
                  cursor: 'pointer', transition: 'background var(--transition-fast)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-bg-secondary)')}
              >
                Cancelar
              </button>
              <button
                onClick={handleLogoutConfirm}
                style={{
                  flex: 1, padding: '10px var(--spacing-md)',
                  borderRadius: 'var(--radius-md)',
                  border: 'none', background: 'var(--color-error)', color: '#fff',
                  fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'background var(--transition-fast)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-error-dark)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-error)')}
              >
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

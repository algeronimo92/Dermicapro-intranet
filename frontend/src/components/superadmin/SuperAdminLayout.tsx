import React, { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, Building2, LogOut, Settings, ShieldCheck, UserCog } from 'lucide-react';
import { usePlatformAuth } from '../../contexts/PlatformAuthContext';
import { platformAdminApi } from '../../services/platformAdminApi';

export const SuperAdminLayout: React.FC = () => {
  const { platformAdmin, logout } = usePlatformAuth();
  const adminName = [platformAdmin?.firstName, platformAdmin?.lastName].filter(Boolean).join(' ') || platformAdmin?.email || 'Superadmin';
  const initials = adminName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const [failedMigrationsCount, setFailedMigrationsCount] = useState(0);

  useEffect(() => {
    platformAdminApi.getFailedMigrationsSummary()
      .then((summary) => setFailedMigrationsCount(summary.totalFailed))
      .catch(() => {});
  }, []);

  return (
    <div className="superadmin-shell">
      <aside className="superadmin-sidebar">
        <div className="superadmin-brand">
          <div className="superadmin-brand__mark"><ShieldCheck size={18} /></div>
          <div>
            <strong>DermicaPro</strong>
            <span>Plataforma</span>
          </div>
        </div>

        <div className="superadmin-sidebar__user">
          <div className="superadmin-sidebar__avatar">{initials}</div>
          <div className="superadmin-sidebar__admin-info">
            <p className="superadmin-sidebar__admin-name">{adminName}</p>
            <p className="superadmin-sidebar__admin-role">Superadmin</p>
          </div>
        </div>

        <nav className="superadmin-nav" aria-label="Superadmin">
          <NavLink to="/superadmin/dashboard" className={({ isActive }) => `superadmin-nav__item ${isActive ? 'superadmin-nav__item--active' : ''}`}>
            <BarChart3 size={18} />Dashboard
          </NavLink>
          <NavLink to="/superadmin/tenants" className={({ isActive }) => `superadmin-nav__item ${isActive ? 'superadmin-nav__item--active' : ''}`}>
            <Building2 size={18} />
            <span style={{ flex: 1 }}>Clínicas</span>
            {failedMigrationsCount > 0 && (
              <span style={{
                background: 'var(--color-error)',
                color: '#fff',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-bold)',
                padding: '1px 6px',
                minWidth: 18,
                textAlign: 'center',
                lineHeight: 1.6,
              }}>
                {failedMigrationsCount}
              </span>
            )}
          </NavLink>
          <NavLink to="/superadmin/admins" className={({ isActive }) => `superadmin-nav__item ${isActive ? 'superadmin-nav__item--active' : ''}`}>
            <UserCog size={18} />Administradores
          </NavLink>
          <NavLink to="/superadmin/settings" className={({ isActive }) => `superadmin-nav__item ${isActive ? 'superadmin-nav__item--active' : ''}`}>
            <Settings size={18} />Configuración
          </NavLink>
        </nav>

        <div className="superadmin-sidebar__footer">
          <button type="button" className="superadmin-sidebar__logout" onClick={logout} aria-label="Cerrar sesión">
            <LogOut size={16} />Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="superadmin-content"><Outlet /></main>
    </div>
  );
};

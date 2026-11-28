import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Bell, ClipboardList, Package, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/inventory.css';

/**
 * Inventario por apartados. Cada pestaña aparece según Empleados -> Privilegios.
 * El inventario es sólo inventario: no registra ventas ni consumos.
 */
export function InventoryLayout() {
  const { modules } = useAuth();
  const { pathname } = useLocation();
  const tabs = [
    { to: '/inventory/purchases', label: 'Compras', icon: ShoppingBag, show: modules.inventory.purchases },
    { to: '/inventory/shopping-list', label: 'Lista de compras', icon: ClipboardList, show: true },
    { to: '/inventory/alerts', label: 'Alertas de stock', icon: Bell, show: true },
  ].filter(tab => tab.show);
  // Productos incluye la ficha de cada producto (/inventory/:id).
  const inOtherTab = tabs.some(tab => pathname.startsWith(tab.to));
  const allTabs = [{ to: '/inventory', label: 'Productos', icon: Package, show: true }, ...tabs];

  return (
    <>
      <nav className="inventory-tabs" aria-label="Apartados de inventario">
        {allTabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `inventory-tab${(to === '/inventory' ? !inOtherTab : isActive) ? ' is-active' : ''}`}
          >
            <Icon size={16} aria-hidden /> {label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </>
  );
}

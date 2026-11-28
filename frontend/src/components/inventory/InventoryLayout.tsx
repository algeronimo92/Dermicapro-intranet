import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, Bell, ClipboardCheck, ClipboardList, Package, ShoppingBag, Undo2 } from 'lucide-react';
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
    { to: '/inventory/summary', label: 'Resumen', icon: BarChart3, show: true },
    { to: '/inventory/purchases', label: 'Compras', icon: ShoppingBag, show: modules.inventory.purchases },
    { to: '/inventory/returns', label: 'Devoluciones', icon: Undo2, show: modules.inventory.returns },
    { to: '/inventory/counts', label: 'Conteos', icon: ClipboardCheck, show: modules.inventory.counts },
    { to: '/inventory/shopping-list', label: 'Lista de compras', icon: ClipboardList, show: true },
    { to: '/inventory/alerts', label: 'Alertas de stock', icon: Bell, show: true },
  ].filter(tab => tab.show);
  // Productos incluye la ficha de cada producto (/inventory/:id).
  const inOtherTab = tabs.some(tab => pathname.startsWith(tab.to));
  const allTabs = [{ to: '/inventory', label: 'Productos', icon: Package, show: true }, ...tabs];
  const navRef = useRef<HTMLElement>(null);

  // En celular las pestañas se desplazan de lado: deja visible la activa.
  useEffect(() => {
    navRef.current?.querySelector('.is-active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [pathname]);

  return (
    <>
      <nav ref={navRef} className="inventory-tabs" aria-label="Apartados de inventario">
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

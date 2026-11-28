import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, PackageX, TriangleAlert } from 'lucide-react';
import {
  INVENTORY_CHANGED_EVENT,
  notificationsService,
  type UserNotifications,
} from '../services/notifications.service';
import '../styles/notifications.css';

const REFRESH_MS = 3 * 60 * 1000;
const PANEL_WIDTH = 340;

interface NotificationBellProps {
  /** Al navegar desde el panel (en móvil cierra el menú). */
  onNavigate?: () => void;
}

/**
 * Campana del menú: avisa de los productos en alerta de stock. Sólo aparece
 * para admin e inventario (el backend devuelve null al resto).
 */
export function NotificationBell({ onNavigate }: NotificationBellProps) {
  const navigate = useNavigate();
  const [data, setData] = useState<UserNotifications | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; bottom: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    notificationsService.getMine().then(setData).catch(() => { /* se reintenta en el próximo ciclo */ });
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    window.addEventListener('focus', load);
    window.addEventListener(INVENTORY_CHANGED_EVENT, load);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', load);
      window.removeEventListener(INVENTORY_CHANGED_EVENT, load);
    };
  }, [load]);

  // El panel se abre hacia arriba desde la campana (está en el pie del menú).
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 8));
    setPosition({ left, bottom: window.innerHeight - rect.top + 8 });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const lowStock = data?.lowStock;
  if (!lowStock) return null;

  const count = lowStock.count;
  const label = count === 0
    ? 'Notificaciones: sin avisos'
    : `Notificaciones: ${count} producto${count === 1 ? '' : 's'} en alerta de stock`;

  const go = (to: string) => {
    setOpen(false);
    onNavigate?.();
    navigate(to);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`sidebar-icon-btn notification-bell${count > 0 ? ' has-alerts' : ''}`}
        onClick={() => { setOpen(o => !o); if (!open) load(); }}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Notificaciones"
      >
        <Bell size={19} strokeWidth={1.75} />
        {count > 0 && <span className="notification-bell__badge" aria-hidden>{count > 99 ? '99+' : count}</span>}
      </button>

      {open && position && createPortal(
        <div
          ref={panelRef}
          className="notification-panel"
          role="dialog"
          aria-label="Notificaciones"
          style={{ left: position.left, bottom: position.bottom, width: PANEL_WIDTH }}
        >
          <div className="notification-panel__header">
            <h2>Notificaciones</h2>
          </div>

          {count === 0 ? (
            <p className="notification-panel__empty">Todo en orden: ningún producto está en alerta de stock.</p>
          ) : (
            <>
              <p className="notification-panel__summary">
                <TriangleAlert size={16} aria-hidden />
                {count === 1 ? '1 producto llegó' : `${count} productos llegaron`} a su stock mínimo
              </p>
              <ul className="notification-panel__list">
                {lowStock.items.map(item => (
                  <li key={item.id}>
                    <button type="button" onClick={() => go(`/inventory/${item.id}`)}>
                      <span className={`notification-panel__icon${item.stock === 0 ? ' is-out' : ''}`} aria-hidden>
                        {item.stock === 0 ? <PackageX size={16} /> : <TriangleAlert size={16} />}
                      </span>
                      <span className="notification-panel__text">
                        <span className="notification-panel__name">{item.name}</span>
                        <span className="notification-panel__meta">
                          {[item.brand, item.presentation].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <span className={`notification-panel__stock${item.stock === 0 ? ' is-out' : ''}`}>
                        {item.stock === 0 ? 'Agotado' : `${item.stock} / mín. ${item.minStock}`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {count > lowStock.items.length && (
                <p className="notification-panel__more">y {count - lowStock.items.length} más…</p>
              )}
            </>
          )}

          <div className="notification-panel__footer">
            <Link to="/inventory/alerts?low=1" onClick={() => { setOpen(false); onNavigate?.(); }}>
              Ver alertas de stock
            </Link>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

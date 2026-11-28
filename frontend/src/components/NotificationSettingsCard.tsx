import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import {
  notificationsService,
  notifyInventoryChanged,
  type NotificationSettingsPayload,
  type NotificationType,
} from '../services/notifications.service';
import { apiErrorMessage } from '../utils/apiError';
import '../styles/notifications.css';

/**
 * Qué roles reciben cada notificación de la campana (Empleados -> Privilegios).
 * Un rol marcado que no puede ver Inventario no recibe el aviso de stock.
 */
export function NotificationSettingsCard() {
  const [payload, setPayload] = useState<NotificationSettingsPayload | null>(null);
  const [draft, setDraft] = useState<Record<NotificationType, string[]> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    notificationsService.getSettings()
      .then(p => { setPayload(p); setDraft(p.settings); })
      .catch(err => setError(apiErrorMessage(err, 'No se pudo cargar la configuración de notificaciones')));
  }, []);

  if (!payload || !draft) {
    return error ? <section className="dbp-card"><div className="alert alert-error">{error}</div></section> : null;
  }

  const has = (type: NotificationType, role: string) => draft[type]?.includes(role) ?? false;
  const dirty = payload.types.some(t =>
    payload.roles.some(r => has(t.key, r.role) !== payload.settings[t.key].includes(r.role)));

  const toggle = (type: NotificationType, role: string) => {
    setNotice(null);
    setDraft(prev => prev && {
      ...prev,
      [type]: prev[type].includes(role) ? prev[type].filter(r => r !== role) : [...prev[type], role],
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await notificationsService.saveSettings(draft);
      setPayload(updated);
      setDraft(updated.settings);
      setNotice('Notificaciones actualizadas');
      notifyInventoryChanged(); // la campana de quien guarda refleja el cambio
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudieron guardar las notificaciones'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="dbp-card">
      <div className="dbp-card__head">
        <div>
          <h2><Bell size={18} aria-hidden style={{ verticalAlign: '-3px' }} /> Notificaciones</h2>
          <p className="dbp-muted">
            Qué roles ven cada aviso en la campana del menú. El aviso de stock sólo llega a roles que pueden ver Inventario.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      <div className="table-container">
        <table className="table dbp-table dbp-notifications">
          <thead>
            <tr>
              <th>Aviso</th>
              {payload.roles.map(r => <th key={r.role}>{r.displayName}</th>)}
            </tr>
          </thead>
          <tbody>
            {payload.types.map(t => (
              <tr key={t.key}>
                <td>
                  <div className="dbp-table__name">{t.label}</div>
                  <small className="dbp-muted">{t.hint}</small>
                </td>
                {payload.roles.map(r => {
                  const on = has(t.key, r.role);
                  const changed = on !== payload.settings[t.key].includes(r.role);
                  const blocked = t.key === 'lowStock' && !r.canViewInventory;
                  return (
                    <td key={r.role} className={`dbp-cell${changed ? ' is-changed' : ''}`}>
                      <label
                        className="checkbox-modern"
                        title={blocked ? `${r.displayName} no puede ver Inventario: no recibirá este aviso aunque esté marcado` : `${t.label} para ${r.displayName}`}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggle(t.key, r.role)}
                          aria-label={`${t.label} para ${r.displayName}`}
                        />
                        <span className="checkbox-custom" />
                      </label>
                      {blocked && on && <small className="dbp-muted" style={{ display: 'block' }}>Sin acceso a Inventario</small>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dirty && (
        <div className="dbp-footer__actions" style={{ marginTop: 'var(--spacing-sm)', justifyContent: 'flex-end', display: 'flex', gap: 'var(--spacing-sm)' }}>
          <button type="button" className="action-btn secondary" onClick={() => setDraft(payload.settings)} disabled={saving}>Descartar</button>
          <button type="button" className="action-btn primary" onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar notificaciones'}
          </button>
        </div>
      )}
    </section>
  );
}

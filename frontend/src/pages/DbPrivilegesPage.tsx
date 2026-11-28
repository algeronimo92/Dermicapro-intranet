import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageDetailLayout } from '../components/templates';
import {
  dbPrivilegesService,
  ObjectPrivilege,
  PRIVILEGE_LABELS,
  PrivilegeMatrix,
  RoleGrants,
  SYSTEM_PRIVILEGE_LABELS,
  SystemPrivileges,
} from '../services/dbPrivileges.service';
import { apiErrorMessage } from '../utils/apiError';
import { NotificationSettingsCard } from '../components/NotificationSettingsCard';
import '../styles/db-privileges.css';

const MODIFYING: ObjectPrivilege[] = ['INSERT', 'UPDATE', 'DELETE'];

const has = (grants: RoleGrants, table: string, p: ObjectPrivilege) => grants[table]?.includes(p) ?? false;

/** Las mismas sentencias que ejecutará el backend, para mostrarlas antes de guardar. */
function pendingStatements(dbRole: string, privileges: ObjectPrivilege[], tables: string[], before: RoleGrants, after: RoleGrants) {
  const lines: string[] = [];
  for (const table of tables) {
    const grant = privileges.filter(p => has(after, table, p) && !has(before, table, p));
    const revoke = privileges.filter(p => has(before, table, p) && !has(after, table, p));
    if (grant.length) lines.push(`GRANT ${grant.join(', ')} ON ${table} TO ${dbRole};`);
    if (revoke.length) lines.push(`REVOKE ${revoke.join(', ')} ON ${table} FROM ${dbRole};`);
  }
  return lines;
}

export function DbPrivilegesPage() {
  const navigate = useNavigate();
  const [matrix, setMatrix] = useState<PrivilegeMatrix | null>(null);
  const [selected, setSelected] = useState<string>('');
  const [draft, setDraft] = useState<RoleGrants>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    dbPrivilegesService.getMatrix()
      .then((m) => {
        setMatrix(m);
        const first = m.roles[0];
        if (first) { setSelected(first.appRole); setDraft(first.grants); }
      })
      .catch((err) => setError(apiErrorMessage(err, 'No se pudieron cargar los privilegios')))
      .finally(() => setLoading(false));
  }, []);

  const role = matrix?.roles.find(r => r.appRole === selected);
  const modules = useMemo(() => {
    const groups = new Map<string, PrivilegeMatrix['tables']>();
    matrix?.tables.forEach(t => groups.set(t.module, [...(groups.get(t.module) ?? []), t]));
    return [...groups.entries()];
  }, [matrix]);

  const statements = role && matrix
    ? pendingStatements(role.dbRole, matrix.privileges, matrix.tables.map(t => t.name), role.grants, draft)
    : [];
  const dirty = statements.length > 0;

  const selectRole = (appRole: string) => {
    if (dirty && !window.confirm('Hay cambios sin guardar en este rol. ¿Descartarlos?')) return;
    const next = matrix?.roles.find(r => r.appRole === appRole);
    setSelected(appRole);
    setDraft(next?.grants ?? {});
    setNotice(null);
    setError(null);
  };

  // Escribir sin leer no sirve con Prisma (usa RETURNING y WHERE): marcar
  // Crear/Modificar/Eliminar marca Leer, y quitar Leer quita todo.
  const toggle = (table: string, p: ObjectPrivilege) => {
    setNotice(null);
    setDraft(prev => {
      const current = new Set(prev[table] ?? []);
      if (current.has(p)) {
        if (p === 'SELECT') current.clear(); else current.delete(p);
      } else {
        current.add(p);
        if (MODIFYING.includes(p)) current.add('SELECT');
      }
      return { ...prev, [table]: (matrix?.privileges ?? []).filter(x => current.has(x)) };
    });
  };

  const setModule = (tables: string[], privileges: ObjectPrivilege[]) => {
    setNotice(null);
    setDraft(prev => {
      const next = { ...prev };
      tables.forEach(t => { next[t] = privileges; });
      return next;
    });
  };

  const save = async () => {
    if (!role || !matrix) return;
    setSaving(true);
    setError(null);
    try {
      const grants = Object.fromEntries(matrix.tables.map(t => [t.name, draft[t.name] ?? []]));
      const { role: updated, message } = await dbPrivilegesService.saveRole(role.appRole, grants);
      setMatrix(m => m && { ...m, roles: m.roles.map(r => r.appRole === updated.appRole ? updated : r) });
      setDraft(updated.grants);
      setNotice(message);
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudieron guardar los privilegios'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageDetailLayout
      title="Privilegios"
      onBack={() => navigate('/employees')}
      backLabel="Empleados"
      isLoading={loading}
      error={!matrix ? error : null}
    >
      {matrix && (
        <div className="dbp">
          <NotificationSettingsCard />

          <div className="dbp-roles" role="tablist" aria-label="Rol">
            <div className="dbp-role dbp-role--locked" title="El administrador consulta como dueño de la base: tiene todos los privilegios y no se pueden quitar.">
              Administrador <span>todos los privilegios</span>
            </div>
            {matrix.roles.map(r => (
              <button
                key={r.appRole}
                type="button"
                role="tab"
                aria-selected={r.appRole === selected}
                className={`dbp-role${r.appRole === selected ? ' is-active' : ''}`}
                onClick={() => selectRole(r.appRole)}
              >
                {r.displayName} <span>{r.dbRole}</span>
              </button>
            ))}
          </div>

          {role && (
            <>
              <section className="dbp-card">
                <h2>Empleados con este rol</h2>
                <p className="dbp-muted">
                  Cada empleado tiene su propio rol, miembro de <code>{role.dbRole}</code>: hereda los
                  privilegios de abajo y, dentro de la base, cada consulta queda identificada con la persona que la hizo.
                </p>
                {role.members.length === 0 ? (
                  <p className="dbp-muted">Ningún empleado tiene este rol.</p>
                ) : (
                  <ul className="dbp-members">
                    {role.members.map(m => (
                      <li key={m.dbRole}>
                        <span>{m.name}</span>
                        <code>{m.dbRole}</code>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="dbp-card">
                <h2>Privilegios del sistema</h2>
                <p className="dbp-muted">
                  Crear, modificar o eliminar objetos de la base de datos. Ningún rol de la aplicación los tiene:
                  sólo el dueño de la base, al aplicar migraciones. Se muestran como referencia y no se pueden activar desde aquí.
                </p>
                <ul className="dbp-system">
                  {(Object.keys(SYSTEM_PRIVILEGE_LABELS) as (keyof SystemPrivileges)[]).map(k => (
                    <li key={k} className={role.system[k] ? 'is-on' : ''}>
                      <span aria-hidden>{role.system[k] ? '✓' : '✕'}</span> {SYSTEM_PRIVILEGE_LABELS[k]}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="dbp-card">
                <div className="dbp-card__head">
                  <div>
                    <h2>Privilegios de objeto</h2>
                    <p className="dbp-muted">
                      Por tabla. PostgreSQL rechaza cualquier consulta de <strong>{role.displayName}</strong> sin el privilegio,
                      aunque la pantalla la permita. Crear, modificar y eliminar necesitan también leer.
                    </p>
                  </div>
                </div>

                {error && <div className="alert alert-error">{error}</div>}
                {notice && <div className="alert alert-success">{notice}</div>}

                <div className="table-container">
                  <table className="table dbp-table">
                    <thead>
                      <tr>
                        <th>Tabla</th>
                        {matrix.privileges.map(p => (
                          <th key={p} title={PRIVILEGE_LABELS[p].hint}>
                            {PRIVILEGE_LABELS[p].label}<small>{p}</small>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {modules.map(([module, tables]) => (
                        <Fragment key={module}>
                          <tr className="dbp-module">
                            <td colSpan={matrix.privileges.length + 1}>
                              {module}
                              <span className="dbp-module__actions">
                                <button type="button" onClick={() => setModule(tables.map(t => t.name), ['SELECT'])}>Solo lectura</button>
                                <button type="button" onClick={() => setModule(tables.map(t => t.name), matrix.privileges)}>Todo</button>
                                <button type="button" onClick={() => setModule(tables.map(t => t.name), [])}>Nada</button>
                              </span>
                            </td>
                          </tr>
                          {tables.map(t => (
                            <tr key={t.name}>
                              <td>
                                <div className="dbp-table__name">{t.label}</div>
                                <code>{t.name}</code>
                              </td>
                              {matrix.privileges.map(p => {
                                const on = has(draft, t.name, p);
                                const changed = on !== has(role.grants, t.name, p);
                                return (
                                  <td key={p} className={`dbp-cell${changed ? ' is-changed' : ''}`}>
                                    <label className="checkbox-modern" title={`${PRIVILEGE_LABELS[p].hint} en ${t.label}`}>
                                      <input
                                        type="checkbox"
                                        checked={on}
                                        onChange={() => toggle(t.name, p)}
                                        aria-label={`${PRIVILEGE_LABELS[p].label} ${t.label}`}
                                      />
                                      <span className="checkbox-custom" />
                                    </label>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <div className={`dbp-footer${dirty ? ' is-dirty' : ''}`}>
                {dirty ? (
                  <>
                    <details>
                      <summary>{statements.length} sentencia(s) por ejecutar</summary>
                      <pre>{statements.join('\n')}</pre>
                    </details>
                    <div className="dbp-footer__actions">
                      <button type="button" className="action-btn secondary" onClick={() => setDraft(role.grants)} disabled={saving}>
                        Descartar
                      </button>
                      <button type="button" className="action-btn primary" onClick={save} disabled={saving}>
                        {saving ? 'Aplicando...' : 'Aplicar en la base de datos'}
                      </button>
                    </div>
                  </>
                ) : (
                  <span className="dbp-muted">Sin cambios pendientes</span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </PageDetailLayout>
  );
}

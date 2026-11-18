import React, { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { Check, Copy, KeyRound, Link2, RefreshCw, ShieldOff } from 'lucide-react';
import { Button } from './Button';
import { crmIntegrationService, CrmIntegrationStatus } from '../services/settings.service';
import { usersService } from '../services/users.service';
import { User } from '../types';

type Confirming = 'regenerate' | 'revoke' | null;

const CONFIRM_COPY: Record<Exclude<Confirming, null>, { text: string; action: string }> = {
  regenerate: {
    text: 'El token actual dejará de funcionar al instante. El CRM no podrá enviar citas hasta que pegues ahí el nuevo.',
    action: 'Sí, generar uno nuevo',
  },
  revoke: {
    text: 'El ERP dejará de aceptar citas del CRM. Las que se agenden mientras tanto quedan en el CRM para reenviar.',
    action: 'Sí, desactivar',
  },
};

function formatDate(value: string | null): string {
  if (!value) return '';
  return new Date(value).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * Configuración → Integración con el CRM (solo admin). Aquí se genera el token
 * que se pega en el CRM para que las citas agendadas allá aparezcan en la
 * agenda. El ERP guarda solo el hash: el token se ve una única vez.
 */
export const CrmIntegrationSettings: React.FC = () => {
  const [status, setStatus] = useState<CrmIntegrationStatus | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([crmIntegrationService.get(), usersService.getAllUsers({ isActive: true })])
      .then(([loaded, activeUsers]) => {
        if (cancelled) return;
        setStatus(loaded);
        setUsers(activeUsers);
      })
      .catch(() => { if (!cancelled) setError('No se pudo cargar la integración con el CRM.'); });
    return () => { cancelled = true; };
  }, []);

  async function run(action: () => Promise<void>, failure: string) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (err) {
      const message = isAxiosError<{ error?: string }>(err) ? err.response?.data?.error : undefined;
      setError(message || failure);
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  }

  const generate = () => run(async () => {
    const { token, ...next } = await crmIntegrationService.generateToken();
    setStatus(next);
    setNewToken(token);
  }, 'No se pudo generar el token.');

  const revoke = () => run(async () => {
    setStatus(await crmIntegrationService.revokeToken());
    setNewToken(null);
  }, 'No se pudo desactivar la integración.');

  const changeFallback = (userId: string) => run(async () => {
    setStatus(await crmIntegrationService.setFallbackUser(userId || null));
  }, 'No se pudo guardar el usuario de respaldo.');

  return (
    <div className="settings-group">
      <label className="settings-label">Integración con el CRM</label>
      <p className="settings-hint">
        Las citas que ventas agenda en el CRM aparecen solas en la agenda, con su paciente, su paquete y su adelanto.
        Para conectarlos, genera un token aquí y pégalo en el CRM, en Integraciones → ERP.
      </p>

      {error && <p className="crm-integration-error" role="alert">{error}</p>}
      {!status && !error && <p className="settings-hint">Cargando…</p>}

      {status && (
        <>
          {newToken && <NewToken token={newToken} />}
          <TokenStatus status={status} hasNewToken={Boolean(newToken)} />

          {confirming ? (
            <div className="crm-integration-confirm" role="alertdialog" aria-label="Confirmar">
              <p>{CONFIRM_COPY[confirming].text}</p>
              <div className="crm-integration-actions">
                <Button variant="danger" size="small" isLoading={busy} onClick={confirming === 'revoke' ? revoke : generate}>
                  {CONFIRM_COPY[confirming].action}
                </Button>
                <Button variant="secondary" size="small" disabled={busy} onClick={() => setConfirming(null)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <div className="crm-integration-actions">
              {status.configured ? (
                <>
                  <Button variant="secondary" size="small" disabled={busy} onClick={() => setConfirming('regenerate')}>
                    <RefreshCw size={14} strokeWidth={2} /> Regenerar token
                  </Button>
                  <Button variant="secondary" size="small" disabled={busy} onClick={() => setConfirming('revoke')}>
                    <ShieldOff size={14} strokeWidth={2} /> Desactivar
                  </Button>
                </>
              ) : (
                <Button variant="primary" size="small" isLoading={busy} onClick={generate}>
                  <KeyRound size={14} strokeWidth={2} /> Generar token
                </Button>
              )}
            </div>
          )}

          <FallbackUser status={status} users={users} disabled={busy} onChange={changeFallback} />
        </>
      )}
    </div>
  );
};

/** El token recién generado y la dirección del ERP: lo que hay que pegar en el CRM. */
function NewToken({ token }: { token: string }) {
  return (
    <div className="crm-integration-new" role="status">
      <p className="crm-integration-new-title">Copia el token ahora: no se volverá a mostrar.</p>
      <CopyField label="Token de la integración" value={token} icon={<KeyRound size={14} strokeWidth={2} />} />
      <CopyField label="Dirección del ERP" value={window.location.origin} icon={<Link2 size={14} strokeWidth={2} />} />
      <p className="crm-integration-new-hint">
        En el CRM: Integraciones → ERP → «Citas en la agenda del ERP». Pega los dos datos, prueba la conexión y guarda.
      </p>
    </div>
  );
}

function CopyField({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin permiso de portapapeles: el campo queda seleccionable para copiar a mano.
    }
  }

  return (
    <div className="crm-integration-field">
      <span className="crm-integration-field-label">{icon} {label}</span>
      <div className="crm-integration-field-row">
        <input className="crm-integration-code" readOnly value={value} aria-label={label} onFocus={event => event.target.select()} />
        <Button variant="secondary" size="small" onClick={copy}>
          {copied ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={2} />}
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
      </div>
    </div>
  );
}

function TokenStatus({ status, hasNewToken }: { status: CrmIntegrationStatus; hasNewToken: boolean }) {
  if (!status.configured) {
    return (
      <p className="crm-integration-state crm-integration-state--off">
        Sin token: el ERP no acepta citas del CRM.
      </p>
    );
  }
  const author = status.tokenCreatedBy ? ` por ${status.tokenCreatedBy}` : '';
  return (
    <p className="crm-integration-state crm-integration-state--on">
      Token activo{hasNewToken ? '' : <> terminado en <code>…{status.tokenHint}</code></>}
      {' · '}generado el {formatDate(status.tokenCreatedAt)}{author}
    </p>
  );
}

function FallbackUser({ status, users, disabled, onChange }: {
  status: CrmIntegrationStatus;
  users: User[];
  disabled: boolean;
  onChange: (userId: string) => void;
}) {
  return (
    <div className="crm-integration-fallback">
      <label className="crm-integration-field-label" htmlFor="crm-fallback-user">Usuario de respaldo</label>
      <p className="settings-hint">
        La cita queda a nombre del vendedor si tiene usuario aquí con el mismo correo que en el CRM.
        Si no, queda a nombre de este usuario. Sin elegir uno, esas citas se rechazan.
      </p>
      <select
        id="crm-fallback-user"
        className="input crm-integration-select"
        value={status.fallbackUserId ?? ''}
        disabled={disabled}
        onChange={event => onChange(event.target.value)}
      >
        <option value="">Ninguno</option>
        {users.map(user => (
          <option key={user.id} value={user.id}>{user.firstName} {user.lastName} · {user.email}</option>
        ))}
      </select>
    </div>
  );
}

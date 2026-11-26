import React, { useCallback, useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { AlertTriangle, CheckCircle2, Info, Loader2, Mail, Send, Unplug } from 'lucide-react';
import {
  MailProvider,
  MailSettingsStatus,
  PROVIDER_LABELS,
  SmtpSecurity,
  mailSettingsService,
} from '../../services/mailSettings.service';
import '../../styles/mail-settings.css';

/** Datos de conexión de los proveedores más comunes: el admin sólo escribe su correo y contraseña. */
const PRESETS: { id: string; label: string; host: string; port: number; security: SmtpSecurity }[] = [
  { id: 'hostinger', label: 'Hostinger', host: 'smtp.hostinger.com', port: 465, security: 'ssl' },
  { id: 'zoho', label: 'Zoho Mail (dominio propio)', host: 'smtppro.zoho.com', port: 465, security: 'ssl' },
  { id: 'gmail', label: 'Gmail (contraseña de aplicación)', host: 'smtp.gmail.com', port: 587, security: 'starttls' },
  { id: 'outlook', label: 'Outlook / Microsoft 365', host: 'smtp.office365.com', port: 587, security: 'starttls' },
];
const DEV_PRESET = { id: 'mailpit', label: 'Mailpit (sólo desarrollo)', host: 'mailpit', port: 1025, security: 'none' as SmtpSecurity };
const OTHER = 'otro';
const PORTS = [465, 587, 2525, 25];
const DEV_PORTS = [...PORTS, 1025];

const OAUTH_ERRORS: Record<string, string> = {
  expired: 'El intento de conexión venció. Vuelve a intentarlo.',
  denied: 'No se dio el permiso en la cuenta. Vuelve a intentarlo y acepta el permiso de envío.',
  unavailable: 'Esa conexión no está habilitada en el servidor.',
  no_refresh_token: 'El proveedor no entregó un acceso permanente. Vuelve a intentarlo.',
  no_mailbox: 'La cuenta de Zoho no tiene un buzón de Zoho Mail.',
  exchange_failed: 'El proveedor rechazó la autorización. Vuelve a intentarlo.',
  reconnect: 'El proveedor ya no acepta esa autorización. Vuelve a conectar la cuenta.',
};

interface Draft {
  host: string;
  port: number;
  security: SmtpSecurity;
  username: string;
  password: string;
  fromAddress: string;
  fromName: string;
}

const draftFrom = (status: MailSettingsStatus): Draft => {
  const smtp = status.mode === 'smtp';
  return {
    host: smtp ? status.host : PRESETS[0].host,
    port: smtp ? status.port : PRESETS[0].port,
    security: smtp ? status.security : PRESETS[0].security,
    username: smtp && status.username !== status.fromAddress ? status.username : '',
    password: '',
    fromAddress: smtp ? status.fromAddress : '',
    fromName: smtp ? status.fromName : 'DermicaPro',
  };
};

const errorMessage = (err: unknown, fallback: string): string =>
  (err as AxiosError<{ error?: string }>)?.response?.data?.error || fallback;

/** Lee el resultado que deja el callback de OAuth en la URL (se borra en un efecto). */
const readOAuthResult = (): { kind: 'ok' | 'error'; text: string } | null => {
  const params = new URLSearchParams(window.location.search);
  const result = params.get('email');
  if (!result) return null;
  const provider = params.get('provider') as MailProvider | null;
  const label = provider && PROVIDER_LABELS[provider] ? PROVIDER_LABELS[provider] : 'el proveedor';
  if (result === 'connected') return { kind: 'ok', text: `Cuenta de ${label} conectada. Envía un correo de prueba para confirmar.` };
  return { kind: 'error', text: OAUTH_ERRORS[params.get('reason') ?? ''] ?? `No se pudo conectar con ${label}.` };
};

export function MailSettingsSection() {
  const [status, setStatus] = useState<MailSettingsStatus | null>(null);
  const [loadError, setLoadError] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [preset, setPreset] = useState(PRESETS[0].id);
  const [busy, setBusy] = useState<'save' | 'test' | 'clear' | 'disconnect' | MailProvider | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(readOAuthResult);

  const apply = useCallback((next: MailSettingsStatus) => {
    setStatus(next);
    const nextDraft = draftFrom(next);
    setDraft(nextDraft);
    const all = next.allowInsecure ? [...PRESETS, DEV_PRESET] : PRESETS;
    setPreset(
      all.find((p) => p.host === nextDraft.host && p.port === nextDraft.port && p.security === nextDraft.security)?.id ?? OTHER,
    );
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('email')) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
    }
    mailSettingsService.get().then(apply).catch((err) => setLoadError(errorMessage(err, 'No se pudo cargar el correo de envío.')));
    if (window.location.hash === '#correo') document.getElementById('correo')?.scrollIntoView({ behavior: 'smooth' });
  }, [apply]);

  if (loadError) return <Section><div className="mail-notice mail-notice--error"><AlertTriangle size={16} />{loadError}</div></Section>;
  if (!status || !draft) return <Section><div className="mail-loading"><Loader2 size={16} className="mail-spin" />Cargando...</div></Section>;

  const presets = status.allowInsecure ? [...PRESETS, DEV_PRESET] : PRESETS;

  const setField = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));

  const choosePreset = (id: string) => {
    setPreset(id);
    const p = presets.find((x) => x.id === id);
    if (p) setDraft((d) => (d ? { ...d, host: p.host, port: p.port, security: p.security } : d));
  };

  const run = async (kind: NonNullable<typeof busy>, action: () => Promise<void>) => {
    setBusy(kind);
    setNotice(null);
    try {
      await action();
    } finally {
      setBusy(null);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    run('save', async () => {
      try {
        const next = await mailSettingsService.saveSmtp({
          ...draft,
          username: draft.username.trim(),
          password: draft.password ? draft.password : null,
        });
        apply(next);
        setNotice({ kind: 'ok', text: 'Correo guardado. Envía un correo de prueba para confirmar que funciona.' });
      } catch (err) {
        setNotice({ kind: 'error', text: errorMessage(err, 'No se pudo guardar el correo.') });
      }
    });
  };

  const handleConnect = (provider: MailProvider) =>
    run(provider, async () => {
      try {
        window.location.href = await mailSettingsService.connect(provider);
      } catch (err) {
        setNotice({ kind: 'error', text: errorMessage(err, `No se pudo conectar con ${PROVIDER_LABELS[provider]}.`) });
      }
    });

  const handleTest = () =>
    run('test', async () => {
      try {
        const { recipient } = await mailSettingsService.sendTest();
        setNotice({ kind: 'ok', text: `Enviamos un correo de prueba a ${recipient}. Revisa también la carpeta de spam.` });
      } catch (err) {
        setNotice({ kind: 'error', text: errorMessage(err, 'No se pudo enviar el correo de prueba.') });
      }
    });

  const handleDisconnect = () =>
    run('disconnect', async () => {
      try {
        apply(await mailSettingsService.disconnect());
        setNotice({ kind: 'ok', text: 'Cuenta desconectada.' });
      } catch (err) {
        setNotice({ kind: 'error', text: errorMessage(err, 'No se pudo desconectar la cuenta.') });
      }
    });

  const handleClear = () => {
    if (!window.confirm('¿Quitar este correo? Los correos volverán a salir con el correo del servidor (.env), si hay uno.')) return;
    run('clear', async () => {
      try {
        apply(await mailSettingsService.clear());
        setNotice({ kind: 'ok', text: 'Se quitó el correo configurado.' });
      } catch (err) {
        setNotice({ kind: 'error', text: errorMessage(err, 'No se pudo quitar el correo.') });
      }
    });
  };

  const current = (() => {
    if (status.mode === 'oauth') {
      return { tone: 'ok', text: <>Conectado con <strong>{PROVIDER_LABELS[status.oauthProvider!]}</strong>: los correos salen desde <strong>{status.oauthAccountEmail}</strong>.</> };
    }
    if (status.mode === 'smtp') {
      return { tone: 'ok', text: <>Los correos salen desde <strong>{status.fromAddress}</strong> por <strong>{status.host}</strong>.</> };
    }
    if (status.envAvailable) {
      return { tone: 'info', text: <>No hay un correo configurado aquí: se usa el correo del servidor (archivo <code>.env</code>).</> };
    }
    return { tone: 'warn', text: <>Sin correo de envío: los correos del sistema (como recuperar la contraseña) no se están enviando.</> };
  })();

  return (
    <Section>
      <div className={`mail-status mail-status--${current.tone}`}>
        {current.tone === 'warn' ? <AlertTriangle size={16} /> : current.tone === 'ok' ? <CheckCircle2 size={16} /> : <Info size={16} />}
        <span>{current.text}</span>
      </div>

      <div className="mail-actions">
        <button type="button" className="mail-btn mail-btn--secondary" onClick={handleTest} disabled={!!busy || (!status.mode && !status.envAvailable)}>
          {busy === 'test' ? <Loader2 size={14} className="mail-spin" /> : <Send size={14} />}
          Enviar correo de prueba
        </button>
        {status.mode === 'oauth' && (
          <button type="button" className="mail-btn mail-btn--ghost" onClick={handleDisconnect} disabled={!!busy}>
            <Unplug size={14} />Desconectar cuenta
          </button>
        )}
        {status.mode === 'smtp' && (
          <button type="button" className="mail-btn mail-btn--ghost" onClick={handleClear} disabled={!!busy}>
            <Unplug size={14} />Quitar este correo
          </button>
        )}
      </div>

      {notice && (
        <div className={`mail-notice mail-notice--${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
          {notice.kind === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          {notice.text}
        </div>
      )}

      <div className="settings-group">
        <label className="settings-label">Conectar con un clic</label>
        <p className="settings-hint">
          Autoriza la cuenta en Google, Microsoft o Zoho. No se guarda ninguna contraseña.
        </p>
        {status.oauthAvailable.length > 0 ? (
          <div className="mail-providers">
            {status.oauthAvailable.map((p) => (
              <button key={p} type="button" className="mail-btn mail-btn--provider" onClick={() => handleConnect(p)} disabled={!!busy}>
                {busy === p ? <Loader2 size={14} className="mail-spin" /> : <Mail size={14} />}
                {status.mode === 'oauth' && status.oauthProvider === p ? `Reconectar ${PROVIDER_LABELS[p]}` : `Conectar con ${PROVIDER_LABELS[p]}`}
              </button>
            ))}
          </div>
        ) : (
          <p className="mail-muted">
            No está habilitado en este servidor. Para activarlo hay que agregar las credenciales OAuth de cada proveedor en el
            archivo <code>.env</code>.
          </p>
        )}
      </div>

      <form className="settings-group" onSubmit={handleSave}>
        <label className="settings-label">O configura el correo por SMTP</label>
        <p className="settings-hint">
          Sirve con cualquier proveedor, por ejemplo Hostinger. {status.mode === 'oauth' && 'Guardarlo desconecta la cuenta de arriba.'}
        </p>

        <div className="mail-grid">
          <div className="mail-field">
            <label htmlFor="mail-preset">Proveedor</label>
            <select id="mail-preset" value={preset} onChange={(e) => choosePreset(e.target.value)}>
              {presets.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              <option value={OTHER}>Otro (SMTP)</option>
            </select>
          </div>
        </div>

        {preset === OTHER && (
          <div className="mail-grid mail-grid--server">
            <div className="mail-field">
              <label htmlFor="mail-host">Servidor SMTP</label>
              <input id="mail-host" value={draft.host} onChange={(e) => setField('host', e.target.value)} placeholder="smtp.tudominio.com" autoComplete="off" required />
            </div>
            <div className="mail-field">
              <label htmlFor="mail-port">Puerto</label>
              <select id="mail-port" value={draft.port} onChange={(e) => setField('port', Number(e.target.value))}>
                {(status.allowInsecure ? DEV_PORTS : PORTS).map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="mail-field">
              <label htmlFor="mail-security">Seguridad</label>
              <select id="mail-security" value={draft.security} onChange={(e) => setField('security', e.target.value as SmtpSecurity)}>
                <option value="ssl">SSL/TLS</option>
                <option value="starttls">STARTTLS</option>
                {status.allowInsecure && <option value="none">Sin cifrado (desarrollo)</option>}
              </select>
            </div>
          </div>
        )}

        <div className="mail-grid">
          <div className="mail-field">
            <label htmlFor="mail-from">Correo remitente</label>
            <input id="mail-from" type="email" value={draft.fromAddress} onChange={(e) => setField('fromAddress', e.target.value)} placeholder="no-reply@dermicapro.com" autoComplete="off" required />
          </div>
          <div className="mail-field">
            <label htmlFor="mail-name">Nombre que ve quien lo recibe</label>
            <input id="mail-name" value={draft.fromName} onChange={(e) => setField('fromName', e.target.value)} placeholder="DermicaPro" maxLength={100} autoComplete="off" />
          </div>
          <div className="mail-field">
            <label htmlFor="mail-user">Usuario (si no es el mismo correo)</label>
            <input id="mail-user" value={draft.username} onChange={(e) => setField('username', e.target.value)} placeholder={draft.fromAddress || 'usuario'} autoComplete="off" />
          </div>
          <div className="mail-field">
            <label htmlFor="mail-password">Contraseña del correo</label>
            <input
              id="mail-password"
              type="password"
              value={draft.password}
              onChange={(e) => setField('password', e.target.value)}
              placeholder={status.mode === 'smtp' && status.passwordConfigured ? '•••• sin cambios' : 'Contraseña del buzón'}
              autoComplete="new-password"
            />
          </div>
        </div>
        <p className="mail-muted mail-muted--icon">
          <Info size={13} />
          <span>La contraseña se guarda cifrada y nunca se vuelve a mostrar. En Gmail y Outlook con verificación en dos pasos, usa una contraseña de aplicación.</span>
        </p>

        <button type="submit" className="mail-btn mail-btn--primary" disabled={!!busy}>
          {busy === 'save' && <Loader2 size={14} className="mail-spin" />}
          Guardar correo
        </button>
      </form>
    </Section>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <section className="settings-section" id="correo">
      <div className="settings-section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mail size={18} strokeWidth={1.75} color="var(--color-primary-text)" />
          <h2 className="settings-section-title" style={{ margin: 0 }}>Correo de envío</h2>
        </div>
        <p className="settings-section-description">
          Desde qué cuenta salen los correos del sistema, como el enlace para recuperar la contraseña. Solo visible para administradores.
        </p>
      </div>
      {children}
    </section>
  );
}

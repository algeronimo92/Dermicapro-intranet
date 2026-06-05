import React, { useState } from 'react';
import '../styles/appointments-page.css';
import '../styles/patient-detail.css';
import '../styles/state-transitions.css';
import '../styles/appointment-detail.css';
import '../styles/patient-payment-orders.css';
import '../styles/patient-history.css';
import '../styles/analytics.css';
import { DatePicker } from '../components/DatePicker';
import { ServiceSelector } from '../components/ServiceSelector';
import {
  LayoutDashboard, Users, CalendarDays, Syringe, UserCog,
  BadgeDollarSign, BarChart3, Palette, CircleUser, Settings, LogOut,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS: sub-components reutilizables sólo en esta guía
───────────────────────────────────────────────────────────────────────────── */

const SectionDivider: React.FC<{ n: string; title: string }> = ({ n, title }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 14,
    marginBottom: 32, marginTop: 56,
  }}>
    <div style={{
      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
      background: 'var(--color-primary)', color: 'var(--color-on-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 700,
    }}>{n}</div>
    <div style={{ flex: 1, height: 1, background: 'var(--color-border-primary)' }} />
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
      color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap',
    }}>{title}</div>
    <div style={{ flex: 1, height: 1, background: 'var(--color-border-primary)' }} />
  </div>
);

const Swatch: React.FC<{
  name: string;
  variable: string;
  hex: string;
  onDark?: boolean;
  contrast?: string;
}> = ({ name, variable, hex, onDark = false, contrast }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 120, maxWidth: 150 }}>
    <div style={{
      height: 80, borderRadius: 10, background: `var(${variable})`,
      boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border-secondary)',
      display: 'flex', alignItems: 'flex-end', padding: '6px 8px',
    }}>
      {contrast && (
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
          background: onDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.75)',
          color: onDark ? '#fff' : '#000',
        }}>{contrast}</span>
      )}
    </div>
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 2 }}>{name}</div>
      <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family-mono)', marginBottom: 1 }}>{hex}</div>
      <div style={{ fontSize: 10, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)', opacity: 0.8 }}>{variable}</div>
    </div>
  </div>
);

const Spinner: React.FC<{ size?: number; color?: string }> = ({ size = 24, color = 'var(--color-primary)' }) => (
  <div style={{
    width: size, height: size,
    border: `${Math.max(2, Math.round(size / 8))}px solid var(--color-border-primary)`,
    borderTopColor: color, borderRadius: '50%',
    animation: 'sg-spin 0.8s linear infinite', flexShrink: 0,
  }} />
);

const Badge: React.FC<{ label: string; color: string; bg: string; dot?: boolean }> = ({ label, color, bg, dot }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
    color, background: bg,
  }}>
    {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />}
    {label}
  </span>
);

const ProgressBar: React.FC<{
  value: number; color?: string; bg?: string; label?: string; height?: number;
}> = ({ value, color = 'var(--color-primary)', bg = 'var(--color-bg-tertiary)', label, height = 8 }) => (
  <div>
    {label && (
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>{value}%</span>
      </div>
    )}
    <div style={{ height, background: bg, borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 999 }} />
    </div>
  </div>
);

const SkeletonBlock: React.FC<{ w?: string | number; h?: number; radius?: number }> = ({
  w = '100%', h = 12, radius = 6,
}) => (
  <div
    className="sg-skeleton"
    style={{ width: w, height: h, borderRadius: radius, background: 'var(--color-bg-tertiary)' }}
  />
);

const PropRow: React.FC<{ name: string; type: string; color?: string }> = ({ name, type, color = 'var(--color-primary)' }) => (
  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
    <code style={{ fontSize: 11, color, fontFamily: 'var(--font-family-mono)', flexShrink: 0 }}>{name}</code>
    <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{type}</span>
  </div>
);

const DatePickerDemo: React.FC<{ label: string; initialValue?: string; error?: string }> = ({
  label, initialValue = '', error,
}) => {
  const [value, setValue] = React.useState(initialValue);
  return <DatePicker label={label} value={value} onChange={setValue} error={error} maxDate={new Date()} />;
};

const InputDemo: React.FC<{
  label: string; placeholder?: string; value?: string;
  state?: 'normal' | 'focused' | 'error' | 'disabled' | 'success';
  hint?: string; prefix?: string;
}> = ({ label, placeholder = 'Escribe aquí...', value, state = 'normal', hint, prefix }) => {
  const borderMap: Record<string, string> = {
    normal: 'var(--color-border-primary)',
    focused: 'var(--color-primary)',
    error: 'var(--color-error)',
    disabled: 'var(--color-border-secondary)',
    success: 'var(--color-success)',
  };
  const shadowMap: Record<string, string> = {
    normal: 'none',
    focused: '0 0 0 3px var(--color-primary-alpha-10)',
    error: '0 0 0 3px var(--color-error-alpha-10)',
    disabled: 'none',
    success: '0 0 0 3px var(--color-success-alpha-10)',
  };
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
        {prefix && (
          <div style={{
            position: 'absolute', left: 10, fontSize: 14,
            color: 'var(--color-text-tertiary)', userSelect: 'none',
          }}>{prefix}</div>
        )}
        <input
          readOnly
          disabled={state === 'disabled'}
          defaultValue={value}
          placeholder={placeholder}
          style={{
            width: '100%', padding: `9px ${prefix ? '12px 9px 28px' : '12px'}`,
            borderRadius: 6, fontSize: 14,
            border: `1.5px solid ${borderMap[state]}`,
            background: state === 'disabled' ? 'var(--color-bg-tertiary)' : 'var(--color-bg-primary)',
            color: state === 'disabled' ? 'var(--color-text-disabled)' : 'var(--color-text-primary)',
            outline: 'none', boxShadow: shadowMap[state],
            cursor: state === 'disabled' ? 'not-allowed' : 'text',
            boxSizing: 'border-box',
          }}
        />
      </div>
      {hint && (
        <div style={{
          fontSize: 12, marginTop: 4,
          color: state === 'error' ? 'var(--color-error)' : state === 'success' ? 'var(--color-success)' : 'var(--color-text-tertiary)',
        }}>{hint}</div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────────── */

export const StyleGuidePage: React.FC = () => {
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('light');
  const [checked1, setChecked1] = useState(false);
  const [checked2, setChecked2] = useState(true);
  const [selectVal, setSelectVal] = useState('');
  const [serviceSelectorVal, setServiceSelectorVal] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const isLight = previewTheme === 'light';

  return (
    <div data-theme={previewTheme} style={{
      minHeight: '100vh',
      background: 'var(--color-bg-secondary)',
      color: 'var(--color-text-primary)',
      fontFamily: 'var(--font-family-base)',
    }}>
      {/* ── GLOBAL STYLES ── */}
      <style>{`
        @keyframes sg-spin { to { transform: rotate(360deg); } }
        @keyframes sg-pulse { 0%,100% { opacity:1; } 50% { opacity:0.38; } }
        .sg-skeleton { animation: sg-pulse 1.6s ease-in-out infinite; }
        .sg-btn-hover:hover { transform: translateY(-1px); filter: brightness(1.06); }
        .sg-btn-hover:active { transform: translateY(0); }
        .sg-row-hover:hover { background: var(--color-bg-hover) !important; }
      `}</style>

      {/* ── STICKY HEADER ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--color-bg-primary)',
        borderBottom: '1px solid var(--color-border-secondary)',
        boxShadow: 'var(--shadow-sm)',
        padding: '12px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>D</span>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>DermicaPro</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', letterSpacing: '0.05em' }}>Design System v2.0</div>
          </div>
        </div>

        <button
          onClick={() => setPreviewTheme(t => t === 'light' ? 'dark' : 'light')}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px',
            borderRadius: 999, border: '1.5px solid var(--color-border-primary)',
            background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)',
            cursor: 'pointer', fontSize: 13, fontWeight: 600, boxShadow: 'var(--shadow-xs)',
          }}
        >
          <span style={{ fontSize: 16 }}>{isLight ? '🌙' : '☀️'}</span>
          {isLight ? 'Dark Mode' : 'Light Mode'}
          <div style={{
            width: 38, height: 20, borderRadius: 999, position: 'relative',
            background: !isLight ? 'var(--color-primary)' : 'var(--color-border-primary)',
            flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', top: 2, left: !isLight ? 19 : 2,
              width: 16, height: 16, borderRadius: '50%', background: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              transition: 'left 0.25s ease',
            }} />
          </div>
        </button>
      </div>

      {/* ── HERO ── */}
      <div style={{
        padding: '48px 40px 40px',
        background: `linear-gradient(135deg, var(--color-primary-container) 0%, var(--color-bg-primary) 60%)`,
        borderBottom: '1px solid var(--color-border-secondary)',
        maxWidth: 1100, margin: '0 auto',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--color-primary)', marginBottom: 10 }}>
          Material Design 3 — Teal + Rose-Mauve
        </div>
        <h1 style={{ fontSize: 38, fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 12px', lineHeight: 1.15 }}>
          Ficha de Estilos
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 16, margin: '0 0 24px', maxWidth: 580, lineHeight: 1.6 }}>
          Sistema de diseño centralizado para DermicaPro. Tokens, componentes y patrones reutilizables que garantizan consistencia visual en toda la aplicación.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'WCAG AA', color: 'var(--color-success-dark)', bg: 'var(--color-success-alpha-10)' },
            { label: 'M3 Tokens', color: 'var(--color-primary)', bg: 'var(--color-primary-alpha-10)' },
            { label: 'Dark/Light', color: 'var(--color-info-dark)', bg: 'var(--color-info-alpha-10)' },
            { label: 'CSS Variables', color: 'var(--color-accent)', bg: 'var(--color-accent-alpha-10)' },
          ].map(({ label, color, bg }) => (
            <span key={label} style={{
              padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, color, background: bg,
            }}>{label}</span>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px 80px' }}>

        {/* ══════════════════════════════════════════════
            SECCIÓN 1: PALETA DE COLORES
        ══════════════════════════════════════════════ */}
        <SectionDivider n="1" title="Paleta de Colores" />

        {/* Primary */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            Primario — Teal M3 (salud, confianza, profesionalismo)
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Swatch name="Primary" variable="--color-primary"
              hex={isLight ? '#0F766E' : '#2DD4BF'}
              contrast={isLight ? '6.2:1 AA' : '8.5:1 AA'} />
            <Swatch name="Primary Dark" variable="--color-primary-dark"
              hex={isLight ? '#115E59' : '#14B8A6'}
              contrast={isLight ? '7.8:1 AAA' : '6.9:1 AA'} />
            <Swatch name="Primary Light" variable="--color-primary-light"
              hex={isLight ? '#14B8A6' : '#5EEAD4'} />
            <Swatch name="Primary Container" variable="--color-primary-container"
              hex={isLight ? '#CCFBF1' : '#0D3D38'} />
          </div>
        </div>

        {/* Accent */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            Acento — Rose/Mauve (estética, piel, cuidado feminino-neutro)
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
            <Swatch name="Accent" variable="--color-accent"
              hex={isLight ? '#BE185D' : '#C084FC'}
              onDark={!isLight} contrast={isLight ? '7.1:1 AA' : '6.8:1 AA'} />
            <Swatch name="Accent Dark" variable="--color-accent-dark"
              hex={isLight ? '#9D174D' : '#A855F7'} />
            <Swatch name="Accent Light" variable="--color-accent-light"
              hex={isLight ? '#EC4899' : '#E879F9'} />
            <Swatch name="Accent Container" variable="--color-accent-container"
              hex={isLight ? '#FCE7F3' : '#2E1065'} />
          </div>
          {/* Uso del acento */}
          <div style={{
            padding: '16px 20px', borderRadius: 10,
            background: 'var(--color-bg-primary)', border: '1px solid var(--color-border-secondary)',
            display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginRight: 4 }}>Ejemplos de uso:</span>
            <button className="sg-btn-hover" style={{
              padding: '7px 16px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: 'var(--color-accent)', color: '#fff', boxShadow: '0 2px 6px var(--color-accent-alpha-20)',
            }}>Nuevo Paciente</button>
            <button className="sg-btn-hover" style={{
              padding: '7px 16px', borderRadius: 6, border: '1.5px solid var(--color-accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: 'transparent', color: 'var(--color-accent)',
            }}>Outlined</button>
            <button className="sg-btn-hover" style={{
              padding: '7px 16px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: 'var(--color-accent-alpha-10)', color: 'var(--color-accent)',
            }}>Tonal</button>
            <Badge label="Destacado" color="var(--color-accent)" bg="var(--color-accent-alpha-10)" />
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-accent-light), var(--color-accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 16, boxShadow: '0 4px 12px var(--color-accent-alpha-20)',
            }}>♥</div>
          </div>
        </div>

        {/* Semantic */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            Colores Semánticos (estados)
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Swatch name="Success" variable="--color-success"
              hex={isLight ? '#059669' : '#34D399'}
              contrast={isLight ? '4.7:1 AA' : '7.2:1 AAA'} />
            <Swatch name="Warning" variable="--color-warning"
              hex={isLight ? '#D97706' : '#FCD34D'}
              contrast={isLight ? '5.3:1 AA' : '9.1:1 AAA'} />
            <Swatch name="Error" variable="--color-error"
              hex={isLight ? '#DC2626' : '#F87171'}
              contrast={isLight ? '5.9:1 AA' : '6.4:1 AA'} />
            <Swatch name="Info" variable="--color-info"
              hex={isLight ? '#0284C7' : '#38BDF8'}
              contrast={isLight ? '5.7:1 AA' : '8.3:1 AAA'} />
          </div>
        </div>

        {/* Backgrounds */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            Fondos y Superficie
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Swatch name="BG Primary" variable="--color-bg-primary"
              hex={isLight ? '#FFFFFF' : '#0D1E1D'} />
            <Swatch name="BG Secondary" variable="--color-bg-secondary"
              hex={isLight ? '#F0FDFA' : '#071615'} />
            <Swatch name="BG Tertiary" variable="--color-bg-tertiary"
              hex={isLight ? '#CCFBF1' : '#152A28'} />
            <Swatch name="Border" variable="--color-border-primary"
              hex={isLight ? '#99F6E4' : '#214D49'} />
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            SECCIÓN 2: TIPOGRAFÍA
        ══════════════════════════════════════════════ */}
        <SectionDivider n="2" title="Tipografía" />

        <div style={{
          background: 'var(--color-bg-primary)', borderRadius: 12, border: '1px solid var(--color-border-secondary)',
          overflow: 'hidden', boxShadow: 'var(--shadow-xs)',
        }}>
          {[
            { label: 'Display / Hero', token: '--font-size-4xl', size: 36, weight: 800, sample: 'Clínica Dermatológica', lh: '1.15' },
            { label: 'H1 Heading', token: '--font-size-3xl', size: 30, weight: 700, sample: 'Gestión de Pacientes', lh: '1.2' },
            { label: 'H2 Section', token: '--font-size-2xl', size: 24, weight: 700, sample: 'Citas Programadas', lh: '1.25' },
            { label: 'H3 Subsection', token: '--font-size-xl', size: 20, weight: 600, sample: 'Historial Médico', lh: '1.3' },
            { label: 'Body / Label', token: '--font-size-base', size: 16, weight: 400, sample: 'María Torres García — DNI: 45678901', lh: '1.5' },
            { label: 'Small / Secondary', token: '--font-size-sm', size: 14, weight: 400, sample: 'Sesión 3 de 5 · Láser Pico 532nm · S/ 320.00', lh: '1.5' },
            { label: 'Caption / Meta', token: '--font-size-xs', size: 12, weight: 400, sample: 'Última actualización: 06 May 2026, 10:34 AM — Dr. Alejandro Ríos', lh: '1.6' },
          ].map(({ label, token, size, weight, sample, lh }, i) => (
            <div key={label} style={{
              display: 'grid', gridTemplateColumns: '180px 120px 1fr',
              alignItems: 'center', gap: 16, padding: '14px 20px',
              borderBottom: i < 6 ? '1px solid var(--color-border-secondary)' : 'none',
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{label}</div>
                <code style={{ fontSize: 10, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)', opacity: 0.8 }}>{token}</code>
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family-mono)' }}>
                {size}px / w{weight}<br />lh {lh}
              </div>
              <div style={{ fontSize: size, fontWeight: weight, lineHeight: lh, color: 'var(--color-text-primary)' }}>
                {sample}
              </div>
            </div>
          ))}
          {/* Monospace */}
          <div style={{
            padding: '14px 20px', background: 'var(--color-bg-tertiary)',
            borderTop: '1px solid var(--color-border-secondary)',
            display: 'grid', gridTemplateColumns: '180px 120px 1fr', gap: 16, alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Monospace / Code</div>
              <code style={{ fontSize: 10, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)', opacity: 0.8 }}>--font-family-mono</code>
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family-mono)' }}>14px / w400</div>
            <code style={{ fontSize: 14, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>
              patient_id: "a1b2c3d4" · payment_order_status: "partial"
            </code>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            SECCIÓN 3: ESPACIADO Y RADIO
        ══════════════════════════════════════════════ */}
        <SectionDivider n="3" title="Espaciado y Radio de Bordes" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
          {/* Spacing */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 16 }}>Escala de Espaciado</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { name: '--spacing-xs', val: '4px', px: 4 },
                { name: '--spacing-sm', val: '8px', px: 8 },
                { name: '--spacing-md', val: '16px', px: 16 },
                { name: '--spacing-lg', val: '24px', px: 24 },
                { name: '--spacing-xl', val: '32px', px: 32 },
                { name: '--spacing-2xl', val: '48px', px: 48 },
                { name: '--spacing-3xl', val: '64px', px: 64 },
              ].map(({ name, val, px }) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)', minWidth: 130 }}>{name}</code>
                  <div style={{
                    height: 10, width: px, background: 'var(--color-primary)', borderRadius: 2, opacity: 0.7, flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Border radius */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 16 }}>Radio de Bordes</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { name: '--radius-sm', val: '4px', r: 4 },
                { name: '--radius-md', val: '6px', r: 6 },
                { name: '--radius-lg', val: '8px', r: 8 },
                { name: '--radius-xl', val: '12px', r: 12 },
                { name: '--radius-2xl', val: '16px', r: 16 },
                { name: '--radius-full', val: '9999px', r: 9999 },
              ].map(({ name, val, r }) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)', minWidth: 130 }}>{name}</code>
                  <div style={{
                    width: 36, height: 24,
                    background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-primary))',
                    borderRadius: r, opacity: 0.75, flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Altura de controles */}
        <div style={{ marginTop: 32, marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 16 }}>Altura de Controles (inputs, selects, botones)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { name: '--control-height-sm', val: '32px', h: 32, label: 'sm — botones pequeños, badges acción' },
              { name: '--control-height',    val: '40px', h: 40, label: 'base — inputs, selects, botones de formulario' },
              { name: '--control-height-lg', val: '48px', h: 48, label: 'lg — búsquedas prominentes, CTA' },
            ].map(({ name, val, h, label }) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)', minWidth: 170 }}>{name}</code>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ height: h, width: 100, background: 'var(--color-primary-alpha-10)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-lg)' }} />
                  <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{val} — {label}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 12, fontFamily: 'monospace' }}>
            Todos los controles inline deben usar la misma altura. Garantiza alineación vertical en filtros y toolbars.
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            SECCIÓN 4: SOMBRAS
        ══════════════════════════════════════════════ */}
        <SectionDivider n="4" title="Sombras" />

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {[
            { name: 'xs', h: 48 },
            { name: 'sm', h: 56 },
            { name: 'md', h: 64 },
            { name: 'lg', h: 72 },
            { name: 'xl', h: 80 },
            { name: '2xl', h: 88 },
          ].map(({ name, h }) => (
            <div key={name} style={{ textAlign: 'center' }}>
              <div style={{
                width: 88, height: h, borderRadius: 10,
                background: 'var(--color-bg-primary)',
                boxShadow: `var(--shadow-${name})`,
                border: '1px solid var(--color-border-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{name}</span>
              </div>
              <code style={{ display: 'block', marginTop: 8, fontSize: 10, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>
                --shadow-{name}
              </code>
            </div>
          ))}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 88, height: 56, borderRadius: 10,
              background: 'var(--color-bg-primary)',
              boxShadow: 'var(--shadow-inner)',
              border: '1px solid var(--color-border-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>inner</span>
            </div>
            <code style={{ display: 'block', marginTop: 8, fontSize: 10, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>
              --shadow-inner
            </code>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            SECCIÓN 5: BOTONES
        ══════════════════════════════════════════════ */}
        <SectionDivider n="5" title="Botones" />

        {/* Variantes */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Variantes principales</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            {[
              { label: 'Primary', bg: 'var(--color-primary)', color: '#fff', shadow: '0 2px 8px var(--color-primary-alpha-20)' },
              { label: 'Secondary', bg: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1.5px solid var(--color-border-primary)', shadow: 'none' },
              { label: 'Success', bg: 'var(--color-success)', color: '#fff', shadow: '0 2px 8px var(--color-success-alpha-10)' },
              { label: 'Danger', bg: 'var(--color-error)', color: '#fff', shadow: '0 2px 8px var(--color-error-alpha-10)' },
              { label: 'Warning', bg: 'var(--color-warning)', color: '#fff', shadow: 'none' },
              { label: 'Accent', bg: 'var(--color-accent)', color: '#fff', shadow: '0 2px 8px var(--color-accent-alpha-20)' },
              { label: 'Outlined', bg: 'transparent', color: 'var(--color-primary)', border: '1.5px solid var(--color-primary)', shadow: 'none' },
              { label: 'Ghost', bg: 'var(--color-primary-alpha-10)', color: 'var(--color-primary)', shadow: 'none' },
            ].map(({ label, bg, color, border, shadow }) => (
              <button key={label} className="sg-btn-hover" style={{
                padding: '8px 18px', borderRadius: 6, fontSize: 14, fontWeight: 600,
                border: border ?? 'none', background: bg, color, boxShadow: shadow,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Tamaños */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tamaños</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {[
              { label: 'Small', p: '5px 12px', fs: 12 },
              { label: 'Medium', p: '8px 18px', fs: 14 },
              { label: 'Large', p: '12px 28px', fs: 16 },
            ].map(({ label, p, fs }) => (
              <button key={label} className="sg-btn-hover" style={{
                padding: p, borderRadius: 6, fontSize: fs, fontWeight: 600,
                border: 'none', background: 'var(--color-primary)', color: '#fff',
                boxShadow: '0 2px 6px var(--color-primary-alpha-20)', cursor: 'pointer',
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Estados */}
        <div>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Estados</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="sg-btn-hover" style={{
              padding: '8px 18px', borderRadius: 6, fontSize: 14, fontWeight: 600,
              border: 'none', background: 'var(--color-primary)', color: '#fff', cursor: 'pointer',
              boxShadow: '0 2px 6px var(--color-primary-alpha-20)',
            }}>Normal</button>
            <button style={{
              padding: '8px 18px', borderRadius: 6, fontSize: 14, fontWeight: 600,
              border: 'none', background: 'var(--color-primary)', color: '#fff', cursor: 'not-allowed',
              opacity: 0.45,
            }} disabled>Disabled</button>
            <button style={{
              padding: '8px 18px', borderRadius: 6, fontSize: 14, fontWeight: 600,
              border: 'none', background: 'var(--color-primary)', color: '#fff', cursor: 'wait',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              boxShadow: '0 2px 6px var(--color-primary-alpha-20)',
            }}>
              <Spinner size={14} color="#fff" /> Guardando...
            </button>
            <button style={{
              padding: '8px 18px', borderRadius: 6, fontSize: 14, fontWeight: 600,
              border: 'none', background: 'var(--color-success)', color: '#fff', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}>
              <span>✓</span> Guardado
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            SECCIÓN 6: CAMPOS DE FORMULARIO
        ══════════════════════════════════════════════ */}
        <SectionDivider n="6" title="Campos de Formulario" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, maxWidth: 800 }}>
          <InputDemo label="Normal" placeholder="Nombres del paciente" />
          <InputDemo label="Focused" placeholder="Apellidos" state="focused" hint="Campo requerido" />
          <InputDemo label="Error" value="dni-invalido-123" state="error" hint="Ingresa un DNI válido (8 dígitos)" />
          <InputDemo label="Success" value="45678901" state="success" hint="DNI válido ✓" />
          <InputDemo label="Disabled" value="Ana María Torres" state="disabled" hint="No editable en este estado" />
          <InputDemo label="Con prefijo" placeholder="0.00" prefix="S/" state="normal" />

          {/* Select */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
              Select
            </label>
            <select
              value={selectVal}
              onChange={e => setSelectVal(e.target.value)}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 6, fontSize: 14,
                border: '1.5px solid var(--color-border-primary)',
                background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)',
                outline: 'none', cursor: 'pointer', boxSizing: 'border-box',
              }}
            >
              <option value="">Seleccionar servicio...</option>
              <option value="hifu">HIFU 12D Ultraformer</option>
              <option value="laser">Pico Láser 532nm</option>
              <option value="peel">Hollywood Peel Carbon</option>
              <option value="facial">Facial Derma Plus</option>
            </select>
          </div>

          {/* Select error */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
              Select con error
            </label>
            <select
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 6, fontSize: 14,
                border: '1.5px solid var(--color-error)',
                background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)',
                outline: 'none', boxShadow: '0 0 0 3px var(--color-error-alpha-10)', boxSizing: 'border-box',
              }}
            >
              <option value="">Seleccionar...</option>
            </select>
            <div style={{ fontSize: 12, color: 'var(--color-error)', marginTop: 4 }}>Selecciona un servicio</div>
          </div>

          {/* ServiceSelector */}
          <div style={{ gridColumn: '1 / -1' }}>
            <ServiceSelector
              label="ServiceSelector — Servicio/Tratamiento"
              value={serviceSelectorVal}
              onChange={setServiceSelectorVal}
              services={[
                { id: '1', name: 'HIFU 12D Ultraformer III', basePrice: 1200, defaultSessions: 1, isActive: true },
                { id: '2', name: 'Borrado de Tatuajes M (x4)', basePrice: 1500, defaultSessions: 4, isActive: true },
                { id: '3', name: 'Pico Láser 532nm', basePrice: 450, defaultSessions: 1, isActive: true },
                { id: '4', name: 'Hollywood Peel Carbon', basePrice: 280, defaultSessions: 1, isActive: true },
                { id: '5', name: 'Depilación Láser Axilas (x6)', basePrice: 750, defaultSessions: 6, isActive: true },
                { id: '6', name: 'ADN de Salmón - Rostro (x3)', basePrice: 650, defaultSessions: 3, isActive: true },
                { id: '7', name: 'Botox - 2 Zonas', basePrice: 600, defaultSessions: 1, isActive: true },
              ]}
            />
          </div>

          {/* Textarea */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
              Textarea — Observaciones clínicas
            </label>
            <textarea
              readOnly
              defaultValue="Paciente presenta piel tipo III-IV (Fitzpatrick). Se recomienda iniciar con potencia reducida en primera sesión. Alergia conocida a la lidocaína — usar anestesia alternativa."
              rows={3}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 6, fontSize: 14,
                border: '1.5px solid var(--color-border-primary)',
                background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)',
                outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                fontFamily: 'var(--font-family-base)', lineHeight: 1.5,
              }}
            />
          </div>

          {/* Checkboxes */}
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { id: 'chk1', label: 'Mostrar eliminados', checked: checked1, set: setChecked1 },
              { id: 'chk2', label: 'Enviar recordatorio SMS', checked: checked2, set: setChecked2 },
              { id: 'chk3', label: 'Requiere ayuno previo (deshabilitado)', checked: false, set: () => {}, disabled: true },
            ].map(({ id, label, checked, set, disabled }) => (
              <label key={id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.45 : 1,
              }}>
                <input
                  type="checkbox"
                  id={id}
                  checked={checked}
                  onChange={e => (set as (v: boolean) => void)(e.target.checked)}
                  disabled={disabled}
                  style={{ width: 16, height: 16, accentColor: 'var(--color-primary)', cursor: disabled ? 'not-allowed' : 'pointer' }}
                />
                <span style={{ fontSize: 14, color: 'var(--color-text-primary)' }}>{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* DatePicker */}
        <div style={{ marginTop: 28, marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
            DatePicker — Selector de fecha con navegación de mes/año
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, maxWidth: 800 }}>
            <DatePickerDemo label="Fecha normal" />
            <DatePickerDemo label="Con fecha seleccionada" initialValue="1992-06-01" />
            <DatePickerDemo label="Con error" error="La fecha es requerida" />
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 12, fontFamily: 'monospace' }}>
            {'<DatePicker value={iso} onChange={(v) => setDate(v)} label="..." error="..." maxDate={new Date()} />'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
            Usa react-day-picker v10 · Locale español · Navegación dropdown año/mes · Temas vía CSS variables
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            SECCIÓN 7: BADGES Y CHIPS
        ══════════════════════════════════════════════ */}
        <SectionDivider n="7" title="Badges y Chips" />

        {/* Estado de citas */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
            Estados de citas (AppointmentStatus)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {[
              { label: 'Reservado', color: 'var(--color-status-scheduled)', bg: 'var(--color-status-scheduled-bg)' },
              { label: 'En Progreso', color: 'var(--color-status-in-progress)', bg: 'var(--color-status-in-progress-bg)' },
              { label: 'Atendido', color: 'var(--color-status-completed)', bg: 'var(--color-status-completed-bg)' },
              { label: 'Cancelado', color: 'var(--color-status-cancelled)', bg: 'var(--color-status-cancelled-bg)' },
              { label: 'No se presentó', color: 'var(--color-status-no-show)', bg: 'var(--color-status-no-show-bg)' },
            ].map(({ label, color, bg }) => (
              <Badge key={label} label={label} color={color} bg={bg} dot />
            ))}
          </div>
        </div>

        {/* Estado de órdenes de pago */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
            Estados de órdenes de pago (PaymentOrderStatus) y pagos
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {[
              { label: 'Pendiente', color: 'var(--color-warning-dark)', bg: 'var(--color-warning-alpha-10)' },
              { label: 'Parcial', color: 'var(--color-info-dark)', bg: 'var(--color-info-alpha-10)' },
              { label: 'Pagado', color: 'var(--color-success-dark)', bg: 'var(--color-success-alpha-10)' },
              { label: 'Cancelado', color: 'var(--color-error-dark)', bg: 'var(--color-error-alpha-10)' },
              { label: 'Activo', color: 'var(--color-success-dark)', bg: 'var(--color-success-alpha-10)' },
              { label: 'Inactivo', color: 'var(--color-text-tertiary)', bg: 'var(--color-bg-tertiary)' },
              { label: 'Admin', color: 'var(--color-accent)', bg: 'var(--color-accent-alpha-10)' },
              { label: 'Enfermera', color: 'var(--color-info-dark)', bg: 'var(--color-info-alpha-10)' },
              { label: 'Ventas', color: 'var(--color-warning-dark)', bg: 'var(--color-warning-alpha-10)' },
            ].map(({ label, color, bg }) => (
              <Badge key={label} label={label} color={color} bg={bg} />
            ))}
          </div>
        </div>

        {/* Chips con icono */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
            Chips de filtro
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['HIFU 12D', 'Pico Láser', 'Hollywood Peel', 'Facial Derma', 'Bioestimulación'].map((label, i) => (
              <span key={label} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 999, fontSize: 13, fontWeight: 500,
                border: '1.5px solid',
                borderColor: i === 0 ? 'var(--color-primary)' : 'var(--color-border-primary)',
                background: i === 0 ? 'var(--color-primary-alpha-10)' : 'var(--color-bg-primary)',
                color: i === 0 ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}>
                {i === 0 && <span style={{ fontSize: 10 }}>✓</span>}
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            SECCIÓN 8: ALERTAS
        ══════════════════════════════════════════════ */}
        <SectionDivider n="8" title="Alertas y Banners" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 620 }}>
          {[
            {
              type: 'success', icon: '✓',
              title: 'Cita registrada correctamente',
              msg: 'La cita para Ana Torres García fue programada para el 08 May 2026 a las 10:00 AM.',
              color: 'var(--color-success-dark)', bg: 'var(--color-success-alpha-10)', border: 'var(--color-success)',
              iconBg: 'var(--color-success)',
            },
            {
              type: 'error', icon: '!',
              title: 'Error al guardar la orden de pago',
              msg: 'El monto total no puede ser menor al pago registrado. Revisa los datos e intenta nuevamente.',
              color: 'var(--color-error-dark)', bg: 'var(--color-error-alpha-10)', border: 'var(--color-error)',
              iconBg: 'var(--color-error)',
            },
            {
              type: 'warning', icon: '⚠',
              title: 'Pagos pendientes',
              msg: 'Este paciente tiene S/ 850.00 en órdenes de pago pendientes. Se recomienda verificar antes de agendar.',
              color: 'var(--color-warning-dark)', bg: 'var(--color-warning-alpha-10)', border: 'var(--color-warning)',
              iconBg: 'var(--color-warning)',
            },
            {
              type: 'info', icon: 'i',
              title: 'Sesión actualizada',
              msg: 'La sesión 3 de HIFU 12D fue modificada por Dr. Ramos. Los cambios se reflejarán inmediatamente.',
              color: 'var(--color-info-dark)', bg: 'var(--color-info-alpha-10)', border: 'var(--color-info)',
              iconBg: 'var(--color-info)',
            },
          ].map(({ type, icon, title, msg, color, bg, border, iconBg }) => (
            <div key={type} style={{
              padding: '14px 16px', borderRadius: 10, background: bg,
              borderLeft: `4px solid ${border}`, display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', background: iconBg,
                color: '#fff', fontSize: 12, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
              }}>{icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color, marginBottom: 3 }}>{title}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{msg}</div>
              </div>
              <button style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-tertiary)', fontSize: 18, lineHeight: 1, padding: '0 2px', flexShrink: 0,
              }}>×</button>
            </div>
          ))}
        </div>

        {/* ══════════════════════════════════════════════
            SECCIÓN 9: CARDS
        ══════════════════════════════════════════════ */}
        {/* ══════════════════════════════════════════════
            SECCIÓN 9: MODAL
        ══════════════════════════════════════════════ */}
        <SectionDivider n="9" title="Modal" />

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>Modal — Estructura (Crear Paciente, confirmaciones, etc.)</div>
          <div style={{
            position: 'relative', background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-secondary)', borderRadius: 'var(--radius-xl)',
            padding: 'var(--spacing-md)', maxWidth: 540,
          }}>
            <div className="modal-content" style={{ position: 'relative', maxHeight: 'none' }}>
              <div className="modal-header">
                <h2>Crear Nuevo Paciente</h2>
                <button className="modal-close" type="button">×</button>
              </div>
              <div className="modal-body" style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                <div>
                  <div className="field-label">Nombre *</div>
                  <div style={{ padding: 'var(--spacing-sm) var(--spacing-md)', border: '2px solid var(--color-border-primary)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)', background: 'var(--color-bg-primary)' }}>Ingrese el nombre</div>
                </div>
                <div>
                  <div className="field-label">DNI *</div>
                  <div style={{ padding: 'var(--spacing-sm) var(--spacing-md)', border: '2px solid var(--color-primary)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)', background: 'var(--color-bg-primary)', boxShadow: '0 0 0 4px var(--color-primary-alpha-10)' }}>12345678</div>
                </div>
                <div className="modal-actions">
                  <button className="action-btn secondary" type="button">Cancelar</button>
                  <button className="action-btn primary" type="button">Crear Paciente</button>
                </div>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
            .modal-overlay (z: --z-modal) · .modal-content · .modal-header · .modal-body · .modal-close · .modal-actions
          </div>
        </div>

        {/* Modal de confirmación — preview estático */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>Modal de confirmación (datos de resumen + alert info)</div>
          <div style={{
            position: 'relative', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-xl)',
            padding: 'var(--spacing-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid var(--color-border-secondary)', minHeight: 300,
          }}>
            <div style={{
              width: '100%', maxWidth: 480,
              background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-2xl)',
              boxShadow: 'var(--shadow-2xl)', border: '1px solid var(--color-border-secondary)',
              overflow: 'hidden',
            }}>
              <div className="modal-header">
                <div>
                  <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>Confirmar Cita</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>Revisa los datos antes de guardar</div>
                </div>
                <button className="modal-close" type="button">×</button>
              </div>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                  {[
                    { label: 'Paciente', value: 'Ana Torres García' },
                    { label: 'DNI', value: '45678901' },
                    { label: 'Servicio', value: 'Hollywood Peel Carbon' },
                    { label: 'Sesión', value: '2 de 5' },
                    { label: 'Fecha y hora', value: '08 May 2026, 10:00 AM' },
                    { label: 'Monto', value: 'S/ 180.00' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div className="field-label">{label}</div>
                      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontWeight: 'var(--font-weight-medium)' }}>{value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: 'var(--spacing-sm) var(--spacing-md)', borderRadius: 'var(--radius-lg)', background: 'var(--color-info-alpha-10)', borderLeft: '3px solid var(--color-info)' }}>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-info-dark)' }}>Se enviará un recordatorio SMS a la paciente 24h antes.</div>
                </div>
              </div>
              <div style={{ padding: 'var(--spacing-md) var(--spacing-lg)', borderTop: '1px solid var(--color-border-secondary)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-sm)', background: 'var(--color-bg-secondary)' }}>
                <button className="action-btn secondary" type="button">Cancelar</button>
                <button className="action-btn primary" type="button">Confirmar Cita</button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal interactivo — trigger real */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>Modal interactivo — prueba el overlay y z-index</div>
          <button
            className="btn btn-primary"
            onClick={() => setModalOpen(true)}
          >
            Abrir Modal de Ejemplo
          </button>
          {modalOpen && (
            <div
              onClick={() => setModalOpen(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 'var(--z-modal-backdrop)' as any,
                background: 'var(--color-bg-overlay)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 'var(--spacing-md)',
              }}
            >
              <div
                onClick={e => e.stopPropagation()}
                className="modal-content"
                style={{ maxWidth: 480 }}
              >
                <div className="modal-header">
                  <h2>Modal — Vista Real</h2>
                  <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
                </div>
                <div className="modal-body">
                  <p style={{ color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                    Este es el modal real con overlay. Haz clic fuera o en el botón para cerrar.
                    El z-index usa <code style={{ color: 'var(--color-primary)', fontSize: 13 }}>var(--z-modal-backdrop)</code> y <code style={{ color: 'var(--color-primary)', fontSize: 13 }}>var(--z-modal)</code>.
                  </p>
                </div>
                <div className="modal-actions">
                  <button className="action-btn primary" onClick={() => setModalOpen(false)}>Cerrar</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════
            SECCIÓN 10: CARDS
        ══════════════════════════════════════════════ */}
        <SectionDivider n="10" title="Cards" />

        {/* Stat Cards */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>Stat Cards (Dashboard) — variante con gradiente</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 16, maxWidth: 900 }}>
            {[
              { label: 'Ingresos del Mes', value: 'S/ 24,850', icon: '💰', bg: 'linear-gradient(135deg, var(--color-success) 0%, var(--color-success-dark) 100%)', token: '--color-success → --color-success-dark' },
              { label: 'Pagos Pendientes', value: 'S/ 5,400', icon: '⏳', bg: 'linear-gradient(135deg, var(--color-warning) 0%, var(--color-warning-dark) 100%)', token: '--color-warning → --color-warning-dark' },
              { label: 'Citas Hoy', value: '12', icon: '📅', bg: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)', token: '--color-primary → --color-primary-dark' },
              { label: 'Tasa de Pago', value: '87%', icon: '📊', bg: 'linear-gradient(135deg, var(--color-info) 0%, var(--color-info-dark) 100%)', token: '--color-info → --color-info-dark' },
            ].map(({ label, value, icon, bg, token }) => (
              <div key={label} style={{
                background: bg, borderRadius: 12, padding: '18px 20px',
                boxShadow: 'var(--shadow-sm)', color: 'var(--color-text-inverse)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.9, lineHeight: 1.3 }}>{label}</span>
                  <span style={{ fontSize: 22, background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '2px 6px' }}>{icon}</span>
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>{value}</div>
                <div style={{ fontSize: 10, opacity: 0.7, fontFamily: 'monospace' }}>{token}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Card tipos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, maxWidth: 900 }}>
          {/* Card básica */}
          <div style={{
            background: 'var(--color-bg-primary)', borderRadius: 12,
            border: '1px solid var(--color-border-secondary)', padding: 20,
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Card Básica</div>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '8px 0 0', lineHeight: 1.6 }}>
              Contenido simple sin header ni footer especiales. Ideal para resúmenes y notas clínicas.
            </p>
          </div>

          {/* Card con header */}
          <div style={{
            background: 'var(--color-bg-primary)', borderRadius: 12,
            border: '1px solid var(--color-border-secondary)',
            boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 20px', borderBottom: '1px solid var(--color-border-secondary)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'var(--color-bg-tertiary)',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>Historial de Sesiones</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>HIFU 12D · 3/5 completadas</div>
              </div>
              <Badge label="Activo" color="var(--color-success-dark)" bg="var(--color-success-alpha-10)" />
            </div>
            <div style={{ padding: 20 }}>
              <ProgressBar value={60} label="Progreso del tratamiento" height={10} />
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '12px 0 0', lineHeight: 1.5 }}>
                Próxima sesión: 15 May 2026
              </p>
            </div>
          </div>

          {/* Card con footer */}
          <div style={{
            background: 'var(--color-bg-primary)', borderRadius: 12,
            border: '1px solid var(--color-border-secondary)',
            boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ padding: '18px 20px', flex: 1 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-primary))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0,
                }}>M</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>María Guadalupe Ríos</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>DNI: 45678901 · Trujillo</div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Piel Fitzpatrick III. 4 sesiones completadas de HIFU 12D y 2 de Pico Láser.
              </div>
            </div>
            <div style={{
              padding: '12px 20px', borderTop: '1px solid var(--color-border-secondary)',
              background: 'var(--color-bg-secondary)', display: 'flex', gap: 8, justifyContent: 'flex-end',
            }}>
              <button style={{
                padding: '6px 14px', borderRadius: 6, border: '1.5px solid var(--color-border-primary)',
                background: 'transparent', color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}>Ver historial</button>
              <button style={{
                padding: '6px 14px', borderRadius: 6, border: 'none',
                background: 'var(--color-primary)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>Agendar cita</button>
            </div>
          </div>
        </div>

        {/* Appointment Card */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            Appointment Card — Vista lista de citas
          </div>
          <div className="appointments-grid" style={{ maxWidth: 1050 }}>
            {[
              { status: 'reserved',    label: 'Reservada',   patient: 'Ana Torres García',  initials: 'AT', photo: null,                    service: 'HIFU 12D Ultraformer',  date: 'mar, 10 jun.', time: '10:00 a.m.', duration: 60, payment: 'pending', amount: 500.00, createdBy: 'Admin' },
              { status: 'in_progress', label: 'En Atención', patient: 'Luis Pérez Morales', initials: 'LP', photo: 'data:image/svg+xml,%3Csvg xmlns%3D\'http%3A//www.w3.org/2000/svg\' width%3D\'48\' height%3D\'48\'%3E%3Crect width%3D\'48\' height%3D\'48\' fill%3D\'%236366f1\'/%3E%3Ccircle cx%3D\'24\' cy%3D\'17\' r%3D\'10\' fill%3D\'%23fff\' opacity%3D\'.8\'/%3E%3Cellipse cx%3D\'24\' cy%3D\'42\' rx%3D\'17\' ry%3D\'12\' fill%3D\'%23fff\' opacity%3D\'.8\'/%3E%3C/svg%3E', service: 'Pico Láser 532nm',       date: 'mar, 10 jun.', time: '11:30 a.m.', duration: 90, payment: 'paid',    amount: 320.00, createdBy: 'Ventas' },
              { status: 'attended',    label: 'Atendida',    patient: 'María G. Ríos',      initials: 'MG', photo: null,                    service: 'Hollywood Peel Carbon',  date: 'lun, 9 jun.',  time: '09:00 a.m.', duration: 60, payment: 'paid',    amount: 180.00, createdBy: 'Enfermera' },
              { status: 'cancelled',   label: 'Cancelada',   patient: 'Carlos Huamán',      initials: 'CH', photo: null,                    service: 'Bioestimulación',        date: 'vie, 6 jun.',  time: '03:00 p.m.', duration: 45, payment: 'none',    amount: 0,      createdBy: 'Admin' },
              { status: 'no_show',     label: 'No asistió',  patient: 'Rosa Llontop',       initials: 'RL', photo: null,                    service: 'Facial Derma Plus',      date: 'jue, 5 jun.',  time: '04:30 p.m.', duration: 60, payment: 'none',    amount: 0,      createdBy: 'Ventas' },
            ].map(card => (
              <div key={card.status} className="appointment-card" style={{ cursor: 'default' }}>
                {/* Header */}
                <div className="card-header-row">
                  <div className="patient-avatar">
                    {card.photo
                      ? <img src={card.photo} alt={card.patient} />
                      : card.initials}
                  </div>
                  <div className={`card-status-badge card-status-badge--${card.status}`}>
                    <span className="status-dot" />
                    <span className="status-text">{card.label}</span>
                  </div>
                </div>

                {/* Nombre */}
                <div className="card-main-info">
                  <h3 className="patient-name">{card.patient}</h3>
                  <div className="card-meta">
                    <div className="meta-item">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <rect x="2" y="3" width="12" height="11" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                        <line x1="2" y1="6" x2="14" y2="6" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                      <span>{card.date}</span>
                    </div>
                    <div className="meta-item">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M8 4v4l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      <span>{card.time}</span>
                    </div>
                    <div className="meta-item">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 2v12M12 6v6M4 8v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      <span>{card.duration} min</span>
                    </div>
                  </div>
                </div>

                {/* Servicios */}
                <div className="card-services">
                  <div className="services-label">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="1" y="3" width="12" height="9" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M4 6h6M4 9h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    Servicios:
                  </div>
                  <div className="services-tags">
                    <span className="service-tag">{card.service}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="card-footer">
                  <div className="payment-status-mini">
                    {card.payment === 'pending' && (
                      <div className="payment-pending-mini">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M7 3v4l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <span>Pendiente: S/. {card.amount.toFixed(2)}</span>
                      </div>
                    )}
                    {card.payment === 'paid' && (
                      <div className="payment-complete-mini">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M2 7l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <span>Pagado: S/. {card.amount.toFixed(2)}</span>
                      </div>
                    )}
                    {card.payment === 'none' && (
                      <div className="payment-none-mini">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2"/>
                        </svg>
                        <span>Sin reserva</span>
                      </div>
                    )}
                  </div>
                  <div className="created-by-mini">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="4" r="2" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M2 12c0-2 2-3 5-3s5 1 5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <span>{card.createdBy}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 10, fontFamily: 'monospace' }}>
            .appointment-card · .patient-avatar · .card-status-badge--{'{status}'} · .card-services · .card-footer
          </div>
        </div>

        {/* Results Info Bar */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>Barra de resultados (lista de citas, pacientes, etc.)</div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: 'var(--spacing-md) var(--spacing-lg)',
            background: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border-secondary)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)',
            maxWidth: 600,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-sm)' }}>
              <span style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-extrabold)', color: 'var(--color-primary)', letterSpacing: -1 }}>12</span>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-tertiary)' }}>citas encontradas</span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
            .results-info-modern · count: --color-primary · label: --color-text-tertiary · bg: --color-bg-primary
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            SECCIÓN 10: TABLA
        ══════════════════════════════════════════════ */}
        {/* Glass Card + Form Patterns */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>Glass Card — Sección de formulario (Nueva Cita, Editar Cita)</div>
          <div className="glass-card" style={{ maxWidth: 560 }}>
            <div className="card-header">
              <svg className="card-icon" width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              <h2>Información de la Cita</h2>
            </div>
            <div className="field-label">Paciente</div>
            <div style={{ padding: 'var(--spacing-sm) var(--spacing-md)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-md)' }}>Ana Torres García</div>
            <div className="field-label">Notas</div>
            <textarea className="notes-textarea" rows={2} placeholder="Observaciones o instrucciones previas..." readOnly />
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
            .glass-card · .card-header · .card-icon · .field-label · .notes-textarea
          </div>
        </div>

        {/* Upload Zone */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>Zona de subida de archivo (comprobante)</div>
          <div style={{ maxWidth: 400 }}>
            <button className="upload-receipt-button" type="button">
              <svg className="upload-icon" width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M16 6v14M16 6l-6 6M16 6l6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 24h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
              <span className="upload-label">Subir comprobante de pago</span>
              <span className="upload-hint">JPG, PNG o WebP · Máx 5MB</span>
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
            .upload-receipt-button · .upload-icon · .upload-label · .upload-hint
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>Botones de acción (formularios — Nueva Cita, Editar)</div>
          <div className="action-buttons" style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="action-btn primary" type="button">Guardar Cita</button>
            <button className="action-btn success" type="button">Confirmar</button>
            <button className="action-btn secondary" type="button">Cancelar</button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
            .action-btn.primary → --color-primary gradient · .action-btn.success → --color-success gradient · .action-btn.secondary → --color-bg-tertiary
          </div>
        </div>

        {/* Icon Buttons */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>Botones de ícono (.btn-icon)</div>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
            <button className="btn-icon btn-primary" type="button" title="Editar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
            <button className="btn-icon btn-success" type="button" title="Confirmar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button className="btn-icon btn-danger" type="button" title="Eliminar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
            .btn-icon.btn-primary · .btn-icon.btn-success · .btn-icon.btn-danger — todos usan --color-text-inverse
          </div>
        </div>

        <SectionDivider n="11" title="Tabla" />

        <div style={{
          background: 'var(--color-bg-primary)', borderRadius: 12,
          border: '1px solid var(--color-border-secondary)', overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>Citas del Día</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Martes 06 May 2026 · 5 registros</div>
            </div>
            <button style={{
              padding: '7px 16px', borderRadius: 6, border: 'none',
              background: 'var(--color-primary)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>+ Nueva Cita</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-tertiary)' }}>
                  {['Paciente', 'Servicio', 'Hora', 'Profesional', 'Estado', 'Monto', 'Acciones'].map(h => (
                    <th key={h} style={{
                      padding: '11px 16px', textAlign: 'left', fontWeight: 600, fontSize: 11,
                      color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em',
                      borderBottom: '1px solid var(--color-border-primary)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { p: 'Ana Torres García', avatar: 'A', s: 'Hollywood Peel Carbon', h: '09:00', dr: 'Dr. Ramos', st: 'Atendido', stColor: 'var(--color-status-completed)', stBg: 'var(--color-status-completed-bg)', m: 'S/ 180' },
                  { p: 'Luis Pérez Morales', avatar: 'L', s: 'HIFU 12D Ultraformer', h: '10:30', dr: 'Dr. Ramos', st: 'En Progreso', stColor: 'var(--color-status-in-progress)', stBg: 'var(--color-status-in-progress-bg)', m: 'S/ 500' },
                  { p: 'María G. Ríos', avatar: 'M', s: 'Pico Láser 532nm', h: '12:00', dr: 'Dra. Salinas', st: 'Reservado', stColor: 'var(--color-status-scheduled)', stBg: 'var(--color-status-scheduled-bg)', m: 'S/ 300' },
                  { p: 'Carlos Huamán', avatar: 'C', s: 'Bioestimulación', h: '14:00', dr: 'Dra. Salinas', st: 'Reservado', stColor: 'var(--color-status-scheduled)', stBg: 'var(--color-status-scheduled-bg)', m: 'S/ 220' },
                  { p: 'Rosa Llontop', avatar: 'R', s: 'Facial Derma Plus', h: '15:30', dr: 'Dr. Ramos', st: 'Cancelado', stColor: 'var(--color-status-cancelled)', stBg: 'var(--color-status-cancelled-bg)', m: 'S/ 150' },
                ].map((row, i) => (
                  <tr key={i} className="sg-row-hover" style={{ borderBottom: '1px solid var(--color-border-secondary)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                          background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-primary))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontWeight: 700, fontSize: 12,
                        }}>{row.avatar}</div>
                        <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{row.p}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>{row.s}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{row.h}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: 13 }}>{row.dr}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Badge label={row.st} color={row.stColor} bg={row.stBg} dot />
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-mono)', fontSize: 13 }}>{row.m}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button style={{
                          padding: '4px 10px', borderRadius: 5, border: '1px solid var(--color-border-primary)',
                          background: 'transparent', fontSize: 12, cursor: 'pointer', color: 'var(--color-text-secondary)',
                        }}>Ver</button>
                        <button style={{
                          padding: '4px 10px', borderRadius: 5, border: 'none',
                          background: 'var(--color-primary-alpha-10)', fontSize: 12, cursor: 'pointer', color: 'var(--color-primary)', fontWeight: 500,
                        }}>Editar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{
            padding: '12px 20px', borderTop: '1px solid var(--color-border-secondary)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--color-bg-primary)',
          }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Mostrando 1–5 de 28 citas</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {['‹', '1', '2', '3', '...', '6', '›'].map((p, i) => (
                <button key={i} style={{
                  width: 30, height: 30, borderRadius: 6, border: '1px solid',
                  borderColor: p === '1' ? 'var(--color-primary)' : 'var(--color-border-primary)',
                  background: p === '1' ? 'var(--color-primary)' : 'transparent',
                  color: p === '1' ? '#fff' : 'var(--color-text-secondary)',
                  fontSize: 13, cursor: 'pointer', fontWeight: p === '1' ? 700 : 400,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{p}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Empty state */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 12 }}>Estado vacío</div>
          <div style={{
            background: 'var(--color-bg-primary)', borderRadius: 12,
            border: '1px solid var(--color-border-secondary)',
            padding: '48px 24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 6 }}>Sin citas registradas</div>
            <div style={{ fontSize: 14, color: 'var(--color-text-tertiary)', marginBottom: 20 }}>No hay citas para los filtros seleccionados</div>
            <button style={{
              padding: '8px 20px', borderRadius: 6, border: 'none',
              background: 'var(--color-primary)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>+ Agendar primera cita</button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            SECCIÓN 11: INDICADORES DE CARGA
        ══════════════════════════════════════════════ */}
        <SectionDivider n="12" title="Indicadores de Carga" />

        {/* Spinners */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>Spinners</div>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {[
              { size: 16, label: 'XS · 16px', color: 'var(--color-primary)' },
              { size: 24, label: 'SM · 24px', color: 'var(--color-primary)' },
              { size: 36, label: 'MD · 36px', color: 'var(--color-primary)' },
              { size: 48, label: 'LG · 48px', color: 'var(--color-primary)' },
              { size: 24, label: 'Success', color: 'var(--color-success)' },
              { size: 24, label: 'Error', color: 'var(--color-error)' },
              { size: 24, label: 'Warning', color: 'var(--color-warning)' },
              { size: 24, label: 'Accent', color: 'var(--color-accent)' },
            ].map(({ size, label, color }) => (
              <div key={label} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <Spinner size={size} color={color} />
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Skeleton loaders */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>Skeleton Loaders</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 700 }}>
            {/* Skeleton de tarjeta de paciente */}
            <div style={{
              background: 'var(--color-bg-primary)', borderRadius: 12,
              border: '1px solid var(--color-border-secondary)', padding: 20,
            }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                <SkeletonBlock w={44} h={44} radius={22} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <SkeletonBlock w="70%" h={13} />
                  <SkeletonBlock w="45%" h={10} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <SkeletonBlock h={10} />
                <SkeletonBlock w="85%" h={10} />
                <SkeletonBlock w="60%" h={10} />
              </div>
            </div>

            {/* Skeleton de stat card */}
            <div style={{
              background: 'var(--color-bg-primary)', borderRadius: 12,
              border: '1px solid var(--color-border-secondary)', padding: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <SkeletonBlock w="60%" h={11} />
                <SkeletonBlock w={24} h={24} radius={6} />
              </div>
              <SkeletonBlock w="45%" h={28} radius={6} />
              <div style={{ marginTop: 10 }}><SkeletonBlock w="35%" h={10} /></div>
              <div style={{ marginTop: 14 }}><SkeletonBlock h={3} radius={999} /></div>
            </div>
          </div>
        </div>

        {/* Progress bars */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>Barras de Progreso</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 520 }}>
            <ProgressBar value={78} color="var(--color-primary)" label="Primary" />
            <ProgressBar value={62} color="var(--color-success)" label="Success" />
            <ProgressBar value={45} color="var(--color-warning)" label="Warning" />
            <ProgressBar value={28} color="var(--color-error)" label="Error" />
            <ProgressBar value={90} color="var(--color-info)" label="Info" />

            {/* Segmented — sesiones de tratamiento */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Sesiones HIFU 12D — 3/5 completadas</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)' }}>60%</span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 10, borderRadius: 5,
                    background: i <= 3 ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                    border: `1px solid ${i <= 3 ? 'var(--color-primary-dark)' : 'var(--color-border-primary)'}`,
                  }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                {['S1', 'S2', 'S3', 'S4', 'S5'].map((s, i) => (
                  <div key={s} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: i < 3 ? 'var(--color-primary)' : 'var(--color-text-tertiary)', fontWeight: i < 3 ? 700 : 400 }}>{s}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            SECCIÓN 13: TEMPLATES DE PÁGINA
        ══════════════════════════════════════════════ */}
        <SectionDivider n="13" title="Templates de Página" />

        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 28, lineHeight: 1.6 }}>
          Tres patrones de layout reutilizables. Cada wireframe muestra la anatomía del template con sus zonas funcionales. Importar desde <code style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)', fontSize: 13 }}>src/components/templates/</code>.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>

          {/* ── PageListLayout ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--color-primary)', background: 'var(--color-primary-alpha-10)',
                padding: '3px 8px', borderRadius: 4,
              }}>PageListLayout</span>
              <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Lista + Filtros + Tabla</span>
            </div>

            <div style={{
              border: '1.5px solid var(--color-border-primary)', borderRadius: 10,
              background: 'var(--color-bg-primary)', height: 320, display: 'flex', flexDirection: 'column',
              boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
            }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ height: 10, width: 80, borderRadius: 4, background: 'var(--color-text-primary)', opacity: 0.65, marginBottom: 5 }} />
                  <div style={{ height: 7, width: 50, borderRadius: 3, background: 'var(--color-bg-tertiary)' }} />
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ height: 22, width: 54, borderRadius: 4, background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-primary)' }} />
                  <div style={{ height: 22, width: 68, borderRadius: 4, background: 'var(--color-primary)', opacity: 0.8 }} />
                </div>
              </div>
              <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--color-border-secondary)', background: 'var(--color-bg-secondary)', display: 'flex', gap: 8 }}>
                <div style={{ height: 20, flex: 2, borderRadius: 4, background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-secondary)' }} />
                <div style={{ height: 20, flex: 1, borderRadius: 4, background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-secondary)' }} />
                <div style={{ height: 20, flex: 1, borderRadius: 4, background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-secondary)' }} />
              </div>
              <div style={{ padding: '6px 14px', background: 'var(--color-bg-tertiary)', display: 'flex', gap: 10, borderBottom: '1px solid var(--color-border-secondary)' }}>
                {[35, 55, 40, 30].map((w, i) => <div key={i} style={{ height: 6, width: w, borderRadius: 3, background: 'var(--color-border-primary)' }} />)}
              </div>
              <div style={{ flex: 1 }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} style={{ padding: '7px 14px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid var(--color-border-secondary)', background: i % 2 === 0 ? 'var(--color-bg-secondary)' : 'var(--color-bg-primary)' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--color-primary)', opacity: 0.18, flexShrink: 0 }} />
                    <div style={{ height: 6, flex: 2, borderRadius: 3, background: 'var(--color-bg-tertiary)' }} />
                    <div style={{ height: 6, flex: 1.5, borderRadius: 3, background: 'var(--color-bg-tertiary)' }} />
                    <div style={{ height: 12, width: 40, borderRadius: 999, background: [0.15, 0.2, 0.15].map((o, j) => j === i % 3 ? `rgba(15,118,110,${o})` : null).filter(Boolean)[0] ?? 'var(--color-bg-tertiary)', flexShrink: 0 }} />
                  </div>
                ))}
              </div>
              <div style={{ padding: '6px 14px', borderTop: '1px solid var(--color-border-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ height: 6, width: 55, borderRadius: 3, background: 'var(--color-bg-tertiary)' }} />
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1, 2, 3].map(p => <div key={p} style={{ width: 18, height: 18, borderRadius: 4, background: p === 1 ? 'var(--color-primary)' : 'var(--color-bg-tertiary)' }} />)}
                </div>
              </div>
            </div>

            <div style={{ padding: '10px 14px', background: 'var(--color-bg-tertiary)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>Props</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  ['title', 'string'],
                  ['actions', 'ReactNode — botones header'],
                  ['filters', 'ReactNode — fila inputs'],
                  ['total', 'number'],
                  ['isLoading', 'boolean'],
                  ['error', 'string | null'],
                  ['children', 'ReactNode — tabla'],
                ].map(([p, t]) => <PropRow key={p} name={p} type={t} />)}
              </div>
            </div>
          </div>

          {/* ── PageFormLayout ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--color-success-dark)', background: 'var(--color-success-alpha-10)',
                padding: '3px 8px', borderRadius: 4,
              }}>PageFormLayout</span>
              <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Crear / Editar</span>
            </div>

            <div style={{
              border: '1.5px solid var(--color-border-primary)', borderRadius: 10,
              background: 'var(--color-bg-primary)', height: 320, display: 'flex', flexDirection: 'column',
              boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
            }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border-secondary)' }}>
                <div style={{ height: 10, width: 100, borderRadius: 4, background: 'var(--color-text-primary)', opacity: 0.65, marginBottom: 5 }} />
                <div style={{ height: 6, width: 65, borderRadius: 3, background: 'var(--color-bg-tertiary)' }} />
              </div>
              <div style={{ margin: '10px 14px 0', padding: '7px 10px', borderRadius: 6, background: 'var(--color-error-alpha-10)', borderLeft: '3px solid var(--color-error)', display: 'flex', gap: 6, alignItems: 'center' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-error)', flexShrink: 0 }} />
                <div style={{ height: 6, flex: 1, borderRadius: 3, background: 'var(--color-error)', opacity: 0.25 }} />
              </div>
              <div style={{ flex: 1, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[['1fr'], ['1fr', '1fr'], ['1fr', '1fr'], ['1fr']].map((cols, ri) => (
                  <div key={ri} style={{ display: 'grid', gridTemplateColumns: cols.join(' '), gap: 8 }}>
                    {cols.map((_, ci) => (
                      <div key={ci}>
                        <div style={{ height: 5, width: 42, borderRadius: 3, background: 'var(--color-bg-tertiary)', marginBottom: 4 }} />
                        <div style={{ height: 20, borderRadius: 4, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-secondary)' }} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div style={{ padding: '8px 14px', borderTop: '1px solid var(--color-border-secondary)', background: 'var(--color-bg-secondary)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <div style={{ height: 24, width: 58, borderRadius: 4, background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-secondary)' }} />
                <div style={{ height: 24, width: 72, borderRadius: 4, background: 'var(--color-primary)', opacity: 0.85 }} />
              </div>
            </div>

            <div style={{ padding: '10px 14px', background: 'var(--color-bg-tertiary)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>Props</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  ['title', 'string'],
                  ['isLoading', 'boolean'],
                  ['error', 'string | null'],
                  ['onSubmit', '() => void'],
                  ['formActions', 'ReactNode'],
                  ['children', 'ReactNode — campos'],
                ].map(([p, t]) => <PropRow key={p} name={p} type={t} color="var(--color-success-dark)" />)}
              </div>
            </div>
          </div>

          {/* ── PageDetailLayout ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--color-warning-dark)', background: 'var(--color-warning-alpha-10)',
                padding: '3px 8px', borderRadius: 4,
              }}>PageDetailLayout</span>
              <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Vista Detalle</span>
            </div>

            <div style={{
              border: '1.5px solid var(--color-border-primary)', borderRadius: 10,
              background: 'var(--color-bg-primary)', height: 320, display: 'flex', flexDirection: 'column',
              boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
            }}>
              <div style={{ padding: '7px 14px', borderBottom: '1px solid var(--color-border-secondary)', background: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, background: 'var(--color-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 0, height: 0, borderTop: '3px solid transparent', borderBottom: '3px solid transparent', borderRight: '5px solid var(--color-border-primary)', marginLeft: -1 }} />
                </div>
                <div style={{ height: 6, width: 50, borderRadius: 3, background: 'var(--color-bg-tertiary)' }} />
              </div>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ height: 10, width: 95, borderRadius: 4, background: 'var(--color-text-primary)', opacity: 0.65, marginBottom: 5 }} />
                  <div style={{ height: 6, width: 60, borderRadius: 3, background: 'var(--color-bg-tertiary)' }} />
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <div style={{ height: 20, width: 44, borderRadius: 4, background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-secondary)' }} />
                  <div style={{ height: 20, width: 55, borderRadius: 4, background: 'var(--color-primary)', opacity: 0.8 }} />
                </div>
              </div>
              <div style={{ flex: 1, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
                <div style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-secondary)', display: 'flex', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-primary)', opacity: 0.18, flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, justifyContent: 'center' }}>
                    <div style={{ height: 7, width: '65%', borderRadius: 3, background: 'var(--color-bg-tertiary)' }} />
                    <div style={{ height: 5, width: '40%', borderRadius: 3, background: 'var(--color-bg-tertiary)' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--color-border-secondary)' }}>
                  {[55, 50, 45].map((w, i) => (
                    <div key={i} style={{ height: 22, width: w, borderRadius: '4px 4px 0 0', background: i === 0 ? 'var(--color-primary-alpha-10)' : 'transparent', borderBottom: i === 0 ? '2px solid var(--color-primary)' : 'none', marginBottom: i === 0 ? -2 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ height: 5, width: w - 14, borderRadius: 3, background: i === 0 ? 'var(--color-primary)' : 'var(--color-bg-tertiary)', opacity: i === 0 ? 0.6 : 1 }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{ padding: '5px 8px', borderRadius: 5, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-secondary)' }}>
                      <div style={{ height: 5, width: 35, borderRadius: 3, background: 'var(--color-bg-tertiary)', marginBottom: 4 }} />
                      <div style={{ height: 7, width: '70%', borderRadius: 3, background: 'var(--color-bg-tertiary)' }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ padding: '10px 14px', background: 'var(--color-bg-tertiary)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>Props</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  ['title', 'string — nombre recurso'],
                  ['subtitle', 'string — DNI, email...'],
                  ['onBack', '() => void'],
                  ['backLabel', 'string'],
                  ['actions', 'ReactNode'],
                  ['isLoading', 'boolean'],
                  ['children', 'ReactNode — secciones'],
                ].map(([p, t]) => <PropRow key={p} name={p} type={t} color="var(--color-warning-dark)" />)}
              </div>
            </div>
          </div>
        </div>

        {/* Import snippet */}
        <div style={{
          marginTop: 20, padding: '14px 18px', borderRadius: 10,
          background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-secondary)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Importación
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              "import { PageListLayout } from '../components/templates/PageListLayout';",
              "import { PageFormLayout } from '../components/templates/PageFormLayout';",
              "import { PageDetailLayout } from '../components/templates/PageDetailLayout';",
            ].map((line, i) => (
              <code key={i} style={{
                display: 'block', fontSize: 12, padding: '6px 10px',
                background: 'var(--color-bg-primary)', borderRadius: 5,
                color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)',
                border: '1px solid var(--color-border-secondary)',
              }}>{line}</code>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            SECCIÓN 14: DETALLE DE PACIENTE
        ══════════════════════════════════════════════ */}
        <SectionDivider n="14" title="Detalle de Paciente (patient-detail.css)" />

        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 28, lineHeight: 1.6 }}>
          Componentes del módulo <code style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)', fontSize: 13 }}>patient-detail.css</code> y{' '}
          <code style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)', fontSize: 13 }}>state-transitions.css</code>.
          Todos usan design tokens — funcionan en dark/light sin ajustes.
        </p>

        {/* ── Avatar / Photo ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            Avatar de paciente (<code style={{ fontSize: 12, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.pd-avatar</code>) — foto o iniciales
          </div>
          <div style={{ display: 'flex', gap: 32, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {/* Con iniciales */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div className="pd-avatar">AT</div>
              <code style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family-mono)' }}>sin foto</code>
            </div>
            {/* Con foto (simulada con gradiente) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div className="pd-avatar" style={{ background: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)' }}>
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='88' height='88'%3E%3Crect width='88' height='88' fill='%23f97316'/%3E%3Ccircle cx='44' cy='30' r='18' fill='%23fff' opacity='.8'/%3E%3Cellipse cx='44' cy='72' rx='28' ry='20' fill='%23fff' opacity='.8'/%3E%3C/svg%3E" alt="foto" />
              </div>
              <code style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family-mono)' }}>con foto</code>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 10, fontFamily: 'monospace' }}>
            {'<div class="pd-avatar"> {patient.photoUrl ? <img src={photoUrl}/> : `${first[0]}${last[0]}`} </div>'}
          </div>
        </div>

        {/* ── Hero Card ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            Hero Card (<code style={{ fontSize: 12, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.pd-hero</code>)
          </div>
          <div className="pd-hero" style={{ maxWidth: 700 }}>
            <div className="pd-avatar">MG</div>
            <div className="pd-hero__info">
              <h1 className="pd-hero__name">María Guadalupe Ríos</h1>
              <div className="pd-hero__chips">
                <span className="pd-chip">DNI: 45678901</span>
                <span className="pd-chip">32 años</span>
                <span className="pd-chip">Femenino</span>
                <span className="pd-chip">987 654 321</span>
              </div>
            </div>
            <div className="pd-hero__actions">
              <button style={{ padding: '8px 16px', borderRadius: 'var(--radius-lg)', border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Editar</button>
              <button style={{ padding: '8px 16px', borderRadius: 'var(--radius-lg)', border: 'none', background: 'var(--color-success)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Nueva Cita</button>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
            .pd-hero · .pd-avatar · .pd-hero__info · .pd-hero__name · .pd-hero__chips · .pd-chip · .pd-hero__actions
          </div>
        </div>

        {/* ── Cards Grid ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            Cards del dashboard (<code style={{ fontSize: 12, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.pd-card</code>) con variantes de ícono
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Contacto', cls: 'pd-card__icon--teal', title: 'Contacto' },
              { label: 'Calendario', cls: 'pd-card__icon--purple', title: 'Última Atención' },
              { label: 'Éxito', cls: 'pd-card__icon--green', title: 'Completados' },
              { label: 'Alerta', cls: 'pd-card__icon--amber', title: 'Órdenes de Pago' },
              { label: 'Error', cls: 'pd-card__icon--red', title: 'Pendiente' },
            ].map(({ cls, title }) => (
              <div key={title} className="pd-card" style={{ width: 200 }}>
                <div className="pd-card__header">
                  <h2 className="pd-card__title">
                    <span className={`pd-card__icon ${cls}`}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.8"/>
                      </svg>
                    </span>
                    {title}
                  </h2>
                </div>
                <div className="pd-card__body" style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                  Contenido de la card...
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
            .pd-card__icon--teal · --purple · --green · --amber · --red
          </div>
        </div>

        {/* ── Info List ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            Lista de información (<code style={{ fontSize: 12, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.pd-info-list</code>)
          </div>
          <div className="pd-card" style={{ maxWidth: 360 }}>
            <div className="pd-card__header">
              <h2 className="pd-card__title">
                <span className="pd-card__icon pd-card__icon--teal">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M1.5 12.5a5.5 5.5 0 0111 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </span>
                Contacto
              </h2>
            </div>
            <div className="pd-card__body">
              <div className="pd-info-list">
                <div className="pd-info-row">
                  <span className="pd-info-label">Teléfono</span>
                  <a className="pd-info-value pd-info-link" href="#">987 654 321</a>
                </div>
                <div className="pd-info-row">
                  <span className="pd-info-label">Email</span>
                  <a className="pd-info-value pd-info-link" href="#">maria@example.com</a>
                </div>
                <div className="pd-info-row">
                  <span className="pd-info-label">Dirección</span>
                  <span className="pd-info-value">Av. España 1234, Trujillo</span>
                </div>
                <div className="pd-info-row">
                  <span className="pd-info-label">Nacimiento</span>
                  <span className="pd-info-value pd-info-empty">No registrado</span>
                </div>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
            .pd-info-list · .pd-info-row · .pd-info-label · .pd-info-value · .pd-info-link · .pd-info-empty
          </div>
        </div>

        {/* ── Stats + Treatment + Actions en una fila ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginBottom: 32 }}>

          {/* Stats */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
              Stats (<code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.pd-stats</code>)
            </div>
            <div className="pd-stats">
              <div className="pd-stat">
                <span className="pd-stat__number">12</span>
                <span className="pd-stat__label">Total</span>
              </div>
              <div className="pd-stat">
                <span className="pd-stat__number">3</span>
                <span className="pd-stat__label">Activos</span>
              </div>
              <div className="pd-stat">
                <span className="pd-stat__number">9</span>
                <span className="pd-stat__label">Completos</span>
              </div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
              .pd-stats · .pd-stat · .pd-stat__number · .pd-stat__label
            </div>
          </div>

          {/* Treatment progress */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
              Tratamiento (<code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.pd-treatment</code>)
            </div>
            <div className="pd-treatment-list">
              <div className="pd-treatment">
                <div className="pd-treatment__header">
                  <h3 className="pd-treatment__name">HIFU 12D</h3>
                  <span className="pd-treatment__sessions">3/5</span>
                </div>
                <div className="pd-progress">
                  <div className="pd-progress__track">
                    <div className="pd-progress__fill" style={{ width: '60%' }} />
                  </div>
                  <span className="pd-progress__pct">60%</span>
                </div>
              </div>
              <div className="pd-treatment">
                <div className="pd-treatment__header">
                  <h3 className="pd-treatment__name">Pico Láser</h3>
                  <span className="pd-treatment__sessions">1/4</span>
                </div>
                <div className="pd-progress">
                  <div className="pd-progress__track">
                    <div className="pd-progress__fill" style={{ width: '25%' }} />
                  </div>
                  <span className="pd-progress__pct">25%</span>
                </div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
              .pd-treatment · .pd-treatment__header · .pd-progress · .pd-progress__track · .pd-progress__fill · .pd-progress__pct
            </div>
          </div>

          {/* Completed */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
              Completado (<code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.pd-completed</code>)
            </div>
            <div className="pd-completed-list">
              {['Hollywood Peel', 'Bioestimulación', 'Facial Derma'].map(name => (
                <div key={name} className="pd-completed">
                  <div className="pd-completed__check">✓</div>
                  <div>
                    <div className="pd-completed__name">{name}</div>
                    <div className="pd-completed__sessions">5 sesiones</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
              .pd-completed-list · .pd-completed · .pd-completed__check · .pd-completed__name
            </div>
          </div>
        </div>

        {/* ── Orden de pago pendiente + Quick actions ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>

          {/* Orden de pago pendiente */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
              Orden de pago pendiente (<code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.pd-pending-total · .pd-payment-order</code>)
            </div>
            <div className="pd-pending-total">
              <span className="pd-pending-total__label">Total pendiente</span>
              <span className="pd-pending-total__amount">S/ 1,250.00</span>
            </div>
            <div className="pd-payment-order-list" style={{ marginTop: 12 }}>
              {[
                { date: '15 May 2026', status: 'pending', amount: 'S/ 800.00' },
                { date: '02 May 2026', status: 'partial', amount: 'S/ 450.00' },
              ].map(inv => (
                <div key={inv.date} className="pd-payment-order">
                  <div>
                    <div className="pd-payment-order__date">{inv.date}</div>
                    <span className={`pd-payment-order__status pd-payment-order__status--${inv.status}`}>
                      {inv.status === 'pending' ? 'Pendiente' : 'Pago parcial'}
                    </span>
                  </div>
                  <span className="pd-payment-order__amount">{inv.amount}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
              .pd-pending-total · .pd-payment-order-list · .pd-payment-order · .pd-payment-order__status--pending/partial
            </div>
          </div>

          {/* Quick actions */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
              Acciones rápidas (<code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.pd-actions-grid · .pd-action</code>)
            </div>
            <div className="pd-actions-grid">
              {[
                { title: 'Historial', desc: 'Ver registros' },
                { title: 'Órdenes de Pago', desc: 'Órdenes de pago' },
                { title: 'Nueva Cita', desc: 'Agendar sesión' },
                { title: 'Editar', desc: 'Actualizar datos' },
              ].map(a => (
                <button key={a.title} className="pd-action">
                  <span className="pd-action__icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </span>
                  <div>
                    <p className="pd-action__title">{a.title}</p>
                    <p className="pd-action__desc">{a.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
              .pd-actions-grid · .pd-action · .pd-action__icon · .pd-action__title · .pd-action__desc
            </div>
          </div>
        </div>

        {/* ── Empty state + Back button ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
              Estado vacío (<code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.pd-empty</code>)
            </div>
            <div className="pd-card">
              <div className="pd-card__body">
                <div className="pd-empty">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <rect x="5" y="5" width="30" height="30" rx="3" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3"/>
                    <path d="M13 20h14M13 26h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <p>Sin registros disponibles</p>
                  <button style={{ padding: '6px 14px', borderRadius: 'var(--radius-lg)', border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Agregar primero
                  </button>
                </div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
              .pd-empty (flex column center) · ícono SVG con stroke-dasharray · texto + botón opcional
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
              Botón volver (<code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.pd-back</code>) y vista-todo (<code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.pd-view-all</code>)
            </div>
            <div className="pd-card">
              <div className="pd-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <button className="pd-back">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Volver a Pacientes
                </button>
                <button className="pd-view-all">Ver todos (8) →</button>
              </div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
              .pd-back — navegación secundaria · .pd-view-all — expansión de listas
            </div>
          </div>
        </div>

        {/* ── State Transitions ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            Transiciones de estado (<code style={{ fontSize: 12, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>state-transitions.css</code>) — Citas
          </div>

          {/* Ejemplo: desde "Reservada" */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Desde estado: Reservada
            </div>
            <div className="sts-wrapper" style={{ maxWidth: 520 }}>
              <div className="sts-primary-section">
                <button className="sts-primary-btn sts-primary--primary">
                  <span className="sts-primary-btn__icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M5 3L13 8L5 13V3z" fill="currentColor"/></svg>
                  </span>
                  <span className="sts-primary-btn__body">
                    <span className="sts-primary-btn__label">Iniciar Atención</span>
                    <span className="sts-primary-btn__desc">El paciente llegó y comienza la atención</span>
                  </span>
                  <svg className="sts-primary-btn__arrow" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
              <div className="sts-secondary-section">
                <button className="sts-secondary-btn sts-secondary-btn--danger">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10 4L4 10M4 4l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  Cancelar Cita
                </button>
                <button className="sts-secondary-btn sts-secondary-btn--danger">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="5" r="2" stroke="currentColor" strokeWidth="1.5"/><path d="M1 12c0-2 2-3 4-3s4 1 4 3M11 4l2 2m0-2l-2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  No Asistió
                </button>
              </div>
            </div>
          </div>

          {/* Ejemplo: desde "En Atención" */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Desde estado: En Atención
            </div>
            <div className="sts-wrapper" style={{ maxWidth: 520 }}>
              <div className="sts-primary-section">
                <button className="sts-primary-btn sts-primary--success">
                  <span className="sts-primary-btn__icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13 4L6 11L3 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  <span className="sts-primary-btn__body">
                    <span className="sts-primary-btn__label">Finalizar Atención</span>
                    <span className="sts-primary-btn__desc">Marcar como atendida y completar el tratamiento</span>
                  </span>
                  <svg className="sts-primary-btn__arrow" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
              <div className="sts-secondary-section">
                <button className="sts-secondary-btn sts-secondary-btn--neutral">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Revertir a Reservada
                </button>
                <button className="sts-secondary-btn sts-secondary-btn--danger">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10 4L4 10M4 4l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  Cancelar
                </button>
              </div>
            </div>
          </div>

          {/* Error */}
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Mensaje de error
            </div>
            <div className="sts-error" style={{ maxWidth: 520 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M7 4v4M7 9.5h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Sube al menos una foto de ANTES para finalizar la atención.
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 12, fontFamily: 'monospace' }}>
            100% design tokens — .sts-primary-btn.sts-primary--primary (→ --color-primary) / .sts-primary--success (→ --color-success)
            · .sts-secondary-btn--neutral (border-primary) / --danger (error-alpha) · .sts-error (error-alpha-10 + error-light)
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            SECCIÓN 15: DETALLE DE CITA
        ══════════════════════════════════════════════ */}
        <SectionDivider n="15" title="Detalle de Cita (appointment-detail.css)" />

        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 28, lineHeight: 1.6 }}>
          Componentes del módulo <code style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)', fontSize: 13 }}>appointment-detail.css</code>.
          Todos usan design tokens — compatibles con dark/light.
        </p>

        {/* ── Patient Strip ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            Patient strip — <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.adet-patient-strip</code> — con foto y sin foto
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 520 }}>
            {/* Con foto */}
            <div className="adet-patient-strip" style={{ cursor: 'default' }}>
              <div className="adet-patient-avatar" style={{ background: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)' }}>
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='52' height='52'%3E%3Crect width='52' height='52' fill='%23f97316'/%3E%3Ccircle cx='26' cy='18' r='11' fill='%23fff' opacity='.8'/%3E%3Cellipse cx='26' cy='44' rx='18' ry='13' fill='%23fff' opacity='.8'/%3E%3C/svg%3E" alt="foto" />
              </div>
              <div className="adet-patient-info">
                <p className="adet-patient-name">Ana Torres García</p>
                <span className="adet-patient-meta">DNI 45678901 · con foto</span>
              </div>
              <svg className="adet-patient-chevron" width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M7 5l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            {/* Sin foto */}
            <div className="adet-patient-strip" style={{ cursor: 'default' }}>
              <div className="adet-patient-avatar">AT</div>
              <div className="adet-patient-info">
                <p className="adet-patient-name">Ana Torres García</p>
                <span className="adet-patient-meta">DNI 45678901 · sin foto (iniciales)</span>
              </div>
              <svg className="adet-patient-chevron" width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M7 5l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
            .adet-patient-strip · .adet-patient-avatar (img | initials) · .adet-patient-info · .adet-patient-name · .adet-patient-meta · .adet-patient-chevron
          </div>
        </div>

        {/* ── Bloques de pago ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            Bloque de pago — <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.adet-pay-pkg</code>
          </div>
          <div style={{ maxWidth: 480 }}>
            <div className="adet-pay-pkg">
              <div className="adet-pay-pkg__title">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 4h12M1 7h12M1 10h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                Pago del Paquete
              </div>
              <div className="adet-pay-pkg__stats">
                <div className="adet-pay-stat adet-pay-stat--total">
                  <div className="adet-pay-stat__label">Total</div>
                  <div className="adet-pay-stat__amount">S/. 1,200</div>
                </div>
                <div className="adet-pay-stat adet-pay-stat--paid">
                  <div className="adet-pay-stat__label">Pagado</div>
                  <div className="adet-pay-stat__amount">S/. 900</div>
                </div>
                <div className="adet-pay-stat adet-pay-stat--pending">
                  <div className="adet-pay-stat__label">Pendiente</div>
                  <div className="adet-pay-stat__amount">S/. 300</div>
                </div>
              </div>
              <div className="adet-pay-progress">
                <div className="adet-pay-progress__fill" style={{ width: '75%' }} />
              </div>
              <button className="adet-pay-cta" type="button">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="1" stroke="currentColor" strokeWidth="1.8"/><path d="M1 7h14" stroke="currentColor" strokeWidth="1.8"/></svg>
                Ver Órdenes de Pago del Paciente
              </button>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
            .adet-pay-pkg · .adet-pay-pkg__title · .adet-pay-pkg__stats · .adet-pay-stat--total/paid/pending · .adet-pay-stat__label/amount · .adet-pay-progress · .adet-pay-progress__fill · .adet-pay-cta / .adet-pay-done
          </div>
        </div>

        {/* ── Otras órdenes de pago + Reserva ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
              Otras órdenes de pago — <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.adet-other-payment-orders</code>
            </div>
            <div className="adet-other-payment-orders">
              <div className="adet-other-payment-orders__header">
                <div className="adet-other-payment-orders__title">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.8"/><path d="M7 4v3M7 9.5h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  Otras Órdenes de Pago
                </div>
                <span className="adet-other-payment-orders__count">2 órdenes de pago</span>
              </div>
              <div className="adet-payment-order-list">
                {[
                  { name: 'Hollywood Peel Carbon', status: 'Sin pagar', amount: 'S/. 180' },
                  { name: 'Pico Láser 532nm', status: 'Pago parcial', amount: 'S/. 150' },
                ].map(item => (
                  <div key={item.name} className="adet-payment-order-item">
                    <div>
                      <div className="adet-payment-order-item__name">{item.name}</div>
                      <div className="adet-payment-order-item__status">{item.status}</div>
                    </div>
                    <div>
                      <div className="adet-payment-order-item__amount">{item.amount}</div>
                      <div className="adet-payment-order-item__amount-sub">pendiente</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="adet-other-payment-orders__total">
                <span className="adet-other-payment-orders__total-label">Total pendiente</span>
                <span className="adet-other-payment-orders__total-amount">S/. 330</span>
              </div>
              <button className="adet-other-payment-orders__cta" type="button">Ver Todas las Órdenes de Pago</button>
              <div className="adet-other-payment-orders__note">Órdenes de pago de otros servicios del paciente.</div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
              Reserva pagada y sin reserva — <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.adet-reservation</code>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="adet-reservation adet-reservation--paid">
                <div className="adet-reservation__title">Reserva de Cita</div>
                <div className="adet-reservation__amount-row">
                  <div>
                    <div className="adet-reservation__amount-label">Adelanto Pagado</div>
                    <div className="adet-reservation__amount">S/. 50.00</div>
                  </div>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="var(--color-success)" strokeWidth="2"/><path d="M7 12l3 3 7-7" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div className="adet-reservation__note">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M6 5.5V8M6 4h.005" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Adelanto independiente del pago del paquete.
                </div>
              </div>
              <div className="adet-reservation adet-reservation--empty">
                <div className="adet-reservation__title">Reserva de Cita</div>
                <div className="adet-reservation__empty-msg">
                  <p>Sin reserva registrada</p>
                  <p className="adet-reservation__empty-sub">Adelanto opcional</p>
                </div>
                <button className="adet-reservation__upload-btn" type="button">Registrar Reserva</button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Package Group View ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            Package Group View — <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.pkg-group · .pkg-header · .pkg-sessions · .pkg-session</code>
          </div>
          <div style={{ maxWidth: 520 }}>
            {/* Package header */}
            <div className="pkg-group">
              <div className="pkg-header">
                <div className="pkg-header__left">
                  <span className="pkg-header__name">ADN de Salmón - Rostro</span>
                  <span className="pkg-header__price">S/. 250.00</span>
                </div>
                <div className="pkg-header__right">
                  <span className="pkg-header__counter">1 de 1</span>
                </div>
              </div>
              <div className="pkg-sessions">
                <div className="pkg-session">
                  <div className="pkg-session__inner">
                    <div className="pkg-session__icon">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/><path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </div>
                    <div>
                      <p className="pkg-session__name">Sesión 1</p>
                      <span className="pkg-session__chip">1 de 1</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* New package */}
            <div className="pkg-group" style={{ marginTop: 12 }}>
              <div className="pkg-header pkg-header--new">
                <div className="pkg-header__left">
                  <span className="pkg-header__name">Hollywood Peel Carbon</span>
                  <span className="pkg-header__price">S/. 180.00</span>
                  <span className="pkg-header__badge pkg-header__badge--new">Paquete Nuevo</span>
                </div>
                <div className="pkg-header__right">
                  <span className="pkg-header__counter">1 de 3</span>
                </div>
              </div>
              <div className="pkg-sessions">
                <div className="pkg-session pkg-session--new">
                  <div className="pkg-session__abs-badge pkg-session__abs-badge--add">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    Por Agregar
                  </div>
                  <div className="pkg-session__inner">
                    <div className="pkg-session__icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/></svg></div>
                    <div>
                      <p className="pkg-session__name">Sesión 1</p>
                      <span className="pkg-session__chip">1 de 3</span>
                    </div>
                  </div>
                </div>
                <div className="pkg-session pkg-session--deleting">
                  <div className="pkg-session__abs-badge pkg-session__abs-badge--del">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    Por Eliminar
                  </div>
                  <div className="pkg-session__inner">
                    <div className="pkg-session__icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/></svg></div>
                    <div>
                      <p className="pkg-session__name">Sesión 2</p>
                      <span className="pkg-session__chip">2 de 3</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
            .pkg-group · .pkg-header / .pkg-header--new · .pkg-header__left/right/name/price/badge · .pkg-sessions · .pkg-session / --new / --deleting · .pkg-session__icon/name/chip · .pkg-session__abs-badge--add/del
          </div>
        </div>

        {/* ── Medidas corporales ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            Medidas corporales — <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.adet-measures-grid · .adet-measure-stat · .adet-body-block · .adet-body-item · .adet-health-notes</code>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <div className="adet-measures-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 12 }}>
                <div className="adet-measure-stat adet-measure-stat--success">
                  <div className="adet-measure-stat__label">Peso</div>
                  <div className="adet-measure-stat__value">68 <span style={{ fontSize: 'var(--font-size-base)' }}>kg</span></div>
                </div>
                <div className="adet-measure-stat adet-measure-stat--warning">
                  <div className="adet-measure-stat__label">Altura</div>
                  <div className="adet-measure-stat__value">165 <span style={{ fontSize: 'var(--font-size-base)' }}>cm</span></div>
                </div>
                <div className="adet-measure-stat adet-measure-stat--success">
                  <div className="adet-measure-stat__label">IMC</div>
                  <div className="adet-measure-stat__value">24.9</div>
                  <div className="adet-measure-stat__sub">Peso normal</div>
                </div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontFamily: 'monospace' }}>
                --success / --warning / --info / --error → auto tokens
              </div>
            </div>
            <div>
              <div className="adet-body-block" style={{ marginBottom: 12 }}>
                <div className="adet-body-block__title">Medidas del Cuerpo</div>
                <div className="adet-body-items">
                  {[['Cintura', '72 cm'], ['Cadera', '96 cm'], ['Brazo Izq.', '28 cm']].map(([l, v]) => (
                    <div key={l} className="adet-body-item">
                      <div className="adet-body-item__label">{l}</div>
                      <div className="adet-body-item__value">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="adet-health-notes">
                <div className="adet-health-notes__title">Notas de Salud</div>
                <div className="adet-health-notes__text">Paciente con piel sensible. Evitar zonas de cicatrices activas.</div>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
            .adet-measures-grid · .adet-measure-stat--success/warning/info/error · .adet-measure-stat__label/value/sub · .adet-body-block · .adet-body-items · .adet-body-item · .adet-health-notes
          </div>
        </div>

        {/* ── Notas de atención ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            Notas de atención — <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.adet-note-textarea · .adet-notes-list · .adet-note-item</code>
          </div>
          <div style={{ maxWidth: 520 }}>
            <textarea
              className="adet-note-textarea"
              readOnly
              defaultValue="Paciente presentó reacción leve en zona tratada. Se aplicó crema calmante post-tratamiento."
              rows={3}
            />
            <div className="adet-notes-list" style={{ marginTop: 12 }}>
              <div className="adet-note-item">
                <div className="adet-note-item__header">
                  <div>
                    <span className="adet-note-item__author">Grecia Geronimo</span>
                    <span className="adet-note-item__role">Personal Médico</span>
                  </div>
                  <span className="adet-note-item__date">03/06/2026, 10:15</span>
                </div>
                <p className="adet-note-item__text">Paciente sin alergias conocidas. Piel tipo III Fitzpatrick.</p>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
            .adet-note-textarea · .adet-notes-list · .adet-note-item · .adet-note-item__header · .adet-note-item__author · .adet-note-item__role · .adet-note-item__date · .adet-note-item__text · .adet-notes-empty
          </div>
        </div>

        {/* ── Status colors ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            Status badge colors — <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.status-badge-large.status-*</code>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { cls: 'status-reserved',    label: 'Reservada' },
              { cls: 'status-in-progress', label: 'En Atención' },
              { cls: 'status-attended',    label: 'Atendida' },
              { cls: 'status-cancelled',   label: 'Cancelada' },
              { cls: 'status-no-show',     label: 'No Asistió' },
            ].map(({ cls, label }) => (
              <div key={cls} className={`status-badge-large ${cls}`}>{label}</div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
            Todos usan --color-status-* tokens. .status-badge-large (base de styles.css) + .status-reserved/in-progress/attended/cancelled/no-show (appointment-detail.css)
          </div>
        </div>

        {/* ── Glass card pattern ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            Glass Card — <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.glass-card</code> (styles.css) — card principal del detalle
          </div>
          <div className="glass-card" style={{ maxWidth: 480 }}>
            <div className="card-header">
              <svg className="card-icon" width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="2" y="3" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M2 9h18M7 1v4M15 1v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <h2>Información de la Cita</h2>
            </div>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Fecha y Hora</span>
                <span className="info-value">miércoles, 3 de junio de 2026</span>
                <span className="info-time">09:30</span>
              </div>
              <div className="info-item">
                <span className="info-label">Duración</span>
                <span className="info-value">60 minutos</span>
              </div>
              <div className="info-item">
                <span className="info-label">Paciente</span>
                <span className="info-value clickable">
                  Ana Torres García
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginLeft: 4 }}><path d="M5 10l4-3-4-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
            .glass-card · .card-header · .card-icon · .info-grid · .info-item · .info-label · .info-value · .info-value.clickable · .info-time — todos de styles.css con tokens
          </div>
        </div>

        {/* ── System info ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            System info — <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.system-info · .system-item · .system-label · .system-value</code>
          </div>
          <div className="glass-card system-card" style={{ maxWidth: 480 }}>
            <div className="card-header card-header--collapsible">
              <h2 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-secondary)', margin: 0 }}>Información del Sistema</h2>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M5 7l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div className="system-info">
              <div className="system-item">
                <span className="system-label">Creado por</span>
                <span className="system-value">Grecia Geronimo</span>
              </div>
              <div className="system-item">
                <span className="system-label">Fecha de Creación</span>
                <span className="system-value">03/06/2026, 08:15</span>
              </div>
              <div className="system-item full">
                <span className="system-label">ID del Sistema</span>
                <code className="system-id">f4e2fdd4-9cc5-4173-9587-95bfabadf328</code>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
            .system-card · .system-info (grid 2 cols) · .system-item · .system-item.full · .system-label · .system-value · .system-id · .card-header--collapsible
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            SECCIÓN 16: ÓRDENES DE PAGO DEL PACIENTE
        ══════════════════════════════════════════════ */}
        <SectionDivider n="16" title="Órdenes de Pago del Paciente (patient-payment-orders.css)" />

        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 28, lineHeight: 1.6 }}>
          Componentes del módulo <code style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)', fontSize: 13 }}>patient-payment-orders.css</code>.
          100% design tokens — light y dark mode.
        </p>

        {/* ── Patient strip en header ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            Header con avatar — <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.payment-orders-patient-strip · .payment-orders-patient-avatar</code>
          </div>
          <div style={{ maxWidth: 600, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border-secondary)', borderRadius: 'var(--radius-xl)', padding: 'var(--spacing-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="payment-orders-patient-strip" style={{ marginBottom: 0 }}>
                <div className="payment-orders-patient-avatar">AT</div>
                <div>
                  <h1 className="payment-orders-title" style={{ fontSize: 'var(--font-size-2xl)' }}>Órdenes de Pago</h1>
                  <p className="payment-orders-patient-info">Ana Torres García · DNI 45678901</p>
                </div>
              </div>
              <button className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>+ Generar Orden de Pago</button>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
            .payment-orders-patient-strip · .payment-orders-patient-avatar (img | initials) · .payment-orders-title · .payment-orders-patient-info
          </div>
        </div>

        {/* ── Summary cards ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            Summary cards — <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.summary-card + .summary-card-total/paid/pending</code>
          </div>
          <div className="payment-orders-summary" style={{ maxWidth: 800 }}>
            <div className="summary-card summary-card-total">
              <div className="summary-label">Total de Órdenes de Pago</div>
              <div className="summary-amount">S/. 2,400</div>
              <div className="summary-subtitle">3 órdenes de pago</div>
            </div>
            <div className="summary-card summary-card-paid">
              <div className="summary-label">Total Pagado</div>
              <div className="summary-amount">S/. 1,800</div>
              <div className="summary-subtitle">75% completado</div>
            </div>
            <div className="summary-card summary-card-pending">
              <div className="summary-label">Total Pendiente</div>
              <div className="summary-amount">S/. 600</div>
              <div className="summary-subtitle">1 orden de pago pendiente</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
            Patrón: mismo que pd-card / glass-card — bg-primary + border-secondary + shadow-sm
            · .summary-label → --color-text-tertiary · .summary-amount → color semántico por variante
            · .summary-card-total → --color-primary · .summary-card-paid → --color-success-dark · .summary-card-pending → --color-error
          </div>
        </div>

        {/* ── Orden de pago items ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            Orden de pago item — <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.payment-order-item · .payment-order-status-badge</code>
          </div>
          <div className="payment-orders-list-container" style={{ maxWidth: 640 }}>
            <div className="payment-orders-list-header">
              <h2 className="payment-orders-list-title">Todas las Órdenes de Pago (2)</h2>
            </div>

            {/* Orden de pago pagada */}
            <div className="payment-order-item">
              <div className="payment-order-item-header">
                <div className="payment-order-item-left">
                  <div className="payment-order-item-title-row">
                    <h3 className="payment-order-item-title">Orden de Pago #A1B2C3D4</h3>
                    <span className="payment-order-status-badge payment-order-status-paid">PAGADO</span>
                  </div>
                  <div className="payment-order-orders">HIFU 12D Ultraformer • 1 sesión</div>
                  <div className="payment-order-metadata">Emisión: 15/05/2026 · 1 pago registrado</div>
                </div>
                <div className="payment-order-item-right">
                  <div className="payment-order-amount">S/. 1,200</div>
                </div>
              </div>
              <div className="payment-progress">
                <div className="payment-progress-header"><span>Progreso de pago</span><span>100%</span></div>
                <div className="payment-progress-bar"><div className="payment-progress-fill payment-progress-fill-paid" style={{ width: '100%' }} /></div>
              </div>
              <div className="payment-history">
                <div className="payment-history-title">Historial de Pagos</div>
                <div className="payment-history-item">
                  <span>15/05/2026 · YAPE</span>
                  <span className="payment-history-amount">+S/. 1,200.00</span>
                </div>
              </div>
            </div>

            {/* Orden de pago parcial */}
            <div className="payment-order-item">
              <div className="payment-order-item-header">
                <div className="payment-order-item-left">
                  <div className="payment-order-item-title-row">
                    <h3 className="payment-order-item-title">Orden de Pago #E5F6G7H8</h3>
                    <span className="payment-order-status-badge payment-order-status-partial">PAGO PARCIAL</span>
                  </div>
                  <div className="payment-order-orders">Pico Láser 532nm • 4 sesiones</div>
                  <div className="payment-order-metadata">Emisión: 02/06/2026 · 1 pago registrado</div>
                </div>
                <div className="payment-order-item-right">
                  <div className="payment-order-amount">S/. 1,200</div>
                  <div className="payment-order-pending">Pendiente: S/. 600</div>
                </div>
              </div>
              <div className="payment-progress">
                <div className="payment-progress-header"><span>Progreso de pago</span><span>50%</span></div>
                <div className="payment-progress-bar"><div className="payment-progress-fill payment-progress-fill-partial" style={{ width: '50%' }} /></div>
              </div>
              <button className="register-payment-button" type="button">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="3" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><path d="M2 7h14" stroke="currentColor" strokeWidth="1.8"/></svg>
                Registrar Pago
              </button>
            </div>

            {/* Orden sin orden de pago */}
            <div className="payment-order-item payment-order-item--without-payment-order">
              <div className="payment-order-item-header">
                <div className="payment-order-item-left">
                  <div className="payment-order-item-title-row">
                    <h3 className="payment-order-item-title">Orden #9A8B7C6D</h3>
                    <span className="payment-order-status-badge payment-order-status-pending">SIN ORDEN DE PAGO</span>
                  </div>
                  <div className="payment-order-orders">Hollywood Peel Carbon • 1 sesión</div>
                  <div className="payment-order-metadata">Creada: 03/06/2026</div>
                </div>
                <div className="payment-order-item-right">
                  <div className="payment-order-amount">S/. 180</div>
                  <div className="payment-order-pending">Sin orden de pago</div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
            .payment-order-item / .payment-order-item--without-payment-order · .payment-order-status-badge + .payment-order-status-paid/partial/pending/cancelled
            · .payment-order-amount · .payment-order-pending · .payment-progress · .payment-history · .register-payment-button
          </div>
        </div>

        {/* ── Register Payment Modal ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            Modal de Registro de Pago — <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>RegisterPaymentModal</code>
          </div>
          {/* Preview estático del contenido del modal (sin el overlay) */}
          <div style={{ maxWidth: 520, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border-secondary)', borderRadius: 'var(--radius-2xl)', padding: 'var(--spacing-xl)', boxShadow: 'var(--shadow-lg)' }}>
            {/* Resumen orden de pago */}
            <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-secondary)', borderRadius: 'var(--radius-xl)', padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)', marginBottom: 'var(--spacing-sm)' }}>Orden de Pago #1C241B4F</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
                {[['TOTAL','S/. 360.00','var(--color-text-primary)'],['PAGADO','S/. 280.00','var(--color-success-dark)'],['PENDIENTE','S/. 80.00','var(--color-error)']].map(([l,v,c]) => (
                  <div key={l} style={{ background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-lg)', padding: 8 }}>
                    <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontWeight: 600, marginBottom: 2 }}>{l}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: c as string }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ height: 8, background: 'var(--color-bg-tertiary)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '78%', background: 'linear-gradient(90deg, var(--color-success), var(--color-success-dark))', borderRadius: 999 }} />
              </div>
            </div>
            {/* Monto */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: 8 }}>Monto a pagar (S/.)</div>
              <div style={{ border: '2px solid var(--color-primary)', borderRadius: 'var(--radius-lg)', padding: '10px 14px 10px 40px', position: 'relative', background: 'var(--color-bg-primary)', boxShadow: '0 0 0 3px var(--color-primary-alpha-10)' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)', fontWeight: 700, fontSize: 14 }}>S/.</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)' }}>80.00</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                {['25%','50%','75%','Total'].map((l,i) => (
                  <div key={l} style={{ flex: 1, padding: '4px 0', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--color-border-primary)', background: i === 3 ? 'var(--color-primary-alpha-10)' : 'var(--color-bg-secondary)', color: i === 3 ? 'var(--color-primary)' : 'var(--color-text-tertiary)', fontWeight: 600, fontSize: 11, textAlign: 'center' as const }}>{l}</div>
                ))}
              </div>
            </div>
            {/* Métodos */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: 8 }}>Método de pago</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
                {[['📲','Yape',true],['📱','Plin',false],['💵','Efectivo',false],['🏦','Transfer.',false],['💳','Tarjeta',false]].map(([ic,lb,active]) => (
                  <div key={String(lb)} style={{ padding: '8px 4px', borderRadius: 'var(--radius-lg)', border: `2px solid ${active ? 'var(--color-primary)' : 'var(--color-border-primary)'}`, background: active ? 'var(--color-primary-alpha-10)' : 'var(--color-bg-primary)', color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)', fontWeight: 600, fontSize: 10, display: 'flex', flexDirection: 'column' as const, alignItems: 'center' as const, gap: 3, textAlign: 'center' as const }}>
                    <span style={{ fontSize: 18 }}>{String(ic)}</span>{String(lb)}
                  </div>
                ))}
              </div>
            </div>
            {/* Preview pago */}
            <div style={{ background: 'var(--color-primary-alpha-10)', border: '1px solid var(--color-border-primary)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-md)', display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 2 }}>Registrando</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-primary)' }}>S/. 80.00</div>
              </div>
              <div style={{ textAlign: 'right' as const }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 2 }}>vía</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>📲 Yape</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <div style={{ padding: '9px 20px', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--color-border-primary)', color: 'var(--color-text-secondary)', fontSize: 14, fontWeight: 600, background: 'var(--color-bg-secondary)' }}>Cancelar</div>
              <div style={{ padding: '9px 24px', borderRadius: 'var(--radius-lg)', border: 'none', background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', color: 'var(--color-on-primary)', fontSize: 14, fontWeight: 700 }}>Registrar Pago</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
            RegisterPaymentModal — resumen 3 stats (total/pagado/pendiente) + barra de progreso con preview live
            + shortcuts de % (25/50/75/Total) + selector de método (5 opciones) + preview del pago antes de confirmar
          </div>
        </div>

        {/* ── Order selection (Create Payment Order) ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            Selección de orden — <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.cinv-order · .cinv-order--selected · .cinv-summary</code>
          </div>
          <div style={{ maxWidth: 560 }}>
            <div className="glass-card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                {/* Normal */}
                <div className="cinv-order">
                  <input type="checkbox" className="cinv-order__checkbox" readOnly />
                  <div style={{ flex: 1 }}>
                    <div className="cinv-order__name">Hollywood Peel Carbon</div>
                    <div className="cinv-order__meta">1 sesión · 0 completadas</div>
                  </div>
                  <div className="cinv-order__price">S/. 180.00</div>
                </div>
                {/* Seleccionado */}
                <div className="cinv-order cinv-order--selected">
                  <input type="checkbox" className="cinv-order__checkbox" checked readOnly />
                  <div style={{ flex: 1 }}>
                    <div className="cinv-order__name">ADN de Salmón - Rostro</div>
                    <div className="cinv-order__meta">3 sesiones · 1 completada</div>
                  </div>
                  <div className="cinv-order__price">S/. 250.00</div>
                </div>
              </div>
            </div>
            <div className="glass-card" style={{ marginTop: 'var(--spacing-md)' }}>
              <div className="cinv-summary">
                <div>
                  <div className="cinv-summary__count">1 servicio seleccionado</div>
                  <div className="cinv-summary__total">Total: S/. 250.00</div>
                </div>
                <button style={{ padding: '10px 24px', borderRadius: 'var(--radius-lg)', border: 'none', background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', color: 'var(--color-on-primary)', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Generar Orden de Pago
                </button>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
            .cinv-order / .cinv-order--selected · .cinv-order__checkbox / __name / __meta / __price
            · .cinv-summary · .cinv-summary__count / __total / __hint
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            SECCIÓN 17: DETALLE DE ORDEN DE PAGO
        ══════════════════════════════════════════════ */}
        <SectionDivider n="17" title="Detalle de Orden de Pago (PaymentOrderDetailPage)" />

        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 28, lineHeight: 1.6 }}>
          La página <code style={{ color: "var(--color-primary)", fontFamily: "var(--font-family-mono)", fontSize: 13 }}>PaymentOrderDetailPage</code> compone
          exclusivamente con clases ya documentadas en secciones anteriores. No añade CSS nuevo —
          documenta aquí la <strong>combinación</strong> específica y los patrones de uso.
        </p>

        {/* ── Status badges ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            Status badge — <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.payment-order-status-badge.payment-order-status-paid/partial/pending/cancelled</code>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
            <span className="payment-order-status-badge payment-order-status-paid">Pagada</span>
            <span className="payment-order-status-badge payment-order-status-partial">Pago Parcial</span>
            <span className="payment-order-status-badge payment-order-status-pending">Pendiente</span>
            <span className="payment-order-status-badge payment-order-status-cancelled">Cancelada</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'monospace' }}>
            Mismo CSS que .payment-order-status-badge de sección 16 · usado en el h1 del detalle junto al número de orden de pago
          </div>
        </div>

        {/* ── Vista completa ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            Vista completa — preview estático del layout del Detalle de Orden de Pago
          </div>
          <div style={{ maxWidth: 680 }}>

            {/* Header */}
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <button className="pd-back" style={{ pointerEvents: 'none' }}>← Volver a Órdenes de Pago</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-sm)' }}>
                <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                  Orden de Pago #E9D053B6
                </h2>
                <span className="payment-order-status-badge payment-order-status-paid">Pagada</span>
              </div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
                Alan Geronimo · DNI 47157738
              </p>
            </div>

            {/* Summary cards */}
            <div className="payment-orders-summary" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 'var(--spacing-lg)' }}>
              <div className="summary-card summary-card-total">
                <div className="summary-label">Total de Órdenes de Pago</div>
                <div className="summary-amount">S/. 650.00</div>
                <div className="summary-subtitle">2 órdenes</div>
              </div>
              <div className="summary-card summary-card-paid">
                <div className="summary-label">Total Pagado</div>
                <div className="summary-amount">S/. 650.00</div>
                <div className="summary-subtitle">100% completado</div>
              </div>
              <div className="summary-card summary-card-pending">
                <div className="summary-label">Sin Deuda</div>
                <div className="summary-amount">S/. 0.00</div>
                <div className="summary-subtitle">Sin vencimiento</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="payment-progress" style={{ marginBottom: 'var(--spacing-lg)' }}>
              <div className="payment-progress-header"><span>Progreso de pago</span><span>100%</span></div>
              <div className="payment-progress-bar">
                <div className="payment-progress-fill payment-progress-fill-paid" style={{ width: '100%' }} />
              </div>
            </div>

            {/* Orders card */}
            <div className="glass-card">
              <div className="card-header">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="card-icon">
                  <rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M5 6h8M5 9h8M5 12h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                <h2>Órdenes Incluidas (2)</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                {[
                  { name: 'Hollywood Peel - Rostro (x3)', sessions: '3 sesiones · 2 completadas', price: 'S/. 400.00' },
                  { name: 'ADN de Salmón - Rostro', sessions: '1 sesión · 1 completada', price: 'S/. 250.00' },
                ].map(o => (
                  <div key={o.name} className="cinv-order" style={{ cursor: 'default' }}>
                    <div style={{ flex: 1 }}>
                      <div className="cinv-order__name">{o.name}</div>
                      <div className="cinv-order__meta">{o.sessions}</div>
                    </div>
                    <div className="cinv-order__price">{o.price}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payments card */}
            <div className="glass-card">
              <div className="card-header">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="card-icon">
                  <rect x="1" y="4" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M1 8h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <h2>Pagos Registrados (1)</h2>
              </div>
              <div className="adet-notes-list">
                <div className="adet-note-item" style={{ borderLeftColor: 'var(--color-success)' }}>
                  <div className="adet-note-item__header">
                    <div>
                      <span className="adet-note-item__author">📲 Yape</span>
                      <span className="adet-note-item__role"> · Grecia Geronimo</span>
                    </div>
                    <span style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--color-success-dark)' }}>+S/. 650.00</span>
                  </div>
                  <p className="adet-note-item__text" style={{ color: 'var(--color-text-tertiary)' }}>5 de abril de 2026</p>
                  <p className="adet-note-item__text" style={{ fontStyle: 'italic' }}>Pago completo por Yape</p>
                </div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, padding: '12px 16px', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-secondary)', fontFamily: 'monospace', lineHeight: 1.8 }}>
            Composición: .pd-back · StatusBadge (.payment-order-status-badge) · .payment-orders-summary [3 cols summary-card-*]
            · .payment-progress · .glass-card + .pd-info-list · .glass-card + .cinv-order · .glass-card + .adet-note-item (borderLeft=success) · &lt;RegisterPaymentModal&gt;
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            SECCIÓN 18: HISTORIAL DEL PACIENTE
        ══════════════════════════════════════════════ */}
        <SectionDivider n="18" title="Historial del Paciente (patient-history.css)" />

        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 28, lineHeight: 1.6 }}>
          Módulo <code style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)', fontSize: 13 }}>patient-history.css</code> — tabs, stat cards del historial, timeline markers y bloques de detalle médico.
        </p>

        {/* ── Tabs ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            Tabs — <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.phist-tabs · .phist-tab · .phist-tab--active · .phist-tab__badge</code>
          </div>
          <div className="phist-tabs" style={{ maxWidth: 500 }}>
            <button className="phist-tab phist-tab--active">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 3h12M1 7h12M1 11h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              Historial Médico
              <span className="phist-tab__badge">3</span>
            </button>
            <button className="phist-tab">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><path d="M1 5h12M5 1v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              Todas las Citas
              <span className="phist-tab__badge">8</span>
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
            .phist-tabs (border-bottom border-secondary) · .phist-tab (transparent, text-tertiary) · .phist-tab--active (bg-primary, border-bottom primary) · .phist-tab__badge (bg-tertiary → primary cuando activo)
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            Stat cards del historial — <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.phist-stat-card--records/since/last/files</code> (patrón Dashboard sec. 10)
          </div>
          <div className="phist-stat-grid" style={{ maxWidth: 900 }}>
            <div className="phist-stat-card phist-stat-card--records">
              <div className="phist-stat-card__value">5</div>
              <div className="phist-stat-card__label">Procedimientos Documentados</div>
            </div>
            <div className="phist-stat-card phist-stat-card--since">
              <div className="phist-stat-card__value">03 Jun 2026</div>
              <div className="phist-stat-card__label">Paciente desde</div>
            </div>
            <div className="phist-stat-card phist-stat-card--last">
              <div className="phist-stat-card__value">15 May 2026</div>
              <div className="phist-stat-card__label">Último Registro</div>
            </div>
            <div className="phist-stat-card phist-stat-card--files">
              <div className="phist-stat-card__value">8</div>
              <div className="phist-stat-card__label">Archivos Médicos</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
            Usa el mismo patrón que las Stat Cards del Dashboard (sec. 10) pero con tokens semánticos:
            --records → success · --since → info · --last → warning · --files → accent
          </div>
        </div>

        {/* ── Status badges + treatment + notes ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
              Status badges — <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.phist-status-badge--{'{status}'}</code>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(['reserved','in_progress','attended','cancelled','no_show'] as const).map(s => (
                <span key={s} className={`phist-status-badge phist-status-badge--${s}`}>
                  {s === 'reserved' ? 'Reservada' : s === 'in_progress' ? 'En Atención' : s === 'attended' ? 'Atendida' : s === 'cancelled' ? 'Cancelada' : 'No asistió'}
                </span>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
              Usan --color-status-* tokens (mismos que appointment cards)
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
              Foto badges — <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.phist-photo-badge--before/after</code>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span className="phist-photo-badge phist-photo-badge--before">Fotos Antes del Tratamiento</span>
              <span className="phist-photo-badge phist-photo-badge--after">Fotos Después del Tratamiento</span>
            </div>
          </div>
        </div>

        {/* ── Treatment + health notes + appointment notes ── */}
        <div style={{ marginBottom: 32, maxWidth: 560 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            Bloques de contenido médico
          </div>
          {/* Treatment */}
          <div className="phist-treatment-block" style={{ marginBottom: 12 }}>
            <div className="phist-treatment-block__title">Tratamientos Realizados</div>
            <div className="phist-treatment-list">
              {['HIFU 12D Ultraformer — Sesión 2 de 5', 'Pico Láser 532nm — Sesión 1 de 4'].map(t => (
                <div key={t} className="phist-treatment-row">
                  <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="var(--color-success)"/></svg>
                  <div className="phist-treatment-row__name">{t.split('—')[0]}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Health note */}
          <div className="phist-health-note" style={{ marginBottom: 12 }}>
            <strong className="phist-health-note__title">Notas del Procedimiento</strong>
            <p className="phist-health-note__text">Paciente presenta piel Fitzpatrick III. Sin reacciones adversas. Se recomienda protector solar SPF 50.</p>
          </div>
          {/* Appointment notes block */}
          <div className="phist-notes-block">
            <div className="phist-notes-block__title">Notas de Atención</div>
            <div className="phist-note-item">
              <div className="phist-note-item__header">
                <span className="phist-note-item__author">Grecia Geronimo</span>
                <span className="phist-note-item__date">03/06/2026, 10:15</span>
              </div>
              <p className="phist-note-item__text">Paciente tolera bien el tratamiento. Sin alergias conocidas.</p>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
            .phist-treatment-block · .phist-health-note · .phist-weight · .phist-notes-block · .phist-note-item
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            SECCIÓN 19: ANALYTICS
        ══════════════════════════════════════════════ */}
        <SectionDivider n="19" title="Analytics (analytics.css)" />

        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 28, lineHeight: 1.6 }}>
          Módulo <code style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)', fontSize: 13 }}>analytics.css</code> —
          período selector, tabs, KPI cards, chart cards, tabla y ranking. Incluye
          tokens de color para charts (<code style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)', fontSize: 12 }}>--chart-1…6</code>) compatibles con Recharts en dark/light.
        </p>

        {/* Period selector */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            Period selector — <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.period-selector · .period-button · .period-button.active</code>
          </div>
          <div className="period-selector">
            {['Hoy','Semana','Mes','Año','Personalizado'].map((l, i) => (
              <button key={l} className={`period-button${i === 2 ? ' active' : ''}`} type="button">{l}</button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
            --color-primary para active · border-radius: --radius-full · fondo --color-bg-primary
          </div>
        </div>

        {/* Tabs */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            Analytics tabs — <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.analytics-tabs · .tab-button · .tab-button.active</code>
          </div>
          <div className="analytics-tabs">
            {['Resumen Ejecutivo','Finanzas','Operaciones','Ventas','Clientes','Servicios'].map((t, i) => (
              <button key={t} className={`tab-button${i === 0 ? ' active' : ''}`} type="button">{t}</button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
            Mismo patrón que .phist-tab · border-bottom primary en activo · bg-primary en activo
          </div>
        </div>

        {/* KPI cards */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            KPI cards — <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.anlx-kpi-card--primary/success/warning/error/info/accent</code>
          </div>
          <div className="anlx-kpi-grid">
            {[
              { cls: 'anlx-kpi-card--info',    label: 'Total Citas',         value: '142',           sub: '' },
              { cls: 'anlx-kpi-card--success',  label: 'Ingresos Totales',   value: 'S/ 24,850',     sub: '' },
              { cls: 'anlx-kpi-card--warning',  label: 'Tasa de Abandono',   value: '8.3%',          sub: '' },
              { cls: 'anlx-kpi-card--error',    label: 'Por Cobrar',         value: 'S/ 1,200',      sub: '3 deudores' },
              { cls: 'anlx-kpi-card--accent',   label: 'CLV Promedio',       value: 'S/ 580',        sub: '' },
              { cls: 'anlx-kpi-card--primary',  label: 'Conversión',         value: '72%',           sub: '' },
            ].map(({ cls, label, value, sub }) => (
              <div key={label} className={`anlx-kpi-card ${cls}`}>
                <div className="anlx-kpi-label">{label}</div>
                <div className="anlx-kpi-value">{value}</div>
                {sub && <div className="anlx-kpi-sub">{sub}</div>}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
            border-left: 4px semántico · bg: --color-bg-secondary · .anlx-kpi-label (text-tertiary uppercase) · .anlx-kpi-value (text-primary bold) · .anlx-kpi-sub (color semántico)
          </div>
        </div>

        {/* Table + ranking */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            Tabla analytics — <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.anlx-chart-card · .anlx-table · .anlx-rank-badge--gold/silver/bronze</code>
          </div>
          <div className="anlx-chart-card" style={{ maxWidth: 600 }}>
            <h3 className="anlx-chart-title">Ranking de Vendedores</h3>
            <div className="anlx-table-wrap">
              <table className="anlx-table">
                <thead><tr><th>#</th><th>Vendedor</th><th className="anlx-table__right">Órdenes</th><th className="anlx-table__right">Ingresos</th></tr></thead>
                <tbody>
                  {[
                    ['gold', 'Grecia Geronimo', '48', 'S/ 12,400'],
                    ['silver', 'Antonella Elizabeth', '35', 'S/ 9,800'],
                    ['bronze', 'Estefany Murga', '22', 'S/ 6,200'],
                    ['default', 'Astrid Terres', '15', 'S/ 4,100'],
                  ].map(([rank, name, orders, revenue]) => (
                    <tr key={name}>
                      <td><span className={`anlx-rank-badge anlx-rank-badge--${rank}`}>{['gold','silver','bronze','default'].indexOf(rank)+1}</span></td>
                      <td>{name}</td>
                      <td className="anlx-table__right">{orders}</td>
                      <td className="anlx-table__right anlx-table__currency">{revenue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, fontFamily: 'monospace' }}>
            .anlx-chart-card (bg-secondary, border-secondary) · .anlx-chart-title · .anlx-table (th: bg-tertiary uppercase) · .anlx-table__right/currency/muted
            · .anlx-rank-badge--gold (warning) / --silver (text-tertiary) / --bronze (warning-dark) / --default (bg-tertiary)
          </div>
        </div>

        {/* Chart colors */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
            Chart colors — <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>--chart-1 … --chart-6</code> (cambian en dark mode)
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            {['--chart-1','--chart-2','--chart-3','--chart-4','--chart-5','--chart-6'].map((v, i) => (
              <div key={v} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-lg)', background: `var(${v})`, boxShadow: 'var(--shadow-sm)' }} />
                <code style={{ fontSize: 10, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>{v}</code>
                <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
                  {['primary','success','warning','error','info','accent'][i]}
                </span>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 16px', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-secondary)', fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'monospace', lineHeight: 1.8 }}>
            <strong style={{ color: 'var(--color-warning-dark)' }}>⚠ IMPORTANTE — SVG y CSS Variables</strong><br/>
            Los atributos SVG (fill=, stroke=) NO soportan CSS variables directamente.<br/>
            Recharts usa atributos SVG → usar <code style={{ color: 'var(--color-primary)' }}>getChartColor(n)</code> en lugar de <code style={{ color: 'var(--color-error)' }}>"var(--chart-n)"</code><br/>
            <br/>
            <strong>Uso correcto:</strong><br/>
            {'import { getChartColor, getChartColors } from "utils/chartColors";'}<br/>
            {'<Bar fill={getChartColor(1)} />  ← lee el hex computado del tema activo'}<br/>
            {'<Cell fill={getChartColors(6)[i]} />  ← array de 6 colores del tema'}<br/>
            <br/>
            <strong>CSS inline styles (no SVG):</strong> sí soportan var(--chart-n):<br/>
            {'<div style={{ borderLeft: "4px solid var(--chart-1)" }}>'}
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            SECCIÓN 20: TOKENS COMPLETOS
        ══════════════════════════════════════════════ */}
        <SectionDivider n="20" title="Referencia de Tokens" />

        <div style={{
          background: 'var(--color-bg-primary)', borderRadius: 12,
          border: '1px solid var(--color-border-secondary)',
          overflow: 'hidden', boxShadow: 'var(--shadow-xs)',
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr',
            padding: '10px 20px', background: 'var(--color-bg-tertiary)',
            borderBottom: '1px solid var(--color-border-primary)',
          }}>
            {['Token CSS', 'Light Mode', 'Dark Mode'].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</div>
            ))}
          </div>

          {/* Tokens list */}
          {[
            { group: 'Primario', tokens: [
              { name: '--color-primary', light: '#0F766E', dark: '#2DD4BF' },
              { name: '--color-primary-dark', light: '#115E59', dark: '#14B8A6' },
              { name: '--color-primary-light', light: '#14B8A6', dark: '#5EEAD4' },
              { name: '--color-primary-container', light: '#CCFBF1', dark: '#0D3D38' },
            ]},
            { group: 'Acento', tokens: [
              { name: '--color-accent', light: '#BE185D', dark: '#C084FC' },
              { name: '--color-accent-dark', light: '#9D174D', dark: '#A855F7' },
              { name: '--color-accent-light', light: '#EC4899', dark: '#E879F9' },
            ]},
            { group: 'Semánticos', tokens: [
              { name: '--color-success', light: '#059669', dark: '#34D399' },
              { name: '--color-warning', light: '#D97706', dark: '#FCD34D' },
              { name: '--color-error', light: '#DC2626', dark: '#F87171' },
              { name: '--color-info', light: '#0284C7', dark: '#38BDF8' },
            ]},
            { group: 'Fondos', tokens: [
              { name: '--color-bg-primary', light: '#FFFFFF', dark: '#0D1E1D' },
              { name: '--color-bg-secondary', light: '#F0FDFA', dark: '#071615' },
              { name: '--color-bg-tertiary', light: '#CCFBF1', dark: '#152A28' },
            ]},
            { group: 'Texto', tokens: [
              { name: '--color-text-primary', light: '#134E4A', dark: '#F0FDFA' },
              { name: '--color-text-secondary', light: '#1F6B64', dark: '#99F6E4' },
              { name: '--color-text-tertiary', light: '#5EADA5', dark: '#5EEAD4' },
              { name: '--color-text-disabled', light: '#9CA3AF', dark: '#2D6B65' },
            ]},
            { group: 'Bordes', tokens: [
              { name: '--color-border-primary', light: '#99F6E4', dark: '#214D49' },
              { name: '--color-border-secondary', light: '#CCFBF1', dark: '#152A28' },
            ]},
            { group: 'Espaciado', tokens: [
              { name: '--spacing-xs', light: '4px', dark: '4px' },
              { name: '--spacing-sm', light: '8px', dark: '8px' },
              { name: '--spacing-md', light: '16px', dark: '16px' },
              { name: '--spacing-lg', light: '24px', dark: '24px' },
              { name: '--spacing-xl', light: '32px', dark: '32px' },
            ]},
            { group: 'Radio', tokens: [
              { name: '--radius-sm', light: '4px', dark: '4px' },
              { name: '--radius-md', light: '6px', dark: '6px' },
              { name: '--radius-lg', light: '8px', dark: '8px' },
              { name: '--radius-xl', light: '12px', dark: '12px' },
              { name: '--radius-full', light: '9999px', dark: '9999px' },
            ]},
            { group: 'Tipografía', tokens: [
              { name: '--font-size-xs', light: '12px', dark: '12px' },
              { name: '--font-size-sm', light: '14px', dark: '14px' },
              { name: '--font-size-base', light: '16px', dark: '16px' },
              { name: '--font-size-lg', light: '18px', dark: '18px' },
              { name: '--font-size-2xl', light: '24px', dark: '24px' },
              { name: '--font-weight-semibold', light: '600', dark: '600' },
              { name: '--font-weight-bold', light: '700', dark: '700' },
            ]},
            { group: 'Transiciones', tokens: [
              { name: '--transition-fast', light: '150ms ease-in-out', dark: '150ms ease-in-out' },
              { name: '--transition-base', light: '200ms ease-in-out', dark: '200ms ease-in-out' },
              { name: '--transition-slow', light: '300ms ease-in-out', dark: '300ms ease-in-out' },
            ]},
            { group: 'Z-Index', tokens: [
              { name: '--z-dropdown', light: '1000', dark: '1000' },
              { name: '--z-modal-backdrop', light: '1040', dark: '1040' },
              { name: '--z-modal', light: '1050', dark: '1050' },
              { name: '--z-tooltip', light: '1070', dark: '1070' },
            ]},
          ].map(({ group, tokens }, gi) => (
            <React.Fragment key={group}>
              <div style={{
                padding: '8px 20px', background: 'var(--color-bg-secondary)',
                borderTop: gi > 0 ? '1px solid var(--color-border-secondary)' : 'none',
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{group}</span>
              </div>
              {tokens.map(({ name, light, dark }, ti) => (
                <div key={name} style={{
                  display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr',
                  padding: '9px 20px', alignItems: 'center',
                  borderTop: '1px solid var(--color-border-secondary)',
                  background: ti % 2 === 0 ? 'var(--color-bg-primary)' : 'var(--color-bg-secondary)',
                }}>
                  <code style={{ fontSize: 12, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>{name}</code>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {light.startsWith('#') && (
                      <div style={{ width: 14, height: 14, borderRadius: 3, background: light, border: '1px solid var(--color-border-primary)', flexShrink: 0 }} />
                    )}
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-mono)' }}>{light}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {dark.startsWith('#') && (
                      <div style={{ width: 14, height: 14, borderRadius: 3, background: dark, border: '1px solid var(--color-border-primary)', flexShrink: 0 }} />
                    )}
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-mono)' }}>{dark}</span>
                  </div>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>

        {/* ══════════════════════════════════════════════
            SECCIÓN 21: SIDEBAR DE NAVEGACIÓN
        ══════════════════════════════════════════════ */}
        <SectionDivider n="21" title="Sidebar de Navegación" />

        {(() => {
          const mainNav = [
            { Icon: LayoutDashboard,   label: 'Dashboard',       active: false },
            { Icon: Users,             label: 'Pacientes',        active: false },
            { Icon: CalendarDays,      label: 'Citas',            active: true  },
            { Icon: Syringe,           label: 'Servicios',        active: false },
            { Icon: UserCog,           label: 'Empleados',        active: false },
            { Icon: BadgeDollarSign,   label: 'Comisiones',       active: false },
            { Icon: BarChart3,         label: 'Analíticas',       active: false },
            { Icon: Palette,           label: 'Ficha de Estilos', active: false },
          ];
          const metaNav = [
            { Icon: CircleUser, label: 'Mi Perfil' },
            { Icon: Settings,   label: 'Configuración' },
          ];

          return (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {(['light', 'dark'] as const).map(theme => (
                <div key={theme}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                    {theme === 'light' ? '☀️ Light Mode' : '🌙 Dark Mode'}
                  </div>
                  <div data-theme={theme} style={{ borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--color-border-secondary)', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-primary)' }}>
                    {/* Header */}
                    <div style={{ padding: '16px 24px', background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>DermicaPro</div>
                    </div>

                    {/* User */}
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border-secondary)', background: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9999, background: 'var(--color-primary-alpha-20)', border: '2px solid var(--color-primary)', color: 'var(--color-primary)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>AD</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.25 }}>Admin DermicaPro</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>Administrador</div>
                      </div>
                    </div>

                    {/* Nav principal */}
                    <nav style={{ padding: '8px 0' }}>
                      {mainNav.map(({ Icon, label, active }) => (
                        <div key={label} style={{ padding: '2px 8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 6, background: active ? 'var(--color-primary-alpha-10)' : 'transparent', color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)', fontWeight: active ? 600 : 500, fontSize: 13, borderLeft: `2.5px solid ${active ? 'var(--color-primary)' : 'transparent'}`, cursor: 'default' }}>
                            <span style={{ width: 18, display: 'flex', alignItems: 'center', color: 'inherit', flexShrink: 0 }}><Icon size={16} strokeWidth={1.75} /></span>
                            {label}
                          </div>
                        </div>
                      ))}

                      {/* Divider */}
                      <div style={{ height: 1, background: 'var(--color-border-secondary)', margin: '6px 8px' }} />

                      {/* Meta nav */}
                      {metaNav.map(({ Icon, label }) => (
                        <div key={label} style={{ padding: '2px 8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', borderRadius: 6, color: 'var(--color-text-tertiary)', fontSize: 12, fontWeight: 500, borderLeft: '2.5px solid transparent', cursor: 'default' }}>
                            <span style={{ width: 18, display: 'flex', alignItems: 'center', color: 'inherit', flexShrink: 0 }}><Icon size={15} strokeWidth={1.75} /></span>
                            {label}
                          </div>
                        </div>
                      ))}
                    </nav>

                    {/* Footer */}
                    <div style={{ padding: '10px 12px', borderTop: '1px solid var(--color-border-secondary)', background: 'var(--color-bg-secondary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ width: '100%', padding: '8px 12px', color: 'var(--color-error)', background: 'transparent', border: '1.5px solid var(--color-error)', borderRadius: 6, fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'default' }}>
                        <LogOut size={15} strokeWidth={2} />
                        Cerrar Sesión
                      </div>
                      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-text-disabled)', fontFamily: 'var(--font-family-mono)' }}>v1.0.0</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Props API */}
        <div style={{ marginTop: 24, background: 'var(--color-bg-primary)', borderRadius: 10, border: '1px solid var(--color-border-secondary)', padding: '20px 24px', boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Props — &lt;Sidebar /&gt;</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <PropRow name="user.firstName / lastName" type="string — nombre e iniciales del avatar" />
            <PropRow name="user.roleDisplay" type="string — rol bajo el nombre (ej. Administrador)" />
            <PropRow name="navItems" type="NavItem[] — filtrados por rol; meta:true va en sección inferior separada por divisor" />
            <PropRow name="onLogout" type="() => void — callback del botón ghost de Cerrar Sesión" />
          </div>
          <div style={{ marginTop: 14, fontSize: 12, color: 'var(--color-text-tertiary)', lineHeight: 1.6 }}>
            Íconos: <strong>Lucide React</strong> — monoline SVG, <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>size=18 strokeWidth=1.75</code>. Estado activo via clase <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>.active</code> de React Router NavLink + <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-family-mono)' }}>border-left: 2.5px solid var(--color-primary)</code>.
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 56, paddingTop: 24,
          borderTop: '1px solid var(--color-border-secondary)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>DermicaPro Design System v2.0</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              Material Design 3 · Teal + Rose-Mauve · WCAG AA · Actualizado: 06 May 2026
            </div>
          </div>
          <button
            onClick={() => setPreviewTheme(t => t === 'light' ? 'dark' : 'light')}
            style={{
              padding: '8px 18px', borderRadius: 999, border: '1.5px solid var(--color-primary)',
              background: 'var(--color-primary-alpha-10)', color: 'var(--color-primary)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {isLight ? '🌙 Cambiar a Dark' : '☀️ Cambiar a Light'}
          </button>
        </div>
      </div>
    </div>
  );
};

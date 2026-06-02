import React, { useState } from 'react';
import '../styles/appointments-page.css';
import { DatePicker } from '../components/DatePicker';
import { ServiceSelector } from '../components/ServiceSelector';

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
              patient_id: "a1b2c3d4" · invoice_status: "partial"
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

        {/* Estado de facturas */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
            Estados de facturas (InvoiceStatus) y pagos
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
              title: 'Error al guardar la factura',
              msg: 'El monto total no puede ser menor al pago registrado. Revisa los datos e intenta nuevamente.',
              color: 'var(--color-error-dark)', bg: 'var(--color-error-alpha-10)', border: 'var(--color-error)',
              iconBg: 'var(--color-error)',
            },
            {
              type: 'warning', icon: '⚠',
              title: 'Pagos pendientes',
              msg: 'Este paciente tiene S/ 850.00 en facturas pendientes. Se recomienda verificar antes de agendar.',
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
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-tertiary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: 11 }}>Card Básica</div>
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
              { status: 'reserved',    label: 'Reservada',   patient: 'Ana Torres García',  initials: 'AT', service: 'HIFU 12D Ultraformer',  date: 'mar, 10 jun.', time: '10:00 a.m.', duration: 60, payment: 'pending', amount: 500.00, createdBy: 'Admin' },
              { status: 'in_progress', label: 'En Atención', patient: 'Luis Pérez Morales', initials: 'LP', service: 'Pico Láser 532nm',       date: 'mar, 10 jun.', time: '11:30 a.m.', duration: 90, payment: 'paid',    amount: 320.00, createdBy: 'Ventas' },
              { status: 'attended',    label: 'Atendida',    patient: 'María G. Ríos',      initials: 'MG', service: 'Hollywood Peel Carbon',  date: 'lun, 9 jun.',  time: '09:00 a.m.', duration: 60, payment: 'paid',    amount: 180.00, createdBy: 'Enfermera' },
              { status: 'cancelled',   label: 'Cancelada',   patient: 'Carlos Huamán',      initials: 'CH', service: 'Bioestimulación',        date: 'vie, 6 jun.',  time: '03:00 p.m.', duration: 45, payment: 'none',    amount: 0,      createdBy: 'Admin' },
              { status: 'no_show',     label: 'No asistió',  patient: 'Rosa Llontop',       initials: 'RL', service: 'Facial Derma Plus',      date: 'jue, 5 jun.',  time: '04:30 p.m.', duration: 60, payment: 'none',    amount: 0,      createdBy: 'Ventas' },
            ].map(card => (
              <div key={card.status} className="appointment-card" style={{ cursor: 'default' }}>
                {/* Header */}
                <div className="card-header-row">
                  <div className="patient-avatar">{card.initials}</div>
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
            SECCIÓN 14: TOKENS COMPLETOS
        ══════════════════════════════════════════════ */}
        <SectionDivider n="14" title="Referencia de Tokens" />

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

import React from 'react';
import { Check } from 'lucide-react';

/** Panel de marca a la izquierda y formulario a la derecha: login y recuperar contraseña. */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="login-page">
      {/* ── Panel de marca (izquierda) ── */}
      <div className="login-brand-panel">
        <img src="/logo-mark-256.png" alt="" className="login-brand-watermark" aria-hidden="true" />

        <div className="login-brand-content">
          <div className="login-brand-logo">
            <img src="/logo-mark-256.png" alt="" className="login-brand-mark" />
            <span className="login-brand-text">
              <span className="login-brand-name">DermicaPro</span>
              <span className="login-brand-tag">Skincare Clinic</span>
            </span>
          </div>
          <p className="login-brand-tagline">
            Gestión integral para tu clínica de estética y dermatología
          </p>
          <ul className="login-brand-features">
            <li><span className="login-feature-icon" aria-hidden="true"><Check size={16} strokeWidth={2.5} /></span>Historial clínico y seguimiento de pacientes</li>
            <li><span className="login-feature-icon" aria-hidden="true"><Check size={16} strokeWidth={2.5} /></span>Agenda y gestión de citas en tiempo real</li>
            <li><span className="login-feature-icon" aria-hidden="true"><Check size={16} strokeWidth={2.5} /></span>Órdenes de pago y comisiones automáticas</li>
            <li><span className="login-feature-icon" aria-hidden="true"><Check size={16} strokeWidth={2.5} /></span>Analíticas y reportes ejecutivos</li>
          </ul>
        </div>

        <div className="login-brand-footer">
          <span>DermicaPro</span>
          <span>Trujillo, Perú</span>
        </div>
      </div>

      {/* ── Panel derecho ── */}
      <div className="login-form-panel">
        <div className="login-form-container">
          <div className="login-mobile-logo">
            <img src="/logo-mark-64.png" alt="" width={28} height={28} />
            <span>DermicaPro</span>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}

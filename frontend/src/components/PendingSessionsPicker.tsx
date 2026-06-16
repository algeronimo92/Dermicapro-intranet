import React from 'react';
import { Order } from '../types';

interface SessionInForm {
  orderId?: string;
  sessionNumber?: number;
  appointmentServiceId?: string;
}

interface PendingSessionsPickerProps {
  orders: Order[];
  sessionsInForm: SessionInForm[];
  onAdd: (order: Order) => void;
}

const PendingSessionsPicker: React.FC<PendingSessionsPickerProps> = ({
  orders,
  sessionsInForm,
  onAdd,
}) => {
  if (orders.length === 0) return null;

  return (
    <div className="glass-card">
      <div className="card-header">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="card-icon">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <h2>Sesiones Pendientes del Paciente</h2>
      </div>
      <p className="services-subtitle">
        Haz clic en "Agregar" para incluir una sesión de estos tratamientos en esta cita
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
        {orders.map(order => {
          const allAs = order.appointmentServices || [];

          const active    = allAs.filter((a: any) => {
            const s = a.appointment?.status;
            return s === 'attended' || s === 'reserved' || s === 'in_progress';
          });
          const attended  = active.filter((a: any) => a.appointment?.status === 'attended').length;
          const scheduled = active.length;
          const total     = order.totalSessions;

          const inFormCount    = sessionsInForm.filter(s => s.orderId === order.id && !s.appointmentServiceId).length;
          const free           = total - scheduled - inFormCount;
          const canAdd         = free > 0;
          const nextSessionNum = scheduled + inFormCount + 1;

          return (
            <div
              key={order.id}
              className="psp-row"
              style={{
                background:    canAdd ? 'var(--color-bg-secondary)' : 'var(--color-bg-tertiary)',
                border:        `1.5px solid ${inFormCount > 0 ? 'var(--color-primary)' : 'var(--color-border-primary)'}`,
                opacity:       canAdd ? 1 : 0.6,
              }}
            >
              {/* Info + progress dots */}
              <div className="psp-info">
                <div className="psp-name">
                  {order.service?.name || 'Servicio'}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {Array.from({ length: total }).map((_, i) => {
                      const isAttended  = i < attended;
                      const isScheduled = i >= attended  && i < scheduled;
                      const isInForm    = i >= scheduled && i < scheduled + inFormCount;

                      const bg     = isAttended  ? 'var(--color-success)'
                                   : isScheduled ? 'var(--color-warning)'
                                   : isInForm    ? 'var(--color-primary)'
                                   : 'transparent';
                      const border = isAttended  ? 'var(--color-success)'
                                   : isScheduled ? 'var(--color-warning)'
                                   : isInForm    ? 'var(--color-primary)'
                                   : 'var(--color-border-primary)';
                      const tooltip = isAttended  ? `Sesión ${i+1} — completada`
                                    : isScheduled ? `Sesión ${i+1} — ya agendada`
                                    : isInForm    ? `Sesión ${i+1} — en esta cita`
                                    : `Sesión ${i+1} — libre`;

                      return (
                        <div key={i} title={tooltip} style={{
                          width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                          background: bg, border: `1.5px solid ${border}`,
                        }} />
                      );
                    })}
                  </div>

                  <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                    {attended}/{total} completadas
                    {scheduled > attended ? ` · ${scheduled - attended} reservada${scheduled - attended > 1 ? 's' : ''}` : ''}
                    {free > 0 ? ` · ${free} libre${free > 1 ? 's' : ''}` : ''}
                  </span>
                </div>
              </div>

              {/* Action */}
              {canAdd ? (
                <button
                  type="button"
                  onClick={() => onAdd(order)}
                  className="psp-add-btn"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                  Agregar sesión {nextSessionNum}
                </button>
              ) : (
                <span className="psp-done-badge" style={{
                  color:      inFormCount > 0 ? 'var(--color-success-dark)' : 'var(--color-text-tertiary)',
                  background: inFormCount > 0 ? 'var(--color-success-alpha-10)' : 'var(--color-bg-tertiary)',
                  border:    `1px solid ${inFormCount > 0 ? 'var(--color-success)' : 'var(--color-border-secondary)'}`,
                }}>
                  {inFormCount > 0 ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                      Completado
                    </>
                  ) : 'Todas agendadas'}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PendingSessionsPicker;

import React from 'react';
import { Order } from '../types';

interface SessionInForm {
  orderId?: string;
  sessionNumber?: number;
  appointmentServiceId?: string;
}

interface PendingSessionsPickerProps {
  /** Active orders with pending sessions for the selected patient */
  orders: Order[];
  /** Sessions currently staged in the appointment form */
  sessionsInForm: SessionInForm[];
  /** Called when the user clicks "Agregar sesión N" for an order */
  onAdd: (order: Order) => void;
}

/**
 * Shows the patient's active treatment packages with their progress and
 * a one-click button to add the next available session to the appointment.
 *
 * Session slot rules:
 *   occupied  = attended | reserved | in_progress   (slot taken)
 *   free      = cancelled | no_show                 (slot returned)
 */
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

          // Occupied slots: attended + reserved + in_progress
          // cancelled and no_show free the slot
          const active    = allAs.filter((a: any) => {
            const s = a.appointment?.status;
            return s === 'attended' || s === 'reserved' || s === 'in_progress';
          });
          const attended  = active.filter((a: any) => a.appointment?.status === 'attended').length;
          const scheduled = active.length;

          const total = order.totalSessions;

          // New sessions being added in this form (not yet saved to DB)
          const inFormCount = sessionsInForm.filter(
            s => s.orderId === order.id && !s.appointmentServiceId
          ).length;

          const free           = total - scheduled - inFormCount;
          const canAdd         = free > 0;
          const nextSessionNum = scheduled + inFormCount + 1;

          return (
            <div key={order.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 'var(--spacing-md)',
              padding: 'var(--spacing-md)',
              background: canAdd ? 'var(--color-bg-secondary)' : 'var(--color-bg-tertiary)',
              border: `1.5px solid ${inFormCount > 0 ? 'var(--color-primary)' : 'var(--color-border-primary)'}`,
              borderRadius: 'var(--radius-lg)',
              opacity: canAdd ? 1 : 0.6,
            }}>
              {/* Info + progress dots */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 6 }}>
                  {order.service?.name || 'Servicio'}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Dots: 🟢 attended | 🟡 reserved elsewhere | 🔵 in this form | ⚪ free */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {Array.from({ length: total }).map((_, i) => {
                      const isAttended  = i < attended;
                      const isScheduled = i >= attended   && i < scheduled;
                      const isInForm    = i >= scheduled  && i < scheduled + inFormCount;

                      const bg = isAttended  ? 'var(--color-success)'
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

              {/* Action button */}
              {canAdd ? (
                <button
                  type="button"
                  onClick={() => onAdd(order)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 'var(--radius-lg)',
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                    border: 'none', color: 'var(--color-on-primary)',
                    fontSize: 'var(--font-size-sm)', fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                  Agregar sesión {nextSessionNum}
                </button>
              ) : (
                <span style={{
                  fontSize: 'var(--font-size-xs)', fontWeight: 600,
                  padding: '6px 12px', borderRadius: 'var(--radius-lg)', flexShrink: 0,
                  color:      inFormCount > 0 ? 'var(--color-success-dark)' : 'var(--color-text-tertiary)',
                  background: inFormCount > 0 ? 'var(--color-success-alpha-10)' : 'var(--color-bg-tertiary)',
                  border:    `1px solid ${inFormCount > 0 ? 'var(--color-success)' : 'var(--color-border-secondary)'}`,
                }}>
                  {inFormCount > 0 ? '✓ Completado' : 'Todas agendadas'}
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

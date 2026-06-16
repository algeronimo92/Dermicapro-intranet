import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatientFinancials } from '../hooks/usePatientFinancials';
import { AddCreditModal } from './AddCreditModal';
import { formatDate } from '../utils/dateUtils';
import '../styles/patient-debt-summary.css';

interface Props {
  patientId: string;
  patientName?: string;
  /** compact: 3 cards only. full: cards + cobros pendientes list. */
  variant: 'compact' | 'full';
  /** Called after credit is added so the parent can refresh its own state. */
  onCreditAdded?: () => void;
}

export const PatientDebtSummary: React.FC<Props> = ({
  patientId,
  patientName = 'Paciente',
  variant,
  onCreditAdded,
}) => {
  const navigate = useNavigate();
  const financials = usePatientFinancials(patientId);
  const [showCreditModal, setShowCreditModal] = useState(false);

  const {
    totalPending,
    totalPaid,
    accountBalance,
    pendingPaymentOrders,
    ordersWithoutPaymentOrder,
    loading,
  } = financials;

  // ── Loading skeleton ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="pds-cards">
        {[0, 1, 2].map((i) => (
          <div key={i} className="pds-card">
            <div className="pds-skeleton" style={{ height: 12, width: '60%', marginBottom: 12 }} />
            <div className="pds-skeleton" style={{ height: 28, width: '80%', marginBottom: 8 }} />
            <div className="pds-skeleton" style={{ height: 10, width: '50%' }} />
          </div>
        ))}
      </div>
    );
  }

  const debtState = totalPending > 0 ? 'debt-active' : 'debt-clear';
  const paidState = totalPaid > 0 ? 'paid-active' : 'paid-empty';
  const creditState = accountBalance > 0 ? 'credit-active' : 'credit-empty';

  const totalCobros = pendingPaymentOrders.length + ordersWithoutPaymentOrder.length;

  return (
    <>
      {/* ── 3 CARDS ─────────────────────────────────────────────────────── */}
      <div className="pds-cards">

        {/* Deuda Pendiente */}
        <div
          className={`pds-card pds-card--${debtState} ${totalPending > 0 ? 'pds-card--clickable' : ''}`}
          onClick={() => totalPending > 0 && navigate(`/patients/${patientId}/payment-orders`)}
        >
          <div className="pds-card__header">
            <span className={`pds-card__label pds-card__label--${debtState}`}>Deuda pendiente</span>
            <span className={`pds-card__icon pds-card__icon--${debtState}`}>
              {totalPending > 0 ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M1 7h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </span>
          </div>
          {totalPending > 0 ? (
            <>
              <div className={`pds-card__amount pds-card__amount--${debtState}`}>
                S/. {totalPending.toFixed(2)}
              </div>
              <div className={`pds-card__sub pds-card__sub--${debtState}`}>
                {pendingPaymentOrders.length} orden{pendingPaymentOrders.length !== 1 ? 'es' : ''} de pago · clic para gestionar →
              </div>
            </>
          ) : (
            <>
              <div className={`pds-card__amount pds-card__amount--${debtState}`}>Al día ✓</div>
              <div className={`pds-card__sub pds-card__sub--${debtState}`}>Sin deuda pendiente</div>
            </>
          )}
        </div>

        {/* Total Pagado */}
        <div className="pds-card">
          <div className="pds-card__header">
            <span className={`pds-card__label pds-card__label--${paidState}`}>Total pagado</span>
            <span className={`pds-card__icon pds-card__icon--${paidState}`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.6"/>
                <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </div>
          <div className={`pds-card__amount pds-card__amount--${paidState}`}>
            S/. {totalPaid.toFixed(2)}
          </div>
          <div className={`pds-card__sub pds-card__sub--${paidState}`}>
            {totalPaid > 0 ? `En ${financials.paidCount + financials.partialCount + financials.pendingCount} orden${financials.totalPaymentOrders !== 1 ? 'es' : ''} de pago` : 'Sin pagos registrados'}
          </div>
        </div>

        {/* Saldo a Favor */}
        <div
          className={`pds-card pds-card--clickable ${accountBalance > 0 ? 'pds-card--credit-active' : ''}`}
          onClick={() => setShowCreditModal(true)}
        >
          <div className="pds-card__header">
            <span className={`pds-card__label pds-card__label--${creditState}`}>Saldo a favor</span>
            <span className={`pds-card__icon pds-card__icon--${creditState}`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
                <path d="M5 8h6M8 6v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </span>
          </div>
          <div className={`pds-card__amount pds-card__amount--${creditState}`}>
            S/. {accountBalance.toFixed(2)}
          </div>
          <div className={`pds-card__sub pds-card__sub--${creditState}`}>
            {accountBalance > 0 ? 'Clic para agregar más' : 'Clic para agregar saldo'}
          </div>
        </div>
      </div>

      {/* ── COBROS PENDIENTES (solo variant full) ───────────────────────── */}
      {variant === 'full' && (
        <div className="pds-cobros">
          <div className="pds-cobros__header">
            <div className="pds-cobros__title">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M1 7h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Cobros Pendientes
              {totalCobros > 0 && (
                <span className="pds-cobros__badge">{totalCobros}</span>
              )}
            </div>
            {totalCobros > 0 && (
              <button
                className="pds-cobros__manage"
                onClick={() => navigate(`/patients/${patientId}/payment-orders`)}
              >
                Gestionar →
              </button>
            )}
          </div>

          <div className="pds-cobros__body">
            {totalCobros === 0 ? (
              <div className="pds-cobros__empty">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Sin cobros pendientes
              </div>
            ) : (
              <>
                {/* Órdenes de pago pendientes / parciales */}
                {pendingPaymentOrders.slice(0, 3).map((po) => {
                  const pct = po.totalAmount > 0 ? Math.round((po.totalPaid / po.totalAmount) * 100) : 0;
                  return (
                    <div
                      key={po.id}
                      className="pds-po-row"
                      onClick={() => navigate(`/payment-orders/${po.id}`)}
                    >
                      <div className="pds-po-row__top">
                        <div>
                          <div className="pds-po-row__meta">
                            OP #{po.id.slice(0, 8).toUpperCase()} · {formatDate(po.createdAt)}
                          </div>
                          <span className={`pds-po-row__status pds-po-row__status--${po.status}`}>
                            {po.status === 'pending' ? 'Sin pagar' : 'Pago parcial'}
                          </span>
                        </div>
                        <span className="pds-po-row__amount">S/. {po.balance.toFixed(2)}</span>
                      </div>
                      <div className="pds-po-row__bar-track">
                        <div className="pds-po-row__bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}

                {/* Órdenes sin orden de pago */}
                {ordersWithoutPaymentOrder.slice(0, 3).map((o) => (
                  <div
                    key={o.id}
                    className="pds-noopo-row"
                    onClick={() => navigate(`/patients/${patientId}/payment-orders`)}
                  >
                    <div>
                      <div className="pds-noopo-row__meta">
                        {o.service?.name || 'Servicio'} · {o.totalSessions} sesión{o.totalSessions !== 1 ? 'es' : ''}
                      </div>
                      <span className="pds-noopo-row__tag">Sin orden de pago</span>
                    </div>
                    <span className="pds-noopo-row__amount">S/. {o.finalPrice.toFixed(2)}</span>
                  </div>
                ))}

                {totalCobros > 6 && (
                  <button
                    className="pds-cobros__see-all"
                    onClick={() => navigate(`/patients/${patientId}/payment-orders`)}
                  >
                    Ver todos ({totalCobros}) →
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL AGREGAR CRÉDITO ────────────────────────────────────────── */}
      <AddCreditModal
        isOpen={showCreditModal}
        onClose={() => setShowCreditModal(false)}
        patientId={patientId}
        patientName={patientName}
        currentBalance={accountBalance}
        onSuccess={() => {
          setShowCreditModal(false);
          financials.refresh();
          onCreditAdded?.();
        }}
      />
    </>
  );
};

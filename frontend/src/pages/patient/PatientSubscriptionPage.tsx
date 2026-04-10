import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { formatSubscriptionDate } from '../../services/subscription.service';
import {
  PlanCard,
  SubscriptionStatusBadge,
  CancelSubscriptionModal,
} from '../../components/subscription';
import NiubizPaymentForm from '../../components/subscription/NiubizPaymentForm';
import '../../styles/PatientSubscription.css';

const PatientSubscriptionPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const {
    subscription,
    plans,
    isLoading,
    error,
    hasActiveSubscription,
    currentPlan,
    daysUntilRenewal,
    sessionsRemaining,
    discountPercentage,
    paymentSession,
    startPayment,
    completePayment,
    cancelSubscription,
    reactivateSubscription,
    refreshSubscription,
    clearPaymentSession,
    clearError,
  } = useSubscription();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check for success/cancel URL params from payment redirect
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    const timeout = searchParams.get('timeout');

    if (success === 'true') {
      setSuccessMessage('¡Suscripción activada exitosamente! Bienvenido/a al programa.');
      refreshSubscription();
      // Clear URL params
      window.history.replaceState({}, '', '/patient/subscription');
    } else if (canceled === 'true') {
      setSuccessMessage(null);
      window.history.replaceState({}, '', '/patient/subscription');
    } else if (timeout === 'true') {
      clearError();
      window.history.replaceState({}, '', '/patient/subscription');
    }
  }, [searchParams, refreshSubscription, clearError]);

  // Show payment form when session is created
  useEffect(() => {
    if (paymentSession) {
      setShowPaymentForm(true);
    }
  }, [paymentSession]);

  const handleSelectPlan = async (planId: string) => {
    try {
      await startPayment(planId);
    } catch {
      // Error is handled in context
    }
  };

  const handlePaymentSuccess = async (transactionToken: string) => {
    try {
      await completePayment(transactionToken);
      setShowPaymentForm(false);
      setSuccessMessage('¡Suscripción activada exitosamente! Bienvenido/a al programa.');
    } catch {
      // Error is handled in context
    }
  };

  const handlePaymentCancel = () => {
    setShowPaymentForm(false);
    clearPaymentSession();
  };

  const handlePaymentError = (errorMsg: string) => {
    console.error('Payment error:', errorMsg);
    setShowPaymentForm(false);
    clearPaymentSession();
  };

  const handleCancelSubscription = async (reason?: string) => {
    await cancelSubscription(reason);
    setShowCancelModal(false);
    setSuccessMessage('Suscripción cancelada. Mantendrás acceso hasta el fin del período.');
  };

  const handleReactivate = async () => {
    try {
      await reactivateSubscription();
      setSuccessMessage('¡Suscripción reactivada exitosamente!');
    } catch {
      // Error is handled in context
    }
  };

  // Show payment form modal
  if (showPaymentForm && paymentSession) {
    return (
      <div className="patient-subscription">
        <div className="patient-subscription__header">
          <h1 className="patient-subscription__title">Completar Pago</h1>
          <p className="patient-subscription__subtitle">
            Ingresa los datos de tu tarjeta para activar tu suscripción
          </p>
        </div>

        <NiubizPaymentForm
          session={paymentSession}
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
          onError={handlePaymentError}
        />
      </div>
    );
  }

  return (
    <div className="patient-subscription">
      <div className="patient-subscription__header">
        <h1 className="patient-subscription__title">Mi Suscripción</h1>
        <p className="patient-subscription__subtitle">
          Obtén beneficios exclusivos con nuestros planes de membresía
        </p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="patient-subscription__alert patient-subscription__alert--success">
          <span>✓</span>
          {successMessage}
          <button onClick={() => setSuccessMessage(null)}>×</button>
        </div>
      )}

      {error && (
        <div className="patient-subscription__alert patient-subscription__alert--error">
          <span>⚠</span>
          {error}
          <button onClick={clearError}>×</button>
        </div>
      )}

      {/* Current Subscription Card */}
      {hasActiveSubscription && subscription && currentPlan && (
        <div className="current-subscription">
          <div className="current-subscription__header">
            <div>
              <h2 className="current-subscription__title">
                {currentPlan.displayName}
              </h2>
              <SubscriptionStatusBadge
                status={subscription.status}
                cancelAtPeriodEnd={subscription.cancelAtPeriodEnd}
              />
            </div>
            <div className="current-subscription__price">
              {currentPlan.priceFormatted}
              <span>/mes</span>
            </div>
          </div>

          <div className="current-subscription__stats">
            <div className="current-subscription__stat">
              <span className="current-subscription__stat-label">
                Descuento en servicios
              </span>
              <span className="current-subscription__stat-value">
                {discountPercentage}%
              </span>
            </div>

            {currentPlan.includedSessions > 0 && (
              <div className="current-subscription__stat">
                <span className="current-subscription__stat-label">
                  Sesiones restantes
                </span>
                <span className="current-subscription__stat-value">
                  {sessionsRemaining} / {currentPlan.includedSessions}
                </span>
              </div>
            )}

            {daysUntilRenewal !== null && (
              <div className="current-subscription__stat">
                <span className="current-subscription__stat-label">
                  {subscription.cancelAtPeriodEnd ? 'Finaliza en' : 'Renovación en'}
                </span>
                <span className="current-subscription__stat-value">
                  {daysUntilRenewal} días
                </span>
              </div>
            )}

            <div className="current-subscription__stat">
              <span className="current-subscription__stat-label">
                Período actual
              </span>
              <span className="current-subscription__stat-value current-subscription__stat-value--small">
                {formatSubscriptionDate(subscription.currentPeriodStart)} -{' '}
                {formatSubscriptionDate(subscription.currentPeriodEnd)}
              </span>
            </div>
          </div>

          <div className="current-subscription__actions">
            {subscription.cancelAtPeriodEnd ? (
              <button
                className="current-subscription__action current-subscription__action--success"
                onClick={handleReactivate}
                disabled={isLoading}
              >
                {isLoading ? 'Procesando...' : 'Reactivar suscripción'}
              </button>
            ) : (
              <button
                className="current-subscription__action current-subscription__action--danger"
                onClick={() => setShowCancelModal(true)}
                disabled={isLoading}
              >
                Cancelar suscripción
              </button>
            )}
          </div>

          {subscription.cancelAtPeriodEnd && (
            <p className="current-subscription__cancel-notice">
              Tu suscripción se cancelará el{' '}
              <strong>{formatSubscriptionDate(subscription.currentPeriodEnd)}</strong>.
              Hasta entonces, seguirás disfrutando de todos los beneficios.
            </p>
          )}
        </div>
      )}

      {/* Plans Section */}
      <div className="plans-section">
        <h2 className="plans-section__title">
          {hasActiveSubscription ? 'Cambiar de plan' : 'Elige tu plan'}
        </h2>
        <p className="plans-section__description">
          Todos los planes incluyen beneficios exclusivos y se renuevan mensualmente.
        </p>

        {isLoading && !plans.length ? (
          <div className="plans-section__loading">Cargando planes...</div>
        ) : (
          <div className="plans-grid">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrentPlan={currentPlan?.id === plan.id}
                isLoading={isLoading}
                onSelect={handleSelectPlan}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAQ Section */}
      <div className="subscription-faq">
        <h3 className="subscription-faq__title">Preguntas frecuentes</h3>

        <div className="subscription-faq__item">
          <h4>¿Cómo funciona la suscripción?</h4>
          <p>
            Al suscribirte, se te cobrará mensualmente de forma automática.
            Puedes cancelar en cualquier momento y mantendrás acceso hasta el fin
            del período pagado.
          </p>
        </div>

        <div className="subscription-faq__item">
          <h4>¿Qué métodos de pago aceptan?</h4>
          <p>
            Aceptamos tarjetas de crédito y débito (Visa, Mastercard, American Express).
            Los pagos son procesados de forma segura por Niubiz.
          </p>
        </div>

        <div className="subscription-faq__item">
          <h4>¿Puedo cambiar de plan?</h4>
          <p>
            Sí, puedes cambiar de plan en cualquier momento. El cambio se aplicará
            en tu próximo ciclo de facturación.
          </p>
        </div>

        <div className="subscription-faq__item">
          <h4>¿Cómo uso mis sesiones incluidas?</h4>
          <p>
            Las sesiones incluidas se aplican automáticamente cuando reservas una cita.
            Se resetean cada mes en tu fecha de renovación.
          </p>
        </div>
      </div>

      {/* Cancel Modal */}
      <CancelSubscriptionModal
        isOpen={showCancelModal}
        periodEnd={subscription?.currentPeriodEnd || null}
        isLoading={isLoading}
        onCancel={() => setShowCancelModal(false)}
        onConfirm={handleCancelSubscription}
      />
    </div>
  );
};

export default PatientSubscriptionPage;

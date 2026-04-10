import React from 'react';
import { SubscriptionPlan } from '../../services/subscription.service';
import './PlanCard.css';

interface PlanCardProps {
  plan: SubscriptionPlan;
  isCurrentPlan?: boolean;
  isLoading?: boolean;
  onSelect: (planId: string) => void;
}

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  isCurrentPlan = false,
  isLoading = false,
  onSelect,
}) => {
  const isPro = plan.tier === 'pro';

  return (
    <div className={`plan-card ${isPro ? 'plan-card--pro' : ''} ${isCurrentPlan ? 'plan-card--current' : ''}`}>
      {isPro && <div className="plan-card__badge">Recomendado</div>}
      {isCurrentPlan && <div className="plan-card__current-badge">Tu plan actual</div>}

      <div className="plan-card__header">
        <h3 className="plan-card__name">{plan.displayName}</h3>
        <p className="plan-card__description">{plan.description}</p>
      </div>

      <div className="plan-card__price">
        <span className="plan-card__price-amount">{plan.priceFormatted}</span>
        <span className="plan-card__price-period">/ mes</span>
      </div>

      <ul className="plan-card__benefits">
        {plan.discountPercentage > 0 && (
          <li className="plan-card__benefit">
            <span className="plan-card__benefit-icon">✓</span>
            <span>{plan.discountPercentage}% de descuento en todos los servicios</span>
          </li>
        )}

        {plan.includedSessions > 0 && (
          <li className="plan-card__benefit">
            <span className="plan-card__benefit-icon">✓</span>
            <span>{plan.includedSessions} sesiones incluidas al mes</span>
          </li>
        )}

        {plan.priorityBooking && (
          <li className="plan-card__benefit">
            <span className="plan-card__benefit-icon">✓</span>
            <span>Prioridad en reservas de citas</span>
          </li>
        )}

        {plan.features && Object.entries(plan.features).map(([key, value]) =>
          value ? (
            <li key={key} className="plan-card__benefit">
              <span className="plan-card__benefit-icon">✓</span>
              <span>{formatFeature(key, value)}</span>
            </li>
          ) : null
        )}
      </ul>

      <button
        className={`plan-card__button ${isPro ? 'plan-card__button--pro' : ''}`}
        onClick={() => onSelect(plan.id)}
        disabled={isCurrentPlan || isLoading}
      >
        {isLoading ? (
          'Procesando...'
        ) : isCurrentPlan ? (
          'Plan actual'
        ) : (
          'Suscribirse'
        )}
      </button>
    </div>
  );
};

// Helper function to format feature names
function formatFeature(key: string, value: unknown): string {
  const featureLabels: Record<string, string> = {
    exclusiveContent: 'Acceso a contenido exclusivo',
    freeConsultations: `${value} consultas gratuitas`,
    prioritySupport: 'Soporte prioritario',
    earlyAccess: 'Acceso anticipado a nuevos servicios',
  };

  return featureLabels[key] || `${key}: ${value}`;
}

export default PlanCard;

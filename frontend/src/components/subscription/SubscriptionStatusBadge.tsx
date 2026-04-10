import React from 'react';
import { Subscription, getStatusLabel, getStatusColor } from '../../services/subscription.service';
import './SubscriptionStatusBadge.css';

interface SubscriptionStatusBadgeProps {
  status: Subscription['status'];
  cancelAtPeriodEnd?: boolean;
}

const SubscriptionStatusBadge: React.FC<SubscriptionStatusBadgeProps> = ({
  status,
  cancelAtPeriodEnd = false,
}) => {
  const color = getStatusColor(status);
  const label = cancelAtPeriodEnd && status === 'active'
    ? 'Cancela pronto'
    : getStatusLabel(status);

  const effectiveColor = cancelAtPeriodEnd && status === 'active' ? 'warning' : color;

  return (
    <span className={`subscription-status-badge subscription-status-badge--${effectiveColor}`}>
      <span className="subscription-status-badge__dot"></span>
      {label}
    </span>
  );
};

export default SubscriptionStatusBadge;

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn(
    'Warning: STRIPE_SECRET_KEY is not set. Stripe functionality will not work.'
  );
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  typescript: true,
});

export const STRIPE_CONFIG = {
  currency: 'pen', // Peruvian Sol
  successUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/patient/subscription?success=true`,
  cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/patient/subscription?canceled=true`,
  customerPortalReturnUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/patient/subscription`,
} as const;

export default stripe;

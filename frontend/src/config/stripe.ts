import { loadStripe } from '@stripe/stripe-js';

// Load Stripe.js with your publishable key
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.warn(
    'Warning: VITE_STRIPE_PUBLISHABLE_KEY is not set. Stripe functionality will not work.'
  );
}

export const stripePromise = loadStripe(stripePublishableKey || '');

export default stripePromise;

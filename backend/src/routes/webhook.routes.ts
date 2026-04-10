import { Router } from 'express';
import express from 'express';
import { handleStripeWebhook } from '../controllers/webhook.controller';

const router = Router();

// IMPORTANT: Stripe webhooks require raw body for signature verification
// This middleware must be applied BEFORE express.json()
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

export default router;

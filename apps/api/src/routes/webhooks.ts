import { Router } from 'express';
import { handleStripeWebhook } from './billing';

const router = Router();

// Stripe webhook (raw body middleware applied in index.ts)
router.post('/stripe', handleStripeWebhook);

export default router;

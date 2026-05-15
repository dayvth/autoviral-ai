import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../lib/logger';

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new AppError(503, 'Billing not configured');
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}
const router = Router();

// POST /api/billing/checkout — create Stripe checkout session
router.post('/checkout', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { plan } = req.body;
    const priceId = plan === 'PRO' ? process.env.STRIPE_PRICE_PRO : process.env.STRIPE_PRICE_BUSINESS;
    if (!priceId) throw new AppError(400, 'Invalid plan');

    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await getStripe().customers.create({ email: user.email, name: user.name ?? undefined });
      customerId = customer.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    }

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      allow_promotion_codes: true,
      subscription_data: { trial_period_days: 7 },
      success_url: `${process.env.APP_URL}/billing?success=true`,
      cancel_url: `${process.env.APP_URL}/billing?canceled=true`,
    });

    res.json({ success: true, data: { url: session.url } });
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/portal — customer portal
router.post('/portal', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    if (!user.stripeCustomerId) throw new AppError(400, 'No billing account found');

    const session = await getStripe().billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.APP_URL}/billing`,
    });

    res.json({ success: true, data: { url: session.url } });
  } catch (err) {
    next(err);
  }
});

// POST /api/webhooks/stripe — Stripe webhooks (raw body)
export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    logger.error('[Stripe] Webhook signature verification failed', err);
    return res.status(400).send('Webhook signature invalid');
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const customer = await getStripe().customers.retrieve(sub.customer as string);
      const user = await prisma.user.findFirst({ where: { stripeCustomerId: sub.customer as string } });

      if (user) {
        const plan = getPlanFromPrice(sub.items.data[0]?.price.id);
        await prisma.user.update({ where: { id: user.id }, data: { plan } });
        await prisma.subscription.upsert({
          where: { stripeSubscriptionId: sub.id },
          update: { status: sub.status.toUpperCase() as any, plan, currentPeriodEnd: new Date(sub.current_period_end * 1000) },
          create: {
            userId: user.id,
            stripeSubscriptionId: sub.id,
            stripePriceId: sub.items.data[0]?.price.id,
            plan,
            status: sub.status.toUpperCase() as any,
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
          },
        });
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const user = await prisma.user.findFirst({ where: { stripeCustomerId: sub.customer as string } });
      if (user) {
        await prisma.user.update({ where: { id: user.id }, data: { plan: 'FREE' } });
      }
      break;
    }
  }

  res.json({ received: true });
}

function getPlanFromPrice(priceId?: string): 'FREE' | 'PRO' | 'BUSINESS' {
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'PRO';
  if (priceId === process.env.STRIPE_PRICE_BUSINESS) return 'BUSINESS';
  return 'FREE';
}

export default router;

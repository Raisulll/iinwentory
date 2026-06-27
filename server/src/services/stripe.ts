import Stripe from 'stripe';
import type { PlanId } from '../utils/plans.js';

const stripeKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeKey ? new Stripe(stripeKey) : null;

const PRICE_MAP: Record<string, string | undefined> = {
  advanced_monthly: process.env.STRIPE_PRICE_ADVANCED_MONTHLY,
  advanced_yearly: process.env.STRIPE_PRICE_ADVANCED_YEARLY,
  ultra_monthly: process.env.STRIPE_PRICE_ULTRA_MONTHLY,
  ultra_yearly: process.env.STRIPE_PRICE_ULTRA_YEARLY,
  premium_monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
  premium_yearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY,
};

export function getStripePriceId(planId: PlanId, billing: 'monthly' | 'yearly'): string | null {
  return PRICE_MAP[`${planId}_${billing}`] || null;
}

export function planIdFromPriceId(priceId: string): PlanId | null {
  for (const [key, val] of Object.entries(PRICE_MAP)) {
    if (val === priceId) return key.split('_')[0] as PlanId;
  }
  return null;
}

export async function createCustomer(email: string, name: string): Promise<string | null> {
  if (!stripe) return null;
  const customer = await stripe.customers.create({ email, name });
  return customer.id;
}

// FRONTEND_URL may legitimately contain a comma-separated list (used as a
// CORS allow-list elsewhere); for Stripe redirects we only need the first.
function getFrontendBaseUrl(): string {
  const raw = process.env.FRONTEND_URL || 'http://localhost:5173';
  return raw.split(',')[0].trim();
}

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  teamId: string,
): Promise<string | null> {
  if (!stripe) return null;
  const frontendUrl = getFrontendBaseUrl();
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${frontendUrl}/settings?billing=success`,
    cancel_url: `${frontendUrl}/settings?billing=cancelled`,
    metadata: { teamId },
    subscription_data: {
      trial_period_days: 14,
      metadata: { teamId },
    },
  });
  return session.url;
}

export async function createPortalSession(customerId: string): Promise<string | null> {
  if (!stripe) return null;
  const frontendUrl = getFrontendBaseUrl();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${frontendUrl}/settings`,
  });
  return session.url;
}

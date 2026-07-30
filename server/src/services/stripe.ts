import Stripe from 'stripe';
import type { PlanId } from '../utils/plans.js';

const stripeKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeKey ? new Stripe(stripeKey) : null;

const PRICE_MAP: Record<string, string | undefined> = {
  advanced_monthly: process.env.STRIPE_PRICE_ADVANCED_MONTHLY,
  advanced_yearly: process.env.STRIPE_PRICE_ADVANCED_YEARLY,
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
  opts: { couponId?: string; offerSlug?: string } = {},
): Promise<string | null> {
  if (!stripe) return null;
  const frontendUrl = getFrontendBaseUrl();
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    // Honor the "no credit card required" trial promise: with a trial and this
    // setting Stripe skips card collection at signup (a card is only requested
    // if an immediate payment is actually due). The customer adds a card later
    // via the billing portal before the trial ends.
    payment_method_collection: 'if_required',
    // When an offer resolves to a coupon we apply it ourselves rather than
    // letting the customer type a code, so eligibility is enforced server-side.
    ...(opts.couponId && { discounts: [{ coupon: opts.couponId }] }),
    success_url: `${frontendUrl}/settings?billing=success`,
    cancel_url: `${frontendUrl}/settings?billing=cancelled`,
    metadata: { teamId, ...(opts.offerSlug && { offer: opts.offerSlug }) },
    subscription_data: {
      trial_period_days: 14,
      metadata: { teamId, ...(opts.offerSlug && { offer: opts.offerSlug }) },
    },
  });
  return session.url;
}

export type NewCouponInput = {
  // Exactly one of percentOff / amountOff. amountOff is in the smallest currency
  // unit (cents) and pairs with currency (defaults to usd).
  percentOff?: number | null;
  amountOff?: number | null;
  currency?: string;
  duration: 'once' | 'repeating' | 'forever';
  durationInMonths?: number | null; // required by Stripe only when duration='repeating'
  maxRedemptions?: number | null;
  name?: string | null;
};

// Creates a Stripe coupon from the admin form so operators never touch the
// Stripe dashboard. Returns the new coupon id, or null when Stripe is
// unconfigured. Throws Stripe's own error on invalid params (caller maps to 400).
export async function createCoupon(input: NewCouponInput): Promise<string | null> {
  if (!stripe) return null;
  const params: import('stripe').Stripe.CouponCreateParams = {
    duration: input.duration,
    ...(input.name ? { name: input.name } : {}),
    ...(input.maxRedemptions ? { max_redemptions: input.maxRedemptions } : {}),
  };
  if (input.percentOff != null) {
    params.percent_off = input.percentOff;
  } else if (input.amountOff != null) {
    params.amount_off = input.amountOff;
    params.currency = (input.currency || 'usd').toLowerCase();
  }
  if (input.duration === 'repeating') {
    params.duration_in_months = input.durationInMonths ?? 1;
  }
  const coupon = await stripe.coupons.create(params);
  return coupon.id;
}

export type CouponInfo = {
  id: string;
  percentOff: number | null;
  amountOff: number | null; // in the smallest currency unit (e.g. cents)
  name: string | null;
  duration: string; // 'once' | 'repeating' | 'forever'
};

// Returns the coupon only when Stripe still considers it redeemable
// (respects the coupon's own expiry and max-redemptions caps).
export async function getValidCoupon(couponId: string): Promise<CouponInfo | null> {
  if (!stripe) return null;
  try {
    const c = await stripe.coupons.retrieve(couponId);
    if (!c || c.valid === false) return null;
    return {
      id: c.id,
      percentOff: c.percent_off ?? null,
      amountOff: c.amount_off ?? null,
      name: c.name ?? null,
      duration: c.duration,
    };
  } catch {
    return null;
  }
}

export type CouponDetails = CouponInfo & {
  valid: boolean;
  timesRedeemed: number;
  maxRedemptions: number | null;
  redeemBy: number | null; // unix seconds, or null for no Stripe-side expiry
};

// Full coupon detail for the admin panel — unlike getValidCoupon this returns
// even expired/exhausted coupons (with valid:false) plus redemption counts.
export async function getCouponDetails(couponId: string): Promise<CouponDetails | null> {
  if (!stripe) return null;
  try {
    const c = await stripe.coupons.retrieve(couponId);
    if (!c) return null;
    return {
      id: c.id,
      percentOff: c.percent_off ?? null,
      amountOff: c.amount_off ?? null,
      name: c.name ?? null,
      duration: c.duration,
      valid: c.valid ?? false,
      timesRedeemed: c.times_redeemed ?? 0,
      maxRedemptions: c.max_redemptions ?? null,
      redeemBy: c.redeem_by ?? null,
    };
  } catch {
    return null;
  }
}

// Confirms a coupon exists in Stripe (used to validate admin input before we
// persist an offer that maps to it). Returns false when Stripe is unconfigured.
export async function couponExists(couponId: string): Promise<boolean> {
  if (!stripe) return false;
  try {
    await stripe.coupons.retrieve(couponId);
    return true;
  } catch {
    return false;
  }
}

// True if this customer has ever had a subscription (active, trialing, past,
// or cancelled). Used to enforce "new users only" offers — it survives a
// cancel-and-rejoin because Stripe keeps cancelled subscriptions in history.
export async function customerHasEverSubscribed(customerId: string): Promise<boolean> {
  if (!stripe) return false;
  const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 1 });
  return subs.data.length > 0;
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

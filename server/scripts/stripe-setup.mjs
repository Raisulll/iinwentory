// One-shot Stripe setup. Idempotent — safe to re-run.
// Reads STRIPE_SECRET_KEY from env, creates 3 products / 6 prices / 1 webhook,
// prints the env-var values to copy into Vercel.
// Defaults to test mode; pass --allow-live to operate on a live-mode key.

import Stripe from 'stripe';

const allowLive = process.argv.includes('--allow-live');
const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  console.error('STRIPE_SECRET_KEY not set in environment');
  process.exit(1);
}
const isLive = secretKey.startsWith('sk_live_');
const isTest = secretKey.startsWith('sk_test_');
if (!isTest && !isLive) {
  console.error('Refusing to run: STRIPE_SECRET_KEY is not a recognized Stripe secret key.');
  process.exit(1);
}
if (isLive && !allowLive) {
  console.error('Refusing to run: STRIPE_SECRET_KEY is a live-mode key. Pass --allow-live to proceed.');
  process.exit(1);
}

const webhookUrl = process.env.WEBHOOK_URL || 'https://server-pi-five-91.vercel.app/api/billing/webhook';

const stripe = new Stripe(secretKey);

// Plan definitions — kept in sync with iinwentory/src/plans.ts and PricingSection.vue
const PLANS = [
  { key: 'advanced', name: 'Advanced', monthly: 4900, yearly: 28800 },
  { key: 'ultra',    name: 'Ultra',    monthly: 14900, yearly: 88800 },
  { key: 'premium',  name: 'Premium',  monthly: 29900, yearly: 178800 },
];

async function findOrCreateProduct(plan) {
  // Use lookup_key on the product via metadata.iinwentory_plan to find ours.
  const list = await stripe.products.list({ limit: 100, active: true });
  const existing = list.data.find(p => p.metadata?.iinwentory_plan === plan.key);
  if (existing) {
    console.log(`  ✓ Product "${plan.name}" already exists (${existing.id})`);
    return existing;
  }
  const created = await stripe.products.create({
    name: `iinwentory ${plan.name}`,
    description: `iinwentory ${plan.name} subscription plan`,
    metadata: { iinwentory_plan: plan.key },
  });
  console.log(`  + Created product "${plan.name}" (${created.id})`);
  return created;
}

async function findOrCreatePrice(productId, plan, interval, amountCents) {
  // Look for an existing recurring price on the product matching the interval.
  const list = await stripe.prices.list({ product: productId, active: true, limit: 100 });
  const existing = list.data.find(
    p =>
      p.recurring?.interval === interval &&
      p.unit_amount === amountCents &&
      p.currency === 'usd',
  );
  if (existing) {
    console.log(`    ✓ Price ${plan.key}_${interval} already exists (${existing.id})`);
    return existing;
  }
  const created = await stripe.prices.create({
    product: productId,
    currency: 'usd',
    unit_amount: amountCents,
    recurring: { interval },
    metadata: { iinwentory_plan: plan.key, iinwentory_billing: interval === 'month' ? 'monthly' : 'yearly' },
  });
  console.log(`    + Created price ${plan.key}_${interval} (${created.id})`);
  return created;
}

async function findOrCreateWebhook(url) {
  const list = await stripe.webhookEndpoints.list({ limit: 100 });
  const existing = list.data.find(w => w.url === url);
  const events = ['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'];
  if (existing) {
    // Patch event list if it differs.
    const same =
      existing.enabled_events.length === events.length &&
      events.every(e => existing.enabled_events.includes(e));
    if (!same) {
      const updated = await stripe.webhookEndpoints.update(existing.id, { enabled_events: events });
      console.log(`  ~ Updated existing webhook events (${updated.id})`);
    } else {
      console.log(`  ✓ Webhook already exists (${existing.id})`);
    }
    // NB: secret is only returned on create; for an existing endpoint the secret has to be revealed manually.
    return { endpoint: existing, secret: null };
  }
  const created = await stripe.webhookEndpoints.create({
    url,
    enabled_events: events,
    description: 'iinwentory production server',
  });
  console.log(`  + Created webhook (${created.id})`);
  return { endpoint: created, secret: created.secret };
}

const out = {};

console.log(`Stripe setup (${isLive ? 'LIVE' : 'test'} mode)\n`);
console.log('Products & prices:');
for (const plan of PLANS) {
  const product = await findOrCreateProduct(plan);
  const monthly = await findOrCreatePrice(product.id, plan, 'month', plan.monthly);
  const yearly = await findOrCreatePrice(product.id, plan, 'year', plan.yearly);
  out[`STRIPE_PRICE_${plan.key.toUpperCase()}_MONTHLY`] = monthly.id;
  out[`STRIPE_PRICE_${plan.key.toUpperCase()}_YEARLY`] = yearly.id;
}

console.log('\nWebhook:');
const webhook = await findOrCreateWebhook(webhookUrl);
if (webhook.secret) {
  out.STRIPE_WEBHOOK_SECRET = webhook.secret;
} else {
  console.log('\n  ⚠ Webhook already existed; signing secret cannot be retrieved via API.');
  console.log('     Either delete the existing webhook in the dashboard and re-run,');
  console.log('     or reveal the existing secret manually and paste it.');
}

console.log('\n— Env vars to set on Vercel `server` project —');
for (const [k, v] of Object.entries(out)) {
  console.log(`${k}=${v}`);
}

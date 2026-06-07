// Stripe Products Seed Script for MyDraft Credit Economy
// Run with: npx tsx server/seed-stripe-products.ts
//
// Idempotent: products are looked up by the `mydraft_sku` metadata key. Prices
// are immutable in Stripe, so a new price is created only when no active price
// with the desired amount + interval already exists on the product.

import { getUncachableStripeClient } from './stripeClient';
import { CREDIT_PACKS, CREDIT_ADDONS, PLAN_PRICES, PLAN_MONTHLY_CREDITS } from './credits';
import type Stripe from 'stripe';

type SeedSpec = {
  sku: string;
  name: string;
  description: string;
  amount: number; // cents
  interval: 'month' | 'year' | null; // null = one-time
  metadata: Record<string, string>;
};

async function findProductBySku(stripe: Stripe, sku: string): Promise<Stripe.Product | null> {
  const res = await stripe.products.search({ query: `metadata['mydraft_sku']:'${sku}'` });
  return res.data[0] || null;
}

async function ensureProduct(stripe: Stripe, spec: SeedSpec): Promise<Stripe.Product> {
  const existing = await findProductBySku(stripe, spec.sku);
  if (existing) {
    console.log(`  Product exists: ${existing.name} (${existing.id})`);
    return existing;
  }
  const product = await stripe.products.create({
    name: spec.name,
    description: spec.description,
    metadata: { ...spec.metadata, mydraft_sku: spec.sku },
  });
  console.log(`  Created product: ${product.name} (${product.id})`);
  return product;
}

async function ensurePrice(stripe: Stripe, product: Stripe.Product, spec: SeedSpec): Promise<void> {
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  const match = prices.data.find((p) => {
    const sameAmount = p.unit_amount === spec.amount;
    const sameInterval = spec.interval
      ? p.recurring?.interval === spec.interval
      : !p.recurring;
    return sameAmount && sameInterval;
  });
  if (match) {
    console.log(`    Price exists: ${(spec.amount / 100).toFixed(2)} ${spec.interval ? '/' + spec.interval : 'one-time'} (${match.id})`);
    return;
  }
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: spec.amount,
    currency: 'usd',
    ...(spec.interval ? { recurring: { interval: spec.interval } } : {}),
    metadata: spec.metadata,
  });
  console.log(`    Created price: $${(spec.amount / 100).toFixed(2)} ${spec.interval ? '/' + spec.interval : 'one-time'} (${price.id})`);
}

async function seedProducts() {
  console.log('Seeding Stripe products for MyDraft credit economy...\n');
  const stripe = await getUncachableStripeClient();

  const specs: SeedSpec[] = [
    // Subscription plans — each plan gets a monthly AND an annual price so
    // checkout and the migration script both have pre-seeded prices to target.
    {
      sku: 'plan_personal',
      name: 'MyDraft Personal',
      description: `Personal plan — ${PLAN_MONTHLY_CREDITS.personal} AI credits per month`,
      amount: PLAN_PRICES.personal.monthly,
      interval: 'month',
      metadata: { type: 'plan', plan: 'personal', credits: String(PLAN_MONTHLY_CREDITS.personal) },
    },
    {
      sku: 'plan_personal',
      name: 'MyDraft Personal',
      description: `Personal plan — ${PLAN_MONTHLY_CREDITS.personal} AI credits per month`,
      amount: PLAN_PRICES.personal.annual,
      interval: 'year',
      metadata: { type: 'plan', plan: 'personal', credits: String(PLAN_MONTHLY_CREDITS.personal) },
    },
    {
      sku: 'plan_pro',
      name: 'MyDraft Pro',
      description: `Pro plan — ${PLAN_MONTHLY_CREDITS.pro} AI credits per month`,
      amount: PLAN_PRICES.pro.monthly,
      interval: 'month',
      metadata: { type: 'plan', plan: 'pro', credits: String(PLAN_MONTHLY_CREDITS.pro) },
    },
    {
      sku: 'plan_pro',
      name: 'MyDraft Pro',
      description: `Pro plan — ${PLAN_MONTHLY_CREDITS.pro} AI credits per month`,
      amount: PLAN_PRICES.pro.annual,
      interval: 'year',
      metadata: { type: 'plan', plan: 'pro', credits: String(PLAN_MONTHLY_CREDITS.pro) },
    },
    {
      sku: 'plan_premium',
      name: 'MyDraft Business',
      description: `Business plan — ${PLAN_MONTHLY_CREDITS.premium} AI credits per month`,
      amount: PLAN_PRICES.premium.monthly,
      interval: 'month',
      metadata: { type: 'plan', plan: 'premium', credits: String(PLAN_MONTHLY_CREDITS.premium) },
    },
    {
      sku: 'plan_premium',
      name: 'MyDraft Business',
      description: `Business plan — ${PLAN_MONTHLY_CREDITS.premium} AI credits per month`,
      amount: PLAN_PRICES.premium.annual,
      interval: 'year',
      metadata: { type: 'plan', plan: 'premium', credits: String(PLAN_MONTHLY_CREDITS.premium) },
    },
    // One-time credit packs
    ...CREDIT_PACKS.map((pack) => ({
      sku: pack.id,
      name: `MyDraft — ${pack.label}`,
      description: `One-time top-up of ${pack.credits} AI credits (expire 30 days after purchase)`,
      amount: pack.priceCents,
      interval: null as null,
      metadata: { type: 'pack', credits: String(pack.credits) },
    })),
    // Recurring monthly credit add-ons
    ...CREDIT_ADDONS.map((addon) => ({
      sku: addon.id,
      name: `MyDraft — ${addon.label}`,
      description: `Recurring monthly top-up of ${addon.credits} AI credits`,
      amount: addon.priceCents,
      interval: 'month' as const,
      metadata: { type: 'addon', credits: String(addon.credits) },
    })),
  ];

  for (const spec of specs) {
    console.log(`\n${spec.name} [${spec.sku}]`);
    const product = await ensureProduct(stripe, spec);
    await ensurePrice(stripe, product, spec);
  }

  console.log('\nDone! Products/prices synced to the database via webhooks.');
  console.log('Verify at: https://dashboard.stripe.com/products');
}

seedProducts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error seeding products:', error);
    process.exit(1);
  });

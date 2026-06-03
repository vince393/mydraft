// One-time migration: move existing active Stripe subscriptions onto the new
// credit-economy prices (Pro $4.99/mo, Business $14.99/mo).
//
// Run AFTER seed-stripe-products.ts has created the new prices:
//   npx tsx server/migrate-existing-subscriptions.ts          (dry run — lists changes)
//   npx tsx server/migrate-existing-subscriptions.ts --apply  (performs the migration)
//
// For each active/trialing subscription it finds the new plan price (by the
// `mydraft_sku` product metadata) matching the subscriber's plan and swaps the
// single subscription item over to it. Proration is disabled so existing
// customers are simply moved to the new price at their next renewal.

import { getUncachableStripeClient } from './stripeClient';
import { PLAN_PRICES } from './credits';
import type Stripe from 'stripe';

const APPLY = process.argv.includes('--apply');

async function findPlanPriceId(
  stripe: Stripe,
  sku: string,
  amount: number,
): Promise<string | null> {
  const products = await stripe.products.search({
    query: `metadata['mydraft_sku']:'${sku}'`,
  });
  const product = products.data[0];
  if (!product) return null;
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  const match = prices.data.find(
    (p) => p.unit_amount === amount && p.recurring?.interval === 'month',
  );
  return match?.id || null;
}

async function migrate() {
  console.log(`Migrating existing subscriptions (${APPLY ? 'APPLY' : 'DRY RUN'})...\n`);
  const stripe = await getUncachableStripeClient();

  const proPriceId = await findPlanPriceId(stripe, 'plan_pro', PLAN_PRICES.pro.monthly);
  const premiumPriceId = await findPlanPriceId(stripe, 'plan_premium', PLAN_PRICES.premium.monthly);

  if (!proPriceId || !premiumPriceId) {
    console.error('Could not find new plan prices. Run seed-stripe-products.ts first.');
    console.error(`  pro: ${proPriceId}  premium: ${premiumPriceId}`);
    process.exit(1);
  }
  console.log(`New Pro price:      ${proPriceId} ($${(PLAN_PRICES.pro.monthly / 100).toFixed(2)}/mo)`);
  console.log(`New Business price: ${premiumPriceId} ($${(PLAN_PRICES.premium.monthly / 100).toFixed(2)}/mo)\n`);

  let migrated = 0;
  let skipped = 0;
  let scanned = 0;

  for await (const sub of stripe.subscriptions.list({
    status: 'all',
    limit: 100,
    expand: ['data.items.data.price.product'],
  })) {
    if (sub.status !== 'active' && sub.status !== 'trialing' && sub.status !== 'past_due') {
      continue;
    }
    scanned++;

    const items = sub.items.data;
    // Only migrate single-plan subscriptions. Add-on subs (metadata.type=addon)
    // and multi-item subs are left untouched.
    const planItem = items.find((it) => {
      const price = it.price as Stripe.Price;
      const prodMeta = (price.product as Stripe.Product)?.metadata || {};
      const priceMeta = price.metadata || {};
      const type = priceMeta.type || prodMeta.type;
      return type === 'plan' || (!type && price.recurring);
    });
    if (!planItem) {
      skipped++;
      continue;
    }

    const price = planItem.price as Stripe.Price;
    const prodMeta = (price.product as Stripe.Product)?.metadata || {};
    const priceMeta = price.metadata || {};
    const plan = priceMeta.plan || prodMeta.plan;

    // Decide target price. Prefer explicit plan metadata; otherwise infer from amount.
    let targetPriceId: string | null = null;
    let targetLabel = '';
    if (plan === 'premium') {
      targetPriceId = premiumPriceId;
      targetLabel = 'Business';
    } else if (plan === 'pro') {
      targetPriceId = proPriceId;
      targetLabel = 'Pro';
    } else {
      // Legacy subs without plan metadata: map by old amount ($29/$10 → Business/Pro).
      const amt = price.unit_amount || 0;
      if (amt >= 1500) {
        targetPriceId = premiumPriceId;
        targetLabel = 'Business';
      } else {
        targetPriceId = proPriceId;
        targetLabel = 'Pro';
      }
    }

    if (price.id === targetPriceId) {
      skipped++;
      continue;
    }

    console.log(
      `  ${sub.id} (${sub.status}) ${price.id} $${((price.unit_amount || 0) / 100).toFixed(2)} → ${targetLabel} ${targetPriceId}`,
    );

    if (APPLY) {
      await stripe.subscriptions.update(sub.id, {
        items: [{ id: planItem.id, price: targetPriceId }],
        proration_behavior: 'none',
        metadata: { ...sub.metadata, migrated_to_credit_economy: 'true' },
      });
    }
    migrated++;
  }

  console.log(
    `\nScanned ${scanned} active subs. ${migrated} ${APPLY ? 'migrated' : 'would be migrated'}, ${skipped} left unchanged.`,
  );
  if (!APPLY && migrated > 0) {
    console.log('Re-run with --apply to perform the migration.');
  }
}

migrate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration error:', error);
    process.exit(1);
  });

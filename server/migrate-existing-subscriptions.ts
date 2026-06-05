// One-time migration: move existing active Stripe subscriptions onto the new
// credit-economy prices (Pro $7.99/mo, Business $19.99/mo).
//
// Run AFTER seed-stripe-products.ts has created the new prices:
//   npx tsx server/migrate-existing-subscriptions.ts          (dry run — lists changes)
//   npx tsx server/migrate-existing-subscriptions.ts --apply  (performs the migration)
//
// For each active/trialing subscription it finds the new plan price (by the
// `mydraft_sku` product metadata) matching the subscriber's plan AND billing
// interval (monthly vs annual), then swaps the single subscription item over to
// it. Proration is disabled so existing customers are simply moved to the new
// price at their next renewal. Personal subscriptions are left untouched (they
// are already on the new pricing).

import { getUncachableStripeClient } from './stripeClient';
import { PLAN_PRICES } from './credits';
import type Stripe from 'stripe';

const APPLY = process.argv.includes('--apply');

type Interval = 'month' | 'year';

async function findPlanPriceId(
  stripe: Stripe,
  sku: string,
  amount: number,
  interval: Interval,
): Promise<string | null> {
  const products = await stripe.products.search({
    query: `metadata['mydraft_sku']:'${sku}'`,
  });
  const product = products.data[0];
  if (!product) return null;
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  const match = prices.data.find(
    (p) => p.unit_amount === amount && p.recurring?.interval === interval,
  );
  return match?.id || null;
}

async function migrate() {
  console.log(`Migrating existing subscriptions (${APPLY ? 'APPLY' : 'DRY RUN'})...\n`);
  const stripe = await getUncachableStripeClient();

  // Resolve new prices for both plans at both billing intervals so an annual
  // subscriber moves to the new annual price (not the monthly one).
  const targets = {
    pro: {
      month: await findPlanPriceId(stripe, 'plan_pro', PLAN_PRICES.pro.monthly, 'month'),
      year: await findPlanPriceId(stripe, 'plan_pro', PLAN_PRICES.pro.annual, 'year'),
    },
    premium: {
      month: await findPlanPriceId(stripe, 'plan_premium', PLAN_PRICES.premium.monthly, 'month'),
      year: await findPlanPriceId(stripe, 'plan_premium', PLAN_PRICES.premium.annual, 'year'),
    },
  };

  if (!targets.pro.month || !targets.pro.year || !targets.premium.month || !targets.premium.year) {
    console.error('Could not find all new plan prices. Run seed-stripe-products.ts first.');
    console.error(`  pro:     month=${targets.pro.month}  year=${targets.pro.year}`);
    console.error(`  premium: month=${targets.premium.month}  year=${targets.premium.year}`);
    process.exit(1);
  }
  console.log(`New Pro:      $${(PLAN_PRICES.pro.monthly / 100).toFixed(2)}/mo  $${(PLAN_PRICES.pro.annual / 100).toFixed(2)}/yr`);
  console.log(`New Business: $${(PLAN_PRICES.premium.monthly / 100).toFixed(2)}/mo  $${(PLAN_PRICES.premium.annual / 100).toFixed(2)}/yr\n`);

  let migrated = 0;
  let skipped = 0;
  let scanned = 0;

  for await (const sub of stripe.subscriptions.list({
    status: 'all',
    limit: 100,
    expand: ['data.items.data.price'],
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
      const prod = price.product;
      const prodMeta = (prod && typeof prod === 'object') ? ((prod as Stripe.Product).metadata || {}) : {};
      const priceMeta = price.metadata || {};
      const type = priceMeta.type || prodMeta.type;
      return type === 'plan' || (!type && price.recurring);
    });
    if (!planItem) {
      skipped++;
      continue;
    }

    const price = planItem.price as Stripe.Price;
    const prod = price.product;
    const prodMeta = (prod && typeof prod === 'object') ? ((prod as Stripe.Product).metadata || {}) : {};
    const priceMeta = price.metadata || {};
    const plan = priceMeta.plan || prodMeta.plan;

    // Preserve the subscriber's billing interval (monthly vs annual).
    const interval: Interval = price.recurring?.interval === 'year' ? 'year' : 'month';

    // Personal is already on the new pricing — never downgrade/migrate it.
    if (plan === 'personal') {
      skipped++;
      continue;
    }

    // Decide target plan. Prefer explicit plan metadata; otherwise infer from
    // the monthly-equivalent amount (annual divided by 12) so legacy annual subs
    // are classified the same as monthly ones.
    let targetPlan: 'pro' | 'premium';
    if (plan === 'premium') {
      targetPlan = 'premium';
    } else if (plan === 'pro') {
      targetPlan = 'pro';
    } else {
      const amt = price.unit_amount || 0;
      const monthlyEquiv = interval === 'year' ? amt / 12 : amt;
      // Old Pro ≈ $4.99–$8.25/mo-equiv, old Business ≈ $12.49–$24.92/mo-equiv.
      targetPlan = monthlyEquiv >= 1000 ? 'premium' : 'pro';
    }

    const targetPriceId = targets[targetPlan][interval];
    const targetLabel = targetPlan === 'premium' ? 'Business' : 'Pro';

    if (!targetPriceId || price.id === targetPriceId) {
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

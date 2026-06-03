import { db } from "./db";
import {
  creditLots,
  creditTransactions,
  creditAddons,
  users,
  type CreditLot,
  type CreditTransaction,
  type Plan,
} from "@shared/schema";
import { eq, and, gt, lte, desc, asc, sql } from "drizzle-orm";

// ============================================================
// Credit economy configuration
// ============================================================

export const CREDIT_EXPIRY_DAYS = 30;

// Monthly credit allowance per plan
export const PLAN_MONTHLY_CREDITS: Record<Plan, number> = {
  free: 10,
  pro: 50,
  premium: 200, // Business
};

// Per-action credit costs. language_detect is free (deterministic franc).
export const CREDIT_COSTS = {
  ai_reply: 2,
  ai_compose: 2,
  ai_summary: 1,
  ai_rewrite: 1,
  grammar_check: 1,
  translate: 1,
  ai_chat: 1,
  read_aloud: 1,
  voice_chat: 2,
  image_generate: 5,
  language_detect: 0,
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

// One-time credit packs (prices in cents). Prices set by Agent — adjust as desired.
export const CREDIT_PACKS = [
  { id: "pack_50", credits: 50, priceCents: 499, label: "50 credits" },
  { id: "pack_150", credits: 150, priceCents: 1299, label: "150 credits" },
  { id: "pack_500", credits: 500, priceCents: 3999, label: "500 credits" },
  { id: "pack_1500", credits: 1500, priceCents: 9999, label: "1,500 credits" },
] as const;

// Recurring monthly credit add-ons (prices in cents). Prices set by Agent.
export const CREDIT_ADDONS = [
  { id: "addon_50", credits: 50, priceCents: 399, label: "50 credits / month" },
  { id: "addon_150", credits: 150, priceCents: 999, label: "150 credits / month" },
  { id: "addon_500", credits: 500, priceCents: 2999, label: "500 credits / month" },
] as const;

// Plan subscription prices (cents). New lower prices.
export const PLAN_PRICES = {
  pro: { monthly: 499, annual: 4990 },
  premium: { monthly: 1499, annual: 14990 },
} as const;

export const TRIAL_DAYS = 3;
export const REFERRAL_REFERRER_CREDITS = 25;

export function getActionCost(action: CreditAction): number {
  return CREDIT_COSTS[action] ?? 0;
}

// ============================================================
// Schema safety: indexes not covered by drizzle db:push
// ============================================================

// Idempotently create the partial unique index that guarantees credit grants are never
// double-granted on duplicate Stripe webhooks. drizzle-kit db:push prompts interactively
// for unique-index changes, so we apply it here at startup with raw idempotent SQL instead.
// Must run before any code relies on `grantCredits` catching the 23505 unique-violation.
export async function ensureCreditIndexes(): Promise<void> {
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_grant_reference_unique
    ON credit_transactions (reference)
    WHERE type = 'grant' AND reference IS NOT NULL
  `);
}

// ============================================================
// Internal helpers
// ============================================================

function expiryFromNow(days = CREDIT_EXPIRY_DAYS): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

// Mark any of a user's lots whose expiry has passed as expired, logging the
// forfeited remainder to the ledger. Runs lazily before balance/spend reads.
async function processExpiredLots(userId: string): Promise<void> {
  const now = new Date();
  const stale = await db
    .select()
    .from(creditLots)
    .where(
      and(
        eq(creditLots.userId, userId),
        eq(creditLots.expired, false),
        eq(creditLots.exhausted, false),
        lte(creditLots.expiresAt, now),
      ),
    );

  if (stale.length === 0) return;

  let balance = await rawBalance(userId);
  for (const lot of stale) {
    const forfeited = lot.amountRemaining;
    await db
      .update(creditLots)
      .set({ expired: true, amountRemaining: 0 })
      .where(eq(creditLots.id, lot.id));

    if (forfeited > 0) {
      balance -= forfeited;
      await db.insert(creditTransactions).values({
        userId,
        type: "expire",
        amount: -forfeited,
        action: "expire",
        lotId: lot.id,
        balanceAfter: Math.max(0, balance),
        reference: lot.source,
      });
    }
  }
}

// Sum of remaining credits across non-expired, non-exhausted lots (no expiry sweep).
async function rawBalance(userId: string): Promise<number> {
  const now = new Date();
  const [row] = await db
    .select({ total: sql<number>`COALESCE(SUM(${creditLots.amountRemaining}), 0)` })
    .from(creditLots)
    .where(
      and(
        eq(creditLots.userId, userId),
        eq(creditLots.expired, false),
        gt(creditLots.expiresAt, now),
      ),
    );
  return Number(row?.total ?? 0);
}

// ============================================================
// Public API
// ============================================================

export async function getBalance(userId: string): Promise<number> {
  await processExpiredLots(userId);
  return rawBalance(userId);
}

export interface CreditSummary {
  balance: number;
  nextExpiry: { amount: number; expiresAt: Date } | null;
  lots: CreditLot[];
}

export async function getCreditSummary(userId: string): Promise<CreditSummary> {
  await processExpiredLots(userId);
  const now = new Date();
  const lots = await db
    .select()
    .from(creditLots)
    .where(
      and(
        eq(creditLots.userId, userId),
        eq(creditLots.expired, false),
        gt(creditLots.expiresAt, now),
        gt(creditLots.amountRemaining, 0),
      ),
    )
    .orderBy(asc(creditLots.expiresAt));

  const balance = lots.reduce((s, l) => s + l.amountRemaining, 0);
  const nextExpiry = lots.length > 0 ? { amount: lots[0].amountRemaining, expiresAt: lots[0].expiresAt } : null;
  return { balance, nextExpiry, lots };
}

export interface GrantOptions {
  userId: string;
  amount: number;
  source: string; // plan_monthly | pack | addon | referral | trial | admin | promo
  action?: string;
  expiresInDays?: number;
  reference?: string;
  metadata?: CreditLot["metadata"];
  // When set, the grant is idempotent: if a prior grant transaction already used this
  // key (stored as the transaction reference), the grant is skipped and the existing lot
  // (or null) is returned. Used to make Stripe webhook retries safe from double-granting.
  idempotencyKey?: string;
}

export async function grantCredits(opts: GrantOptions): Promise<CreditLot | null> {
  const { userId, amount, source } = opts;
  if (amount <= 0) throw new Error("grantCredits: amount must be positive");

  const txReference = opts.idempotencyKey ?? opts.reference;

  // Look up an already-recorded grant for this idempotency key and return its lot (or null
  // when the prior grant recorded no lot). Used both for the up-front check and to resolve
  // the result after a unique-violation race.
  async function existingGrant(): Promise<CreditLot | null> {
    const [existing] = await db
      .select()
      .from(creditTransactions)
      .where(
        and(
          eq(creditTransactions.userId, userId),
          eq(creditTransactions.type, "grant"),
          eq(creditTransactions.reference, opts.idempotencyKey!),
        ),
      )
      .limit(1);
    if (!existing) return null;
    if (existing.lotId != null) {
      const [lot] = await db
        .select()
        .from(creditLots)
        .where(eq(creditLots.id, existing.lotId))
        .limit(1);
      if (lot) return lot;
    }
    return null;
  }

  try {
    return await db.transaction(async (tx) => {
    if (opts.idempotencyKey) {
      const [existing] = await tx
        .select()
        .from(creditTransactions)
        .where(
          and(
            eq(creditTransactions.userId, userId),
            eq(creditTransactions.type, "grant"),
            eq(creditTransactions.reference, opts.idempotencyKey),
          ),
        )
        .limit(1);
      if (existing) {
        if (existing.lotId != null) {
          const [lot] = await tx
            .select()
            .from(creditLots)
            .where(eq(creditLots.id, existing.lotId))
            .limit(1);
          if (lot) return lot;
        }
        return null;
      }
    }

    const [lot] = await tx
      .insert(creditLots)
      .values({
        userId,
        amountInitial: amount,
        amountRemaining: amount,
        source,
        expiresAt: expiryFromNow(opts.expiresInDays),
        metadata: opts.metadata,
      })
      .returning();

    const [bal] = await tx
      .select({ total: sql<number>`COALESCE(SUM(${creditLots.amountRemaining}), 0)` })
      .from(creditLots)
      .where(
        and(
          eq(creditLots.userId, userId),
          eq(creditLots.expired, false),
          gt(creditLots.expiresAt, new Date()),
        ),
      );

    await tx.insert(creditTransactions).values({
      userId,
      type: "grant",
      amount,
      action: opts.action || `${source}_grant`,
      lotId: lot.id,
      balanceAfter: Number(bal?.total ?? amount),
      reference: txReference,
    });

    return lot;
    });
  } catch (err) {
    // Hard concurrency guarantee: if a truly simultaneous webhook delivery already
    // committed a grant for this idempotency key, the partial unique index on
    // credit_transactions(reference) WHERE type='grant' rejects our insert with a
    // 23505 unique-violation. Treat that (and only that specific index) as an
    // idempotent no-op and return the lot recorded by the winning transaction.
    if (opts.idempotencyKey && isGrantReferenceViolation(err)) {
      return existingGrant();
    }
    throw err;
  }
}

const GRANT_REFERENCE_INDEX = "credit_transactions_grant_reference_unique";

// True only for a 23505 unique-violation raised by our grant-reference partial unique
// index (as surfaced by the postgres-js driver). Scoped to this constraint so unrelated
// future unique violations are never silently swallowed.
function isGrantReferenceViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: string; constraint_name?: string };
  return e.code === "23505" && e.constraint_name === GRANT_REFERENCE_INDEX;
}

export interface SpendResult {
  success: boolean;
  balanceAfter: number;
  spent: number;
  needed?: number;
}

// FIFO spend across lots that expire soonest first. Atomic via transaction.
export async function spendCredits(params: {
  userId: string;
  amount: number;
  action: string;
  reference?: string;
}): Promise<SpendResult> {
  const { userId, amount, action, reference } = params;
  await processExpiredLots(userId);

  if (amount <= 0) {
    const bal = await rawBalance(userId);
    return { success: true, balanceAfter: bal, spent: 0 };
  }

  return db.transaction(async (tx) => {
    const now = new Date();
    // SELECT ... FOR UPDATE locks the candidate lot rows for the duration of this
    // transaction. Concurrent spends for the same user serialize on these locks: the
    // second transaction blocks until the first commits, then re-reads the updated
    // remaining amounts. This makes the affordability check + deduction atomic, so two
    // requests can never both succeed when only one is affordable.
    const lots = await tx
      .select()
      .from(creditLots)
      .where(
        and(
          eq(creditLots.userId, userId),
          eq(creditLots.expired, false),
          eq(creditLots.exhausted, false),
          gt(creditLots.expiresAt, now),
          gt(creditLots.amountRemaining, 0),
        ),
      )
      .orderBy(asc(creditLots.expiresAt), asc(creditLots.issuedAt))
      .for("update");

    const available = lots.reduce((s, l) => s + l.amountRemaining, 0);
    if (available < amount) {
      // Insufficient funds at charge time. With reserve-then-settle callers this is the
      // atomic gate that rejects a concurrent request before any AI work runs. Callers
      // should treat success:false as "not charged" (return 402, do NOT run the action).
      console.warn(
        `[credits] spend race/shortfall: user=${userId} action=${action} needed=${amount} available=${available}`,
      );
      return { success: false, balanceAfter: available, spent: 0, needed: amount };
    }

    let remaining = amount;
    let lastLotId: number | null = null;
    for (const lot of lots) {
      if (remaining <= 0) break;
      const take = Math.min(lot.amountRemaining, remaining);
      const newRemaining = lot.amountRemaining - take;
      await tx
        .update(creditLots)
        .set({ amountRemaining: newRemaining, exhausted: newRemaining === 0 })
        .where(eq(creditLots.id, lot.id));
      remaining -= take;
      lastLotId = lot.id;
    }

    const balanceAfter = available - amount;
    await tx.insert(creditTransactions).values({
      userId,
      type: "spend",
      amount: -amount,
      action,
      lotId: lastLotId,
      balanceAfter,
      reference,
    });

    return { success: true, balanceAfter, spent: amount };
  });
}

// Refund credits (e.g. failed AI call after spend) — issued as a short-lived lot
// matching remaining expiry semantics; logged as refund.
export async function refundCredits(params: {
  userId: string;
  amount: number;
  action: string;
  reference?: string;
}): Promise<void> {
  const { userId, amount, action, reference } = params;
  if (amount <= 0) return;
  // Refunds must NOT set the unique grant `reference` (a partial unique index on
  // credit_transactions(reference) WHERE type='grant' would reject a second refund
  // that reused the same reference, leaving a failed AI call charged). Keep the
  // originating reference as informational metadata instead.
  await grantCredits({
    userId,
    amount,
    source: "refund",
    action: `refund_${action}`,
    metadata: reference ? { note: `refund:${reference}` } : undefined,
  });
}

// Lazily grant the user's monthly plan allowance if a new ~30-day cycle has begun.
// Used for free users and as a safety net for paid users (Stripe also grants on invoice.paid).
export async function ensureMonthlyGrant(user: {
  id: string;
  plan: Plan;
  lastMonthlyGrantAt: Date | null;
  stripeSubscriptionId?: string | null;
}): Promise<boolean> {
  // Paid plans are granted via Stripe invoice.paid; only free users are lazily granted here.
  if (user.plan !== "free") return false;

  const now = new Date();
  const last = user.lastMonthlyGrantAt ? new Date(user.lastMonthlyGrantAt) : null;
  const due =
    !last || now.getTime() - last.getTime() >= CREDIT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  if (!due) return false;

  await grantCredits({
    userId: user.id,
    amount: PLAN_MONTHLY_CREDITS.free,
    source: "plan_monthly",
    action: "monthly_grant",
    metadata: { plan: "free" },
  });
  await db.update(users).set({ lastMonthlyGrantAt: now }).where(eq(users.id, user.id));
  return true;
}

// Grant a plan's monthly allowance (called from Stripe webhooks on invoice.paid).
export async function grantPlanMonthlyCredits(params: {
  userId: string;
  plan: Plan;
  stripeInvoiceId?: string;
  stripeSubscriptionId?: string;
}): Promise<void> {
  const amount = PLAN_MONTHLY_CREDITS[params.plan] ?? 0;
  if (amount <= 0) return;
  const lot = await grantCredits({
    userId: params.userId,
    amount,
    source: "plan_monthly",
    action: "monthly_grant",
    reference: params.stripeInvoiceId,
    idempotencyKey: params.stripeInvoiceId
      ? `invoice:${params.stripeInvoiceId}:plan`
      : undefined,
    metadata: {
      plan: params.plan,
      stripeInvoiceId: params.stripeInvoiceId,
      stripeSubscriptionId: params.stripeSubscriptionId,
    },
  });
  // Skip the bookkeeping update when this was an idempotent no-op (duplicate webhook).
  if (!lot) return;
  await db
    .update(users)
    .set({ lastMonthlyGrantAt: new Date() })
    .where(eq(users.id, params.userId));
}

export async function getTransactions(userId: string, limit = 50): Promise<CreditTransaction[]> {
  return db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, userId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(limit);
}

// Sweep all expired lots across all users (for scheduled job).
export async function sweepAllExpiredLots(): Promise<number> {
  const now = new Date();
  const stale = await db
    .select()
    .from(creditLots)
    .where(
      and(
        eq(creditLots.expired, false),
        eq(creditLots.exhausted, false),
        lte(creditLots.expiresAt, now),
      ),
    );
  for (const lot of stale) {
    const forfeited = lot.amountRemaining;
    await db
      .update(creditLots)
      .set({ expired: true, amountRemaining: 0 })
      .where(eq(creditLots.id, lot.id));
    if (forfeited > 0) {
      await db.insert(creditTransactions).values({
        userId: lot.userId,
        type: "expire",
        amount: -forfeited,
        action: "expire",
        lotId: lot.id,
        balanceAfter: await rawBalance(lot.userId),
        reference: lot.source,
      });
    }
  }
  return stale.length;
}

// Credit add-on (recurring) helpers
export async function createCreditAddon(params: {
  userId: string;
  stripeSubscriptionId: string;
  creditsPerMonth: number;
}): Promise<void> {
  await db.insert(creditAddons).values({
    userId: params.userId,
    stripeSubscriptionId: params.stripeSubscriptionId,
    creditsPerMonth: params.creditsPerMonth,
  });
}

export async function getActiveAddons(userId: string) {
  return db
    .select()
    .from(creditAddons)
    .where(and(eq(creditAddons.userId, userId), eq(creditAddons.status, "active")));
}

export async function cancelCreditAddon(stripeSubscriptionId: string): Promise<void> {
  await db
    .update(creditAddons)
    .set({ status: "canceled", canceledAt: new Date() })
    .where(eq(creditAddons.stripeSubscriptionId, stripeSubscriptionId));
}

export async function getAddonBySubscriptionId(stripeSubscriptionId: string) {
  const [row] = await db
    .select()
    .from(creditAddons)
    .where(eq(creditAddons.stripeSubscriptionId, stripeSubscriptionId));
  return row;
}

// ============================================================
// Admin analytics
// ============================================================

export async function getCreditAnalytics() {
  const [granted] = await db
    .select({ total: sql<number>`COALESCE(SUM(${creditTransactions.amount}), 0)` })
    .from(creditTransactions)
    .where(eq(creditTransactions.type, "grant"));

  const [spent] = await db
    .select({ total: sql<number>`COALESCE(SUM(${creditTransactions.amount}), 0)` })
    .from(creditTransactions)
    .where(eq(creditTransactions.type, "spend"));

  const [expired] = await db
    .select({ total: sql<number>`COALESCE(SUM(${creditTransactions.amount}), 0)` })
    .from(creditTransactions)
    .where(eq(creditTransactions.type, "expire"));

  const [outstanding] = await db
    .select({ total: sql<number>`COALESCE(SUM(${creditLots.amountRemaining}), 0)` })
    .from(creditLots)
    .where(and(eq(creditLots.expired, false), gt(creditLots.expiresAt, new Date())));

  const byAction = await db
    .select({
      action: creditTransactions.action,
      total: sql<number>`COALESCE(SUM(${creditTransactions.amount}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(creditTransactions)
    .where(eq(creditTransactions.type, "spend"))
    .groupBy(creditTransactions.action);

  return {
    totalGranted: Number(granted?.total ?? 0),
    totalSpent: Math.abs(Number(spent?.total ?? 0)),
    totalExpired: Math.abs(Number(expired?.total ?? 0)),
    outstanding: Number(outstanding?.total ?? 0),
    spendByAction: byAction.map((r) => ({
      action: r.action,
      credits: Math.abs(Number(r.total)),
      count: Number(r.count),
    })),
  };
}

---
name: credit gating pattern
description: Durable billing-policy decisions for the metered AI credit economy — what to charge, what stays free, and the trial/referral rules.
---

# Credit economy — durable policy decisions

**Why:** AI usage is metered by credits, not plan-gated. These are the non-obvious billing decisions a future change must stay consistent with; the mechanics live in `server/credits.ts` + the AI routes.

## Billing model
- **Flat-cost AI actions** reserve the fixed cost up front (immediate FIFO spend) and refund on AI failure. Reserving up front — not charging after — is deliberate: it blocks zero-balance users before doing paid work and wins the concurrency race.
- **Dynamic actions** (auto-sort, inbox-refresh) reserve **1** up front, then settle to the real per-item count afterward. **Bill only delivered/persisted AI output** — exclude free rule-based results; if zero billable, refund the held credit.
- **Never let delivered AI be free on a billing edge case.** On a top-up shortfall (balance drained concurrently), drain the remaining balance and log a warning rather than silently skipping the charge. `spendCredits` is all-or-nothing on shortfall.

## Intentionally NOT charged
**Why:** these are passive/background, not deliberate user actions — charging would feel like surprise billing.
- Auto-firing suggestions that run on every email view.
- Passive background writing-style learning.
- Deterministic language detection (no AI cost).

## Trial & referral
- Trial uses a **Stripe-managed trial** (`trial_period_days`), not immediate charge — the checkout UI promises "Due today $0.00". Because `invoice.paid` does not fire during a trial, monthly credits are granted on the `subscription.created` webhook when status is `trialing` (idempotent per subscription).
- Referral "1 month Pro free" must be an **enforceable entitlement, not metadata**: the effective-plan check must honor the active Pro-credit window (lift free→pro, never downgrade premium) **and** the referred user must receive the Pro monthly credit allowance.
- **Credit grants have a global unique index on `reference` (where type='grant').** Any grant that could legitimately repeat across users/events must set an `idempotencyKey` that is unique per event (grantCredits stores `idempotencyKey ?? reference` as the reference). Keying a grant on a shared id (e.g. the referrer's id for a per-referred-user reward) causes collisions and silently dropped grants.

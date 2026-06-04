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

## Charging vs. not charging
**Rule (enforced by review gate):** EVERY executable AI call path must be credit-gated — reserve/spend before the AI call, and refund ONLY when no value was delivered. This includes AI sites outside the main routes file: integration routes (audio/voice, image-generation, streaming chat) AND background jobs (scheduler style-analysis + auto-sort). The only exemption is non-AI/deterministic work. When adding any new AI endpoint, grep all AI call sites and confirm each is preceded by a spend.
**Why:** reviewers repeatedly found "forgotten" AI paths in integration/background code; a single ungated path fails the whole gate.
- **Streaming/multi-step handlers:** once any token is delivered to the client, a later failure (e.g. DB persist) must NOT refund — track a `delivered` flag and refund only when nothing reached the user. Otherwise a post-delivery error gives free AI.
- **Background jobs:** spend before the call; on insufficient balance skip silently (no error/422) since the user didn't actively trigger it.
- **Auto-firing endpoints** (run on email open): charge, but spend atomically and on shortfall return a graceful 200 with `insufficientCredits: true` (NOT 402). Never pre-check-then-reserve — a race can run AI for free.
- Deterministic language detection is the only genuinely-free path (no AI cost).

## Refunds must never reuse a unique grant reference
**Rule:** `refundCredits` (a grant) must NOT set the unique grant `reference` column — store the originating reference as a metadata note instead.
**Why:** a partial unique index on `credit_transactions(reference) WHERE type='grant'` rejects a second refund that reuses the same reference (e.g. a static per-endpoint string), so the second failed AI call stays charged. refundCredits passes no idempotencyKey, so the violation is NOT swallowed — it throws and the (try/catch-wrapped) refund is silently lost.
**How to apply:** any refund/grant that can legitimately repeat must either omit `reference` or carry a per-event unique `idempotencyKey`; never key it on a shared/static value.

## Trial & referral
- Trial uses a **Stripe-managed trial** (`trial_period_days`), not immediate charge — the checkout UI promises "Due today $0.00". Because `invoice.paid` does not fire during a trial, monthly credits are granted on the `subscription.created` webhook when status is `trialing` (idempotent per subscription).
- Referral reward is **25 credits to BOTH the referrer and the referred user**, granted automatically when the referred user connects their first inbox (anti-abuse gate). There is no claiming, no promo code, and no "free Pro month" anymore — the legacy `/api/referrals/claim-reward` endpoint is disabled (410) and the old promo-code path is dead for referrals. The "connected" referral transition is the dedup gate; on a grant failure after the transition, revert the referral to "registered" so a later connect retries (grants are idempotent so retries never double-pay).
- **Credit grants have a global unique index on `reference` (where type='grant').** Any grant that could legitimately repeat across users/events must set an `idempotencyKey` that is unique per event (grantCredits stores `idempotencyKey ?? reference` as the reference). Keying a grant on a shared id (e.g. the referrer's id for a per-referred-user reward) causes collisions and silently dropped grants.

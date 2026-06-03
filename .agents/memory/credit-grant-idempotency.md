---
name: Credit grant idempotency (Stripe webhooks)
description: Why and how credit grants from Stripe webhooks must be idempotent
---

# Credit grants from Stripe webhooks must be idempotent

Stripe **retries** webhook deliveries (on timeout/non-2xx, and occasionally sends
duplicates). Any handler that grants credits on a webhook event can therefore fire more
than once for the same economic event, double-granting real money's worth of credits.

**Rule:** every webhook-driven `grantCredits` call must pass an `idempotencyKey` derived
from a stable Stripe identifier, not just `reference`.
- one-time pack (checkout.session.completed, payment mode): `pack:<session.id>`
- subscription plan line (invoice.paid): `invoice:<invoiceId>:plan`
- add-on line (invoice.paid): `invoice:<invoiceId>:<price.id>`

A single invoice can carry both a plan line and an add-on line, so keying by `invoiceId`
alone collides — always include the price/line discriminator.

**How it works:** `grantCredits` stores `idempotencyKey` as the credit_transactions
`reference` and, inside its transaction, skips (returns the existing lot or null) if a
prior grant with that key exists. `grantPlanMonthlyCredits` also skips its
`lastMonthlyGrantAt` bookkeeping update when the grant was a no-op.

**Hard concurrency guarantee:** a partial unique index
`credit_transactions_grant_reference_unique` on `(reference) WHERE type='grant' AND reference
IS NOT NULL` backstops the in-transaction check. Two truly simultaneous deliveries both pass
the existence check, but only one insert wins; the loser hits a 23505 unique-violation, which
`grantCredits` catches (`isUniqueViolation`) and treats as an idempotent no-op, returning the
winner's lot via `existingGrant()`. The index is partial so spends/refunds reusing a
reference are unaffected. Apply index changes via raw SQL (CREATE UNIQUE INDEX IF NOT EXISTS),
not `db:push`, to avoid its interactive prompt.

**Also note:** referral rewards are granted when the referred user *connects an email
account* (`grantReferralRewardOnConnect`), NOT on subscription payment. Do not re-add a
referral hook in the `invoice.paid` handler — the old `markReferralSubscribed` call there
was obsolete and broken (method was renamed to `markReferralConnected`).

## Non-webhook grants too
The same rule applies to any `grantCredits` call (referrals, manual grants), not just Stripe webhooks. Never store a bare entity id (e.g. a userId) as the grant `reference` with no `idempotencyKey`: a partial unique index on `credit_transactions(reference) WHERE type='grant'` means that bare id can collide with any other grant that happens to use the same value. Always pass a namespaced `idempotencyKey` like `referral:referrer:<id>` so the grant is both idempotent and collision-free.

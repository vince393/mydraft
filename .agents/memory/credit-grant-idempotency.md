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

**Why:** the in-transaction existence check covers the common case (Stripe retries are
sequential). It is not a hard concurrency guarantee — for that, a partial unique index on
`credit_transactions(reference) WHERE type='grant'` would be needed.

**Also note:** referral rewards are granted when the referred user *connects an email
account* (`grantReferralRewardOnConnect`), NOT on subscription payment. Do not re-add a
referral hook in the `invoice.paid` handler — the old `markReferralSubscribed` call there
was obsolete and broken (method was renamed to `markReferralConnected`).

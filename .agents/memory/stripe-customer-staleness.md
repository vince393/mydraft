---
name: Stripe customer id staleness
description: Stored stripeCustomerId can become invalid across Stripe key/mode switches; always validate-or-recreate before use.
---

# Stripe stored customer ids go stale

A user's persisted `stripeCustomerId` can point to a customer that no longer
exists in the *currently configured* Stripe account/mode (test vs live, or a
different account after a key swap). Reusing it directly makes
`checkout.sessions.create` / `setupIntents.create` fail with
`resource_missing` ("No such customer"), surfaced to users as
"Failed to start checkout".

**Rule:** Never trust a stored Stripe customer id. Before using it, retrieve it
and recreate (persisting the new id) on `resource_missing` or deleted. The
shared helper `ensureStripeCustomer(stripe, user)` in `server/routes.ts` does
this — use it for any new Stripe customer-bound flow.

**Why:** The old code only created a customer when none was stored, so any
stale id permanently broke checkout for that user with no self-healing.

**How to apply:** Any time you need a customer id for a Stripe call, call the
helper instead of reading `user.stripeCustomerId` directly.

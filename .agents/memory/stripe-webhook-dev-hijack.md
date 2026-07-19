---
name: Stripe managed webhook — dev must never configure it
description: Dev startup hijacked production's Stripe webhook, silently breaking paid credit refills.
---
Rule: only production (gate on `REPLIT_DEPLOYMENT`) may run the Stripe sync lib's `findOrCreateManagedWebhook`; dev must skip it.
**Why:** the manager deletes any other managed webhook it finds — a dev workspace start deleted the live site's webhook and pointed it at the dev URL, so prod missed `invoice.paid` and paying users never got monthly credits.
**How to apply:** any new managed-webhook or Stripe sync setup code must be deployment-gated; monthly credit grants must also have a lazy self-heal path (all plans) so a missed webhook can't starve users. Cross-path double-grant safety: CAS claim on `lastMonthlyGrantAt` + per-cycle idempotency key + webhook-side dedup against recent lazy grants within one cycle window.

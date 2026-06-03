---
name: On-site Stripe checkout (Elements, no redirect)
description: How credit packs/add-ons and plans collect cards on-site via Stripe Elements instead of hosted checkout, and the safety rules that flow.
---

On-site checkout uses `@stripe/react-stripe-js` Card Elements + `GET /api/stripe/publishable-key` + `loadStripe`, mirroring the plan checkout. The shape differs by billing type:

- **One-time (credit packs):** server creates a **PaymentIntent** (authoritative amount/metadata) → client `stripe.confirmCardPayment` → a `confirm-*` endpoint grants the goods after verifying `pi.metadata.userId === user.id`, `type`, and `status === 'succeeded'`.
- **Recurring (add-ons, plans):** server creates a **SetupIntent** → client `stripe.confirmCardSetup` → a `confirm-*` endpoint attaches the PM, sets it default, and creates the subscription. Credits/plan are granted by the `invoice.paid` webhook; the add-on row is recorded by the `customer.subscription.created` webhook.

**Rules that matter:**
- The synchronous confirm endpoint and the Stripe webhook must grant with the **same idempotencyKey** (e.g. `pack:pi:<id>`) so browser-confirm + webhook never double-grant. The confirm endpoint gives instant balance; the webhook is the durability backup if the tab closes.
- **Server-side subscription creation must be guarded against duplicates.** A confirm endpoint that always calls `subscriptions.create` will double-charge on retry/double-submit. Before creating, list the customer's subscriptions and bail out (return the existing one) if a live sub (`active|trialing|past_due|incomplete`) already exists with matching `metadata.sku`+`type`.

**Why:** PaymentIntents do not fire `checkout.session.completed`, so the old hosted-checkout grant path doesn't cover them; and subscription creates are not idempotent by default.

---
name: Stripe wallet payments (Apple Pay / Google Pay)
description: How wallet buttons are wired into the custom Stripe checkout, and the gotchas that make them actually work live.
---

Wallet buttons (Apple Pay / Google Pay) use Stripe's **Payment Request API**
(`PaymentRequestButtonElement`), NOT a redirect to a Stripe-hosted page — the
user wants to keep their own custom checkout design.

**Why Payment Request API over Express Checkout / Checkout Sessions:** it drops
into the existing `<Elements stripe={stripePromise}>` providers (no deferred
mode / no clientSecret-on-Elements needed) without disturbing the classic split
Card Elements flow, and yields a `paymentMethod.id` that the existing
`confirmCardSetup`/`confirmCardPayment` + confirm endpoints already accept.

**Gotchas (each one cost real debugging):**
- Apple Pay only renders for real wallet-capable visitors on the **live,
  registered domain** — it never shows in the Replit dev preview. Gate render on
  `canMakePayment()` and render nothing when falsy (don't show a dead button).
- Wallets **reject a $0 total**. For trial plans (charge $0 today) set the
  wallet total to the recurring price with an "(after trial)" label; only a
  SetupIntent runs, so nothing is actually charged today.
- `ev.complete(...)` must be called **exactly once** — a second call throws, and
  never calling it leaves the wallet sheet spinning forever. The reusable
  component intercepts `ev.complete` to track completion and force a `fail`
  fallback if the handler throws/returns without completing.
- Apple Pay domain verification file is the **same for every Stripe account**
  (it's Stripe's merchant id). Serve it at exactly
  `/.well-known/apple-developer-merchantid-domain-association` as a **200 with no
  trailing slash**. Source: `https://stripe.com/files/apple-pay/apple-developer-merchantid-domain-association`
  (the `/.well-known/...` path on stripe.com 404s — use `/files/apple-pay/...`).
- Register domains with `stripe.paymentMethodDomains.create/list/validate`
  (modern) — works for both Apple Pay and Google Pay. Do it idempotently on
  startup per `REPLIT_DOMAINS` and re-`validate()` if already present.

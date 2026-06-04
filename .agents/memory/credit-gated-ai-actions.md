---
name: Adding a credit-gated AI action (badge + 402 handling)
description: Two easy-to-miss steps when wiring an AI feature into the credit economy
---

When adding any new AI action that should cost credits, two things are easy to
forget and both produce the same class of bug (no cost shown + confusing failure
when the user is out of credits):

1. **Register the action in `CREDIT_COSTS` (server/credits.ts).** The public
   `/api/credits/config` endpoint returns `CREDIT_COSTS` wholesale, and the
   frontend `CreditCostBadge` / `useActionCost(action)` reads `config.costs[action]`.
   If the action key is missing, the badge silently renders nothing (cost ≤ 0).
   This applies even for dynamic-cost actions that reserve credits via
   `reserveCreditsAmount` (an explicit amount) rather than `reserveCredits` — the
   map entry is still needed just to drive the badge. For dynamic actions, the map
   value is the entry/floor cost.

2. **Don't show a generic error toast on 402.** `apiRequest` (client/src/lib/
   queryClient.ts) centrally shows the "Not enough credits / Top up" toast on a 402
   via `maybeHandleInsufficientCredits`, then throws. A mutation's `onError` that
   blindly toasts "X failed" will double-toast or mask the real reason. `apiRequest`
   attaches `status` to the thrown Error, so guard with
   `if (err?.status === 402) return;` before the generic toast.

**Why:** the backend (`reserveCredits` / `reserveCreditsAmount`) is the authoritative
gate and returns `402 { code: "INSUFFICIENT_CREDITS" }`. The badge is purely a
frontend affordance driven by the config map. The two layers are wired independently,
so a feature can be fully gated server-side yet show no cost and a wrong error.

---
name: credit gating pattern
description: How AI endpoints charge credits — flat reserve-then-cancel vs dynamic reserve-1-then-settle, and which endpoints are intentionally free.
---

# Credit gating pattern for AI endpoints

All credit helpers live in `server/routes.ts` (`reserveCredits`, `reserveCreditsAmount`, `cancelReservation`, `Reservation` interface) on top of the engine in `server/credits.ts`. A "reservation" is an *immediate* FIFO spend that can be refunded via `cancelReservation`.

## Flat endpoints (fixed cost)
Pattern: `const r = await reserveCredits(req,res,ACTION,ref); if(!r) return;` then `try { ...AI... } catch(aiErr){ await cancelReservation(r); throw aiErr; }`. Used for ai_reply, ai_summary, ai_rewrite (drafts/polish, ai/review), grammar_check, translate, ai_chat (assistant/chat), etc.

## Dynamic endpoints (per-item cost) — auto-sort, inbox-refresh
Reserve **1** up front (blocks zero-balance users + wins the concurrency race), then **settle** to the real per-item count after the work is done.
- Hoist `let reservation: Reservation | null = null;` **before** the handler `try` so the outer `catch` can refund on any non-AI failure; set it to `null` right after settling so the outer catch can't double-refund.
- Top-up the extra (`count - 1`) with `spendCredits`; `spendCredits` is all-or-nothing on shortfall (`success:false`, spends 0). On shortfall, drain remaining `getBalance()` so delivered work is never free, and log a `top-up shortfall` warning. Wrap settlement in try/catch so it never throws.
- inbox-refresh bills **only persisted AI suggestions**: exclude rule-based ones via `ruleIds = new Set(ruleSuggestions.map(s=>s.messageId))` and count `createdSuggestions` not in that set. `billable===0` → refund the held credit.

## Intentionally NOT credit-gated
**Why:** charging these would bill users for passive/background behavior, not deliberate AI actions.
- `ai/quick-suggestion` — auto-fires on every email view via a `useEffect` (client/src/components/ai-suggestion-bar.tsx); gating would bill users just to open an email.
- `writing-style/analyze` — passive Pro background style learning, not a user-invoked action.

## Trial billing
`confirm-subscription` creates the Stripe sub with `trial_period_days: TRIAL_DAYS` (no charge today — matches the checkout UI's "Due today $0.00"). Because `invoice.paid` does not fire during a trial, the `customer.subscription.created` webhook grants plan monthly credits when `status==='trialing'` (synthetic idempotency key `trialstart_<subId>`). A second grant at the first real `invoice.paid` is normal monthly-cycle behavior, not a double-grant.

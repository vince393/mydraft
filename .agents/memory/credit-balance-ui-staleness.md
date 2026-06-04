---
name: Credit balance UI staleness
description: Why the displayed credit balance can look "never charged" even when the server deducts correctly
---

# Credit balance looks like it never decreases

**Symptom:** User reports "AI features don't take any of my credits." The backend
*is* charging (verify against the production DB: `credit_transactions` has `spend`
rows for `ai_reply`, `ai_summary`, `inbox_refresh`, etc.). The dev DB is usually
empty of grants/spends, so it is NOT a reliable place to diagnose this — query
production read-only.

**Root cause:** The balance comes from a single TanStack query
(`queryKey: ["/api/credits"]`, via `useCredits()`). AI action mutations did not
invalidate it, so the sidebar number stayed stale until a full page reload — making
it look like nothing was charged.

**Fix / rule:** Refresh the balance centrally, not per call site. A global
`MutationCache` `onSuccess` in `client/src/lib/queryClient.ts` invalidates
`["/api/credits"]` and `["/api/credits/transactions"]` after *every* successful
mutation.

**Why central:** Dozens of scattered AI mutations exist; relying on each one to
remember to invalidate credits is the exact failure mode that caused this bug.
Broad invalidation is cheap (one small GET when the sidebar observer is active) and
guarantees the shown balance always matches the server.

**How to apply:** When the displayed balance ever seems wrong, first confirm
server-side spends in the prod DB before touching charging logic — the bug is far
more likely to be a missing client invalidation than a missing deduction.

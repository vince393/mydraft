---
name: Email-account connection uniqueness
description: One email address may connect to only one MyDraft user; how it's enforced and why no UNIQUE index.
---

A given mailbox (Gmail/Microsoft/IMAP) must map to exactly ONE MyDraft account, to stop credit farming (reconnecting the same inbox on a fresh account to re-trigger referral + monthly credit grants).

**Invariant & enforcement:** every connect path (create AND reconnect, all providers) writes through ONE atomic storage method that takes a Postgres transaction-level advisory lock on the normalized email, re-checks ownership with a `lower(trim(email))` comparison (so legacy un-normalized rows are caught), then inserts or updates. It returns whether the row was newly created so callers fire welcome/referral/activity side effects only on a genuine first connect. Emails are always stored normalized (lower+trim). The earlier bug class: protecting only the create branch left the reconnect/update branch race-vulnerable — both branches must share the locked path.

**Why an advisory lock and NOT a UNIQUE index on the email column:** a UNIQUE index is applied to production by the publish-time schema diff, which FAILS if a duplicate already exists in prod (it did once). The same publish also ships the cleanup tool that would remove the duplicate — so the index step failing blocks the very tool that fixes it (deadlock). The advisory lock gives the same DB-enforced guarantee with no schema diff and no prod-migration risk.

**Existing-duplicate cleanup:** the agent cannot write production data (prod is read-only to the agent). So pre-existing duplicates are cleared by an owner-only action (dedup keeps the earliest `created_at`, deletes the rest, and normalizes the surviving row's email). Owner runs it once on the live site after publish.

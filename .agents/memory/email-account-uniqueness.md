---
name: Email-account connection uniqueness
description: One email address may connect to only one MyDraft user; how it's enforced and its gaps.
---

A given mailbox (Gmail/Microsoft/IMAP) must map to ONE MyDraft account, to stop credit farming (reconnecting the same inbox on a new account to re-trigger referral + monthly credit grants).

**Enforcement:** app-level only. Each connect path (IMAP route, Google + Microsoft OAuth callbacks) calls `getEmailAccountByEmail` and rejects when an existing row has a different `user_id` (IMAP -> 409 JSON; OAuth -> redirect `/connect-email?error=email_in_use`, banner shown). Self-reconnect (same user) is allowed. Always persist the email normalized (`lower().trim()`) — `getEmailAccountByEmail` normalizes the lookup input, so an un-normalized stored value would be missed.

**Why:** `email_accounts.email` has NO DB unique constraint. So the guard is check-then-write and is race-vulnerable, and historically prod already had a real duplicate (one gmail on two accounts) created before the guard existed.

**How to apply:** if hardening to a DB-level guarantee, first dedupe existing rows (destructive — pick which account keeps the email, needs user consent), THEN add a unique index on `lower(trim(email))` and map unique-violation errors to the same friendly 409 / email_in_use message. Don't add the unique index blindly or the prod migration fails on existing duplicates.

---
name: Account soft-delete / restore auth gating
description: Every auth entry point must reject soft-deleted (deletedAt) users; restore must respect the 30-day window and 2FA.
---

# Account soft-delete / restore

Account deletion is a 30-day soft delete: `users.deletedAt` is set, plan downgraded to free, Stripe subs cancelled, refresh tokens revoked. A scheduled purge permanently deletes after the window; restore reactivates within it.

## Rule: gate EVERY auth entry point on `deletedAt`, not just password login
A soft-deleted user still has a valid password hash, valid sessions, valid JWT/refresh tokens, and a valid device-switch token. Blocking only the password-login route leaves several bypasses. All of these must reject a `deletedAt` user:
- central `requireAuth` middleware (covers all protected routes)
- `/api/auth/me` (destroy session)
- mobile `/api/auth/mobile/refresh` (revoke tokens + 401)
- `/api/auth/device-switch`
- OAuth google/microsoft login callbacks
- password login + mobile login + register + mobile register (409 accountPendingDeletion)

**Why:** the first architect review FAILED specifically because these surfaces were unguarded — the password route was the only one checking `deletedAt`.
**How to apply:** when adding any NEW way to obtain a session or token, add the `deletedAt` check there too.

## Rule: restore paths must honor the 30-day window AND 2FA
- Both password restore (`/api/auth/restore`) and OAuth auto-restore must compute `purgeAt = deletedAt + ACCOUNT_RESTORE_DAYS` and refuse if elapsed (password → 410; OAuth → redirect `/login?error=restore_window_expired`). Otherwise an account past its window is silently revived before the purge job runs.
- `/api/auth/restore` must enforce 2FA when `twoFactorEnabled` (email a `login` code, return `{requires2FA:true}`, verify on resubmit) — otherwise it's a 2FA bypass, since deleted-account password login returns the restore prompt BEFORE the normal 2FA step.

**Why:** second architect review FAILED on exactly these two (2FA bypass via restore; OAuth restore ignoring the window).

## OAuth auto-restore vs password restore
OAuth login auto-restores (no plan prompt friction) because completing OAuth proves mailbox ownership, and OAuth-created users have random passwords so they cannot use the password-restore flow. Password restore is explicit (re-verify password, + 2FA if enabled). Both redirect the user to `/select-plan` after restore (account is on free).

---
name: Email cache sync
description: How the cached_emails DB store relates to live provider fetches, and the rule that keeps it durable.
---

# Email list cache (cached_emails)

The inbox loads in two passes: a `?cached=true` read from the `cached_emails`
table for instant paint, then a live provider fetch that overlays
`local_email_states` (folder/read overrides) and `starred_emails`.

**Rule: the cache must accumulate, never wipe.** `saveCachedEmails` upserts on the
unique `(userId, nylasId)` index. Do NOT reintroduce a delete-all-then-insert —
that caps the cache at one fetch (~100/folder) and is the original cause of
"not all my emails load."

**Why body is excluded from the upsert update-set:** the list fetch path stores an
empty body, so updating body on conflict would clobber any previously-cached full
body. Insert sets body; conflict leaves it untouched.

**How to apply / gotchas:**
- Provider `getMessages` accepts `options.limit` (default 100) for all three
  providers (gmail/microsoft/imap); the `/api/emails` route raises inbox to 300.
- Non-inbox folders in allFolders mode are still capped per single fetch; deep
  historical backfill would need provider pagination (pageToken/delta/UID) — not
  yet implemented.
- The cache grows with mailbox history (bounded by unique message IDs). A
  retention/prune policy is a known future need.
- Frontend renders a windowed slice (IntersectionObserver sentinel) — select-all
  still operates on the full filtered set, not the visible slice.

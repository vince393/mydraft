---
name: Email cache sync
description: How the cached_emails DB store relates to live provider fetches, and the rule that keeps it durable.
---

# Email list cache (cached_emails)

The inbox loads in two passes: a `?cached=true` read from the `cached_emails`
table for instant paint, then a live provider fetch that overlays
`local_email_states` (folder/read overrides) and `starred_emails`.

**Rule: the cache must accumulate, never wipe globally.** `saveCachedEmails` does an
application-level upsert: for ONLY the ids in the current sync it deletes existing
rows then re-inserts one row each, all in a transaction. Do NOT reintroduce a
delete-ALL-then-insert for the whole user — that caps the cache at one fetch
(~100/folder) and is the original cause of "not all my emails load."

**Why no DB unique index on (userId, nylasId):** an earlier version added a unique
index, but production already held legacy duplicate rows from the old wipe-insert
behavior, so creating the unique index FAILED at publish ("could not create unique
index … conflicts with existing data"). Since cached_emails is a disposable cache
and prod is read-only to the agent (no prod migration scripts allowed), dedup was
moved into app code and the index made NON-unique. The per-id delete-then-insert
also self-heals legacy duplicates as each message is re-synced.
**Why:** publish creates schema via dev→prod diff; a UNIQUE index can never be built
over dirty prod data, and we cannot clean prod directly — so don't depend on one.

**Why body is preserved on re-insert:** the list fetch path sends an empty body, so
saveCachedEmails first SELECTs existing bodies and reuses a stored full body when the
incoming body is empty (keyed per id), instead of clobbering it.

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

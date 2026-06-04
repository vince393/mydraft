---
name: drafts.emailId is an integer column
description: Saving a draft tied to an email can 500 if you pass a non-numeric provider id into drafts.emailId.
---

The `drafts.emailId` column is an **integer**, but an email's runtime id (`originalEmail.id` / `getEmailId`) is frequently a **non-numeric provider id** (e.g. Gmail/Nylas string). Passing that string straight into `POST /api/drafts` makes the integer insert fail with a 500.

**Why:** the app surfaces provider string ids everywhere for fetching, but the drafts table keys email association on a numeric column. The mismatch only bites on the write path (save draft from reply/forward), not on reads.

**How to apply:** before sending `emailId` to `/api/drafts`, only include it when it parses to a valid integer (`Number.isInteger(Number(id))`); otherwise omit it (it's nullable). The same caution applies to any other writer of `drafts.emailId` (e.g. ai-draft-dialog), which has the latent bug too.

---
name: Microsoft Graph per-mailbox concurrency cap
description: Why parallel Graph fan-out causes ErrorTooManyObjectsOpened and how the request layer guards against it
---

Microsoft Graph caps how many connections can be open against a **single mailbox**
at once (~4). Exceeding it returns a 5xx whose body contains
`ErrorTooManyObjectsOpened` ("Too many concurrent connections opened. Cannot open
mailbox."). This is per-mailbox, not per-app and not a normal 429 rate limit.

**Why this bit us:** several endpoints fan out parallel `getMessages` calls to the
same mailbox (e.g. an all-folders fetch over 5 folders + an unread-counts fetch
over 3 folders, both triggered together on inbox load) → up to ~8 concurrent
connections to one mailbox → thousands of errors. The old retry layer only
recognized 429/503/504, not this error, so it never backed off.

**Rule:** never let parallel Graph calls to one mailbox exceed a few in flight.
The fix lives in the Graph request layer (`server/microsoft.ts`): a per-access-token
concurrency gate (semaphore + FIFO queue, cap 3) that every request passes through,
plus detection of `ErrorTooManyObjectsOpened` in 5xx bodies so it is retried with
backoff like throttling. The gate makes individual call sites' `Promise.all`
fan-out safe — they queue instead of stampeding.

**How to apply:** when adding new Graph endpoints/fan-out, route through the existing
gate (don't bypass `graphRequest`). Keying is by access token; it is stable within a
burst because tokens only refresh when near expiry. A mailbox-stable key (account id)
would be marginally more correct across refresh windows but requires threading an
account id through the provider interface — not worth it so far.

---
name: Honest inbox sync failure surfacing
description: Principle that inbox sync/search must prove freshness and never present a failure as "empty/no results".
---

# Honest inbox sync failure surfacing

Any mail-fetching path (inbox sync AND provider search) must surface failures honestly, never let a failure read as "no mail" / "no results".

- Distinguish **auth failure** (revoked/expired credentials → user must reconnect; do NOT auto-retry) from **transient failure** (provider/network hiccup → offer retry). The frontend maps these to a reconnect banner vs a retry banner respectively.
- A search request that fails must NOT be coerced to an empty array — that produces a false "no results anywhere in your mailbox". Propagate the failure and show the reconnect/retry state.
- Freshness must be provable: show a real "last successfully synced" timestamp; only a *successful* fetch advances it.

**Why:** the whole point of the "trustworthy, always-current inbox" work was that a silent failure left stale mail (or a false empty state) on screen with no signal, destroying user trust. A code review rejected an earlier revision precisely because search failures were swallowed into `[]`.

**How to apply:** when adding a new mail fetch/search endpoint, classify errors into the auth-vs-transient split and have the client render the honest recovery UI. Keep provider search results consistent with the normal list shape (same thread-collapsing/grouping) so search doesn't look like a different product.

**Also:** the email-sync WebSocket must derive identity from the authenticated session, never from a client-supplied param — a background poller keyed on "active WS users" turns any spoofable identity into a way to burn a victim's provider quota.

**WS session auth — do NOT run express-session with a fake response object** (`middleware(req, {} as any, next)`): it monkey-patches `res.end`/`writeHead` and can throw or fail to hydrate the session. Resolve identity on the upgrade by parsing the signed cookie (`cookie.parse` → strip `s:` → `cookie-signature.unsign` with the app secret → `store.get(sid)`). Export the session store + cookie name + secret(s) from where `session()` is configured and pass them to the WS setup.

**Never present stale-as-fresh:** once a fresh provider fetch resolves, use its result even when it's *empty* (deletes/archives/moves must disappear); only fall back to the cached copy before the first successful fresh fetch. A successful empty fetch that falls back to cache while advancing the "synced" timestamp is a review-blocking bug.

**Background currency needs a connect-time poll:** a fixed-interval poller that only broadcasts on a change *after* seeding a baseline will silently absorb any change that happens before its first tick. Trigger an immediate poll on the 0→1 WS-connect transition, and have the client refetch on WS *reconnect* (server can't detect changes that happened while the client was disconnected since its baseline is dropped).

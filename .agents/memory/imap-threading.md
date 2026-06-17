---
name: IMAP email threading
description: How IMAP conversations are grouped, since IMAP has no native thread id.
---

IMAP has no native conversation/thread id (unlike Gmail's `threadId` and Outlook's
`conversationId`). To group an IMAP message with its replies, derive a stable
conversation key in `server/imap.ts` (`deriveImapThreadId`): thread root = first id
in the `References` header → else `In-Reply-To` → else the message's own Message-ID →
else UID.

**Why:** previously IMAP used each message's OWN Message-ID as `threadId`, so every
message became its own one-message thread and replies never grouped.

**How to apply:**
- ALWAYS normalize message-ids before comparing/keying (`normalizeMessageId`: strip
  surrounding `<>`, trim, lowercase). The list path (ImapFlow `envelope.messageId`)
  returns BARE ids (`id@host`) while the `References` header and mailparser return
  BRACKETED ids (`<id@host>`). Without normalization the same id keys differently
  and a thread root won't match its replies, splitting the thread.
- The list fetch (`getMessages`) must request `headers: ["references"]` — `References`
  is NOT in the IMAP envelope. The detail fetch (`getMessage`) gets references from
  mailparser's parsed result.
- Known limitation: if a client sets only `In-Reply-To` (no `References`), deep replies
  key off their immediate parent, not the root, so a long chain can fragment. Most
  modern clients set `References`, so this is rare.
- `threadId` is persisted in `cached_emails` during sync, so grouping survives reloads.

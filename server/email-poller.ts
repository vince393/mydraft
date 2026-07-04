import { storage } from "./storage";
import { gmailProvider } from "./gmail";
import { microsoftProvider } from "./microsoft";
import { imapProvider } from "./imap";
import type { IEmailProvider } from "./email-provider";
import { getActiveUserIds, broadcastSyncToUser, registerUserConnectHandler } from "./ws-email-sync";

// Background live-currency poller. Task-sanctioned interval fallback for providers
// without reliable push: while a user has the app open (a live WebSocket), we
// poll their inbox on a modest interval, and only broadcast a "sync" (which makes
// the client refetch) when the mailbox actually changed. This keeps the inbox
// current without the cost/complexity of provider webhooks, and only runs for
// users who are actively looking, so we never burn provider quota on idle users.

const POLL_INTERVAL_MS = 60 * 1000;
// Small inbox window is enough to cheaply detect the common changes (new mail,
// deletions, read/unread near the top).
const POLL_LIMIT = 25;
// The top-window signature can't see changes to older mail (e.g. archiving a
// message on page 3 elsewhere). To still reconcile those "always-current"
// requires eventually pulling fresh regardless, so every Nth interval tick we
// force a broadcast for each active user. 10 ticks ≈ 10 minutes.
const FORCED_REFRESH_EVERY_CYCLES = 10;

let pollTimer: NodeJS.Timeout | null = null;
let pollRunning = false;

// Per-user snapshot of the last-seen inbox so we only broadcast on real change.
const lastSignatureByUser = new Map<string, string>();
// Per-user interval-tick counter driving the periodic forced refresh above.
const cycleCountByUser = new Map<string, number>();

function computeSignature(messages: Array<{ id: string; isRead: boolean }>): string {
  // Order-independent enough for change detection: newest id + count + unread
  // count + read-state of the top slice. New mail, deletions, and read/unread
  // changes made elsewhere all move the signature.
  const top = messages.slice(0, POLL_LIMIT);
  const ids = top.map((m) => `${m.id}:${m.isRead ? 1 : 0}`).join(",");
  return `${messages.length}|${ids}`;
}

async function resolveProvider(
  userId: string,
): Promise<{ provider: IEmailProvider; accessToken: string } | null> {
  const account = await storage.getEmailAccount(userId);
  if (!account) return null;

  if (account.provider === "imap") {
    return { provider: imapProvider, accessToken: account.accessToken };
  }

  const emailProvider: IEmailProvider =
    account.provider === "google" ? gmailProvider : microsoftProvider;

  const isExpired =
    account.tokenExpiresAt &&
    new Date(account.tokenExpiresAt).getTime() < Date.now() + 5 * 60 * 1000;

  if (isExpired) {
    try {
      const refreshed = await emailProvider.refreshAccessToken(account.refreshToken);
      await storage.updateEmailAccount(userId, {
        accessToken: refreshed.accessToken,
        tokenExpiresAt: refreshed.expiresAt,
      });
      return { provider: emailProvider, accessToken: refreshed.accessToken };
    } catch {
      // Auth error — the /api/emails path surfaces the reconnect prompt. The
      // poller stays silent so it doesn't spam failures.
      return null;
    }
  }

  return { provider: emailProvider, accessToken: account.accessToken };
}

async function pollUser(userId: string, force = false): Promise<void> {
  const resolved = await resolveProvider(userId);
  if (!resolved) return;

  let messages: Array<{ id: string; isRead: boolean }>;
  try {
    // The provider impls route per-mailbox calls through their own concurrency
    // gates (e.g. Microsoft), so a light poll is safe alongside on-demand syncs.
    messages = (await resolved.provider.getMessages(resolved.accessToken, {
      folder: "inbox",
      limit: POLL_LIMIT,
    })) as Array<{ id: string; isRead: boolean }>;
  } catch {
    // Transient provider hiccup — skip this cycle, don't broadcast.
    return;
  }

  const signature = computeSignature(messages);
  const previous = lastSignatureByUser.get(userId);
  lastSignatureByUser.set(userId, signature);

  // First observation just seeds the baseline. This runs immediately on WS
  // connect (see registerUserConnectHandler below), right after the client's own
  // fresh load, so the baseline reflects what the client already has and we don't
  // fire a redundant refetch. Any change AFTER this seed moves the signature and
  // triggers a broadcast. The client separately refetches on WS reconnect, which
  // covers changes that happened while it was disconnected (its baseline here is
  // dropped on disconnect, so we can't detect those server-side).
  //
  // `force` bypasses top-window change detection for the periodic reconciliation
  // sweep, so changes to older mail outside POLL_LIMIT are eventually surfaced.
  // We still never broadcast on the very first observation (previous undefined),
  // to avoid a redundant refetch right after the client's own load.
  const changed = previous !== undefined && previous !== signature;
  if (changed || (force && previous !== undefined)) {
    broadcastSyncToUser(userId);
  }
}

// Poll a single user right now, guarding against overlapping runs for the same
// user (an interval tick could coincide with a connect-triggered poll).
const inFlightUsers = new Set<string>();
async function pollUserOnce(userId: string, force = false): Promise<void> {
  if (inFlightUsers.has(userId)) return;
  inFlightUsers.add(userId);
  try {
    await pollUser(userId, force);
  } catch (err) {
    console.error(`[EmailPoller] Immediate poll failed for user ${userId}:`, err);
  } finally {
    inFlightUsers.delete(userId);
  }
}

async function runPollCycle(): Promise<void> {
  if (pollRunning) return;
  pollRunning = true;
  try {
    const activeUserIds = getActiveUserIds();
    const activeSet = new Set(activeUserIds);

    // Drop snapshots for users who disconnected so memory doesn't grow forever.
    for (const userId of Array.from(lastSignatureByUser.keys())) {
      if (!activeSet.has(userId)) lastSignatureByUser.delete(userId);
    }
    for (const userId of Array.from(cycleCountByUser.keys())) {
      if (!activeSet.has(userId)) cycleCountByUser.delete(userId);
    }

    for (const userId of activeUserIds) {
      const count = (cycleCountByUser.get(userId) ?? 0) + 1;
      cycleCountByUser.set(userId, count);
      const force = count % FORCED_REFRESH_EVERY_CYCLES === 0;
      await pollUserOnce(userId, force);
    }
  } catch (err) {
    console.error("[EmailPoller] Poll cycle failed:", err);
  } finally {
    pollRunning = false;
  }
}

let connectHandlerRegistered = false;

export function startEmailPoller(): void {
  if (pollTimer) return;
  console.log("[EmailPoller] Starting background inbox poller (active users only)");

  // Poll immediately when a user connects so the blind window between their load
  // and the first interval tick is ~0 instead of up to POLL_INTERVAL_MS.
  if (!connectHandlerRegistered) {
    registerUserConnectHandler((userId) => { void pollUserOnce(userId); });
    connectHandlerRegistered = true;
  }

  pollTimer = setInterval(runPollCycle, POLL_INTERVAL_MS);
}

export function stopEmailPoller(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  lastSignatureByUser.clear();
  cycleCountByUser.clear();
}

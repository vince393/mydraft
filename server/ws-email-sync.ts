import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer, IncomingMessage } from "http";
import { parse as parseCookie } from "cookie";
import { unsign } from "cookie-signature";

const userConnections = new Map<string, Set<WebSocket>>();
let pingInterval: NodeJS.Timeout | null = null;

// Handlers invoked when a user goes from 0 -> 1 live connections (i.e. they just
// opened the app / reconnected). The poller registers here so it can run an
// immediate poll for that user instead of leaving them blind until the next
// interval tick — this closes the "change happened before the first poll" gap.
const userConnectHandlers: Array<(userId: string) => void> = [];
export function registerUserConnectHandler(cb: (userId: string) => void) {
  userConnectHandlers.push(cb);
}

export interface SessionResolverConfig {
  // The same session store the HTTP app writes to (connect-pg-simple etc.).
  store: { get(sid: string, cb: (err: any, session: any) => void): void };
  // Cookie name express-session is configured with (default "connect.sid").
  cookieName: string;
  // Signing secret(s) used to verify the signed session id.
  secrets: string[];
}

// Resolve the authenticated user id from the request's signed session cookie by
// looking the session up directly in the shared store. We deliberately do NOT
// run the express-session middleware with a fake response object here — that
// pattern is fragile (the middleware monkey-patches res.end/writeHead and can
// throw or fail to hydrate the session). Parsing the cookie, verifying the
// signature, and calling store.get is the robust, well-defined path.
//
// We never trust a client-supplied identity (e.g. a ?userEmail= query param):
// an attacker who knows a victim's email must not be able to mark them "active"
// and force the background poller to burn the victim's provider quota.
function resolveSessionUserId(
  config: SessionResolverConfig,
  request: IncomingMessage,
): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const header = request.headers.cookie;
      if (!header) return resolve(null);

      const raw = parseCookie(header)[config.cookieName];
      if (!raw) return resolve(null);

      // express-session prefixes signed cookies with "s:".
      const signed = raw.startsWith("s:") ? raw.slice(2) : raw;
      let sid: string | false = false;
      for (const secret of config.secrets) {
        const candidate = unsign(signed, secret);
        if (candidate !== false) {
          sid = candidate;
          break;
        }
      }
      if (sid === false) return resolve(null);

      config.store.get(sid, (err, sessionData) => {
        if (err || !sessionData) return resolve(null);
        const userId = sessionData.userId;
        resolve(typeof userId === "string" && userId.length > 0 ? userId : null);
      });
    } catch {
      resolve(null);
    }
  });
}

export function setupEmailSyncWebSocket(httpServer: HttpServer, sessionConfig: SessionResolverConfig) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", async (request, socket, head) => {
    try {
      const url = new URL(request.url || "", "http://localhost");
      if (url.pathname !== "/ws/email-sync") return;

      const userId = await resolveSessionUserId(sessionConfig, request);
      if (!userId) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request, userId);
      });
    } catch (err) {
      console.error("[ws/email-sync] upgrade error:", err);
      try { socket.destroy(); } catch {}
    }
  });

  wss.on("connection", (ws: WebSocket & { isAlive?: boolean; userId?: string }, _req: IncomingMessage, userId: string) => {
    try {
      ws.userId = userId;
      ws.isAlive = true;

      let set = userConnections.get(userId);
      if (!set) {
        set = new Set();
        userConnections.set(userId, set);
      }
      const wasEmpty = set.size === 0;
      set.add(ws);

      // Fire connect handlers only on the 0 -> 1 transition so an immediate poll
      // runs when the user (re)opens the app, not on every extra tab.
      if (wasEmpty) {
        for (const handler of userConnectHandlers) {
          try { handler(userId); } catch (e) { console.error("[ws/email-sync] connect handler error:", e); }
        }
      }

      ws.on("pong", () => { ws.isAlive = true; });
      ws.on("close", () => {
        const s = userConnections.get(userId);
        if (s) {
          s.delete(ws);
          if (s.size === 0) userConnections.delete(userId);
        }
      });
      ws.on("error", () => {
        try { ws.close(); } catch {}
      });
    } catch (err) {
      console.error("[ws/email-sync] connection error:", err);
      try { ws.close(1011, "Server error"); } catch {}
    }
  });

  if (!pingInterval) {
    pingInterval = setInterval(() => {
      wss.clients.forEach((client) => {
        const ws = client as WebSocket & { isAlive?: boolean };
        if (ws.isAlive === false) {
          try { ws.terminate(); } catch {}
          return;
        }
        ws.isAlive = false;
        try { ws.ping(); } catch {}
      });
    }, 30000);
  }

  console.log("[ws/email-sync] WebSocket server ready at /ws/email-sync");
}

export function broadcastSyncToUser(userId: string) {
  const set = userConnections.get(userId);
  if (!set || set.size === 0) return;
  const payload = JSON.stringify({ type: "sync" });
  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.send(payload); } catch {}
    }
  }
}

// Users with at least one live WebSocket connection. The background poller only
// polls these users so we never burn provider quota for people who aren't
// actively looking at their inbox.
export function getActiveUserIds(): string[] {
  const active: string[] = [];
  for (const [userId, set] of userConnections.entries()) {
    if (set.size > 0) active.push(userId);
  }
  return active;
}

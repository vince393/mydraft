import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer, IncomingMessage } from "http";
import { storage } from "./storage";

const userConnections = new Map<string, Set<WebSocket>>();
let pingInterval: NodeJS.Timeout | null = null;

export function setupEmailSyncWebSocket(httpServer: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    try {
      const url = new URL(request.url || "", "http://localhost");
      if (url.pathname !== "/ws/email-sync") return;

      const userEmail = url.searchParams.get("userEmail");
      if (!userEmail) {
        socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request, userEmail);
      });
    } catch (err) {
      console.error("[ws/email-sync] upgrade error:", err);
      try { socket.destroy(); } catch {}
    }
  });

  wss.on("connection", async (ws: WebSocket & { isAlive?: boolean; userId?: string }, _req: IncomingMessage, userEmail: string) => {
    try {
      const user = await storage.getUserByEmail(userEmail.toLowerCase());
      if (!user) {
        ws.close(1008, "Unknown user");
        return;
      }

      ws.userId = user.id;
      ws.isAlive = true;

      let set = userConnections.get(user.id);
      if (!set) {
        set = new Set();
        userConnections.set(user.id, set);
      }
      set.add(ws);

      ws.on("pong", () => { ws.isAlive = true; });
      ws.on("close", () => {
        const s = userConnections.get(user.id);
        if (s) {
          s.delete(ws);
          if (s.size === 0) userConnections.delete(user.id);
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

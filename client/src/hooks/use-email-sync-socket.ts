import { useEffect, useRef } from "react";

interface UseEmailSyncSocketOptions {
  userEmail: string | null | undefined;
  enabled?: boolean;
  onSync: () => void;
}

export function useEmailSyncSocket({ userEmail, enabled = true, onSync }: UseEmailSyncSocketOptions) {
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  useEffect(() => {
    if (!enabled || !userEmail) return;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let closedByUser = false;
    let hasOpenedBefore = false;

    const connect = () => {
      if (closedByUser) return;

      // Identity is derived server-side from the session cookie; we never send a
      // client-supplied email (the server ignores it). The cookie rides along
      // automatically on the WebSocket upgrade request.
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const url = `${protocol}//${window.location.host}/ws/email-sync`;

      try {
        ws = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        attempt = 0;
        // On a *reconnect* (not the first open right after mount), the inbox may
        // have changed while we were disconnected and the server can't detect
        // that gap. Pull fresh so we're guaranteed current. The initial open is
        // skipped because the page's own load already fetched fresh mail.
        if (hasOpenedBefore) {
          onSyncRef.current();
        }
        hasOpenedBefore = true;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(typeof event.data === "string" ? event.data : "");
          if (data?.type === "sync") {
            onSyncRef.current();
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onerror = () => {
        try { ws?.close(); } catch {}
      };

      ws.onclose = () => {
        ws = null;
        if (!closedByUser) scheduleReconnect();
      };
    };

    const scheduleReconnect = () => {
      if (reconnectTimer) return;
      const delay = Math.min(60000, 2000 * Math.pow(2, attempt));
      attempt += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay);
    };

    connect();

    return () => {
      closedByUser = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      try { ws?.close(); } catch {}
      ws = null;
    };
  }, [userEmail, enabled]);
}

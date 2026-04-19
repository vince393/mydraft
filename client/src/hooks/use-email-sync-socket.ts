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

    const connect = () => {
      if (closedByUser) return;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const url = `${protocol}//${window.location.host}/ws/email-sync?userEmail=${encodeURIComponent(userEmail)}`;

      try {
        ws = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        attempt = 0;
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

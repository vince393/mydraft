declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

export function trackMetaEventOnce(key: string, event: string, params?: Record<string, any>) {
  try {
    const storageKey = `fbq_once_${key}`;
    if (sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, "1");
  } catch {
    // sessionStorage unavailable — fall through and track anyway
  }
  trackMetaEvent(event, params);
}

export function trackMetaEvent(event: string, params?: Record<string, any>) {
  try {
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      window.fbq("track", event, params);
    }
  } catch {
    // never let analytics break the app
  }
}

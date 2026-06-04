import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { createElement } from "react";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

let lastInsufficientToast = 0;
function maybeHandleInsufficientCredits(res: Response) {
  if (res.status !== 402) return;
  const now = Date.now();
  if (now - lastInsufficientToast < 3000) return;
  lastInsufficientToast = now;
  toast({
    title: "Not enough credits",
    description: "Visit Credits to top up and keep using AI features.",
    variant: "destructive",
    action: createElement(
      ToastAction,
      {
        altText: "Go to Credits",
        onClick: () => {
          window.location.assign("/credits");
        },
      },
      "Top up",
    ),
  });
}

const friendlyMessages: Record<number, string> = {
  400: "Something went wrong with your request. Please check your input and try again.",
  401: "You need to sign in to continue.",
  403: "You don't have permission to do that.",
  404: "We couldn't find what you're looking for.",
  408: "The request took too long. Please try again.",
  429: "You're doing that too often. Please wait a moment and try again.",
  500: "Something went wrong on our end. Please try again in a moment.",
  502: "Our servers are temporarily unavailable. Please try again shortly.",
  503: "The service is temporarily unavailable. Please try again shortly.",
};

function cleanErrorMessage(status: number, raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    if (parsed.error && typeof parsed.error === "string") {
      const msg = parsed.error;
      if (/token|oauth|grant|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|stack|at\s+\w/i.test(msg)) {
        return friendlyMessages[status] || friendlyMessages[500]!;
      }
      return msg;
    }
  } catch {}

  if (/^[\d]{3}:?\s*$/.test(raw.trim()) || !raw.trim()) {
    return friendlyMessages[status] || friendlyMessages[500]!;
  }

  if (/token|oauth|grant|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|stack|at\s+\w/i.test(raw)) {
    return friendlyMessages[status] || friendlyMessages[500]!;
  }

  return raw.replace(/^\d{3}:\s*/, "").trim() || friendlyMessages[status] || friendlyMessages[500]!;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    const error = new Error(cleanErrorMessage(res.status, text)) as Error & {
      status?: number;
    };
    error.status = res.status;
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  maybeHandleInsufficientCredits(res);
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

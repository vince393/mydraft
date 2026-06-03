import { useState } from "react";
import { useLocation } from "wouter";
import { AlertTriangle, X } from "lucide-react";
import { useCredits } from "@/hooks/use-credits";

export function LowCreditBanner() {
  const { balance, isLoading } = useCredits();
  const [, setLocation] = useLocation();
  const [dismissed, setDismissed] = useState(false);

  if (isLoading || dismissed || balance >= 20) return null;

  const level: "urgent" | "strong" | "subtle" =
    balance < 5 ? "urgent" : balance < 10 ? "strong" : "subtle";

  const message =
    level === "urgent"
      ? `Only ${balance} credits left — top up to keep using AI features.`
      : level === "strong"
        ? `Low on credits (${balance} left). Consider topping up soon.`
        : `Your credits are running low (${balance} left).`;

  const styles =
    level === "urgent"
      ? "border-destructive/30 bg-destructive/[0.08] text-foreground"
      : level === "strong"
        ? "border-amber-500/30 bg-amber-500/[0.08] text-foreground"
        : "border-amber-500/15 bg-amber-500/[0.04] text-foreground";

  const iconColor = level === "urgent" ? "text-destructive" : "text-amber-400";

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 border-b ${styles}`}
      data-testid="banner-low-credit"
    >
      <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />
      <p className="text-sm flex-1 min-w-0 truncate">{message}</p>
      <button
        onClick={() => setLocation("/credits")}
        className="text-sm font-medium underline underline-offset-2 hover:opacity-80 transition-opacity flex-shrink-0"
        data-testid="button-banner-topup"
      >
        Top up
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="text-muted-foreground/50 hover:text-foreground transition-colors flex-shrink-0"
        data-testid="button-banner-dismiss"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { Coins, X, Sparkles } from "lucide-react";
import { useCredits } from "@/hooks/use-credits";

export function LowCreditBanner() {
  const { balance, isLoading } = useCredits();
  const [, setLocation] = useLocation();
  const [dismissed, setDismissed] = useState(false);

  if (isLoading || dismissed || balance >= 20) return null;

  const level: "urgent" | "strong" | "subtle" =
    balance < 5 ? "urgent" : balance < 10 ? "strong" : "subtle";

  const headline =
    level === "urgent"
      ? balance <= 0
        ? "You're out of credits"
        : `Only ${balance} credit${balance === 1 ? "" : "s"} left`
      : level === "strong"
        ? `Running low — ${balance} credits left`
        : `${balance} credits left`;

  const subtext =
    level === "urgent"
      ? "Top up to keep using AI features."
      : "Top up anytime to stay ahead.";

  const accent =
    level === "urgent"
      ? "text-rose-400 bg-rose-500/10 ring-rose-500/20"
      : "text-amber-400 bg-amber-500/10 ring-amber-500/20";

  return (
    <div className="px-3 pt-3" data-testid="banner-low-credit">
      <div className="mx-auto flex max-w-5xl items-center gap-3 rounded-xl border border-border/60 bg-card/80 px-3 py-2.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <span
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ring-1 ${accent}`}
        >
          <Coins className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground" data-testid="text-banner-headline">
            {headline}
          </p>
          <p className="truncate text-xs text-muted-foreground">{subtext}</p>
        </div>

        <button
          onClick={() => setLocation("/credits")}
          className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          data-testid="button-banner-topup"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Top up
        </button>

        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
          data-testid="button-banner-dismiss"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

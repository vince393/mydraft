import { Coins } from "lucide-react";
import { useCredits, useCreditsConfig } from "@/hooks/use-credits";
import { cn } from "@/lib/utils";

export interface ActionCostInfo {
  cost: number;
  balance: number;
  canAfford: boolean;
  ready: boolean;
}

/**
 * Resolve the credit cost of an AI action plus whether the current user can
 * afford it. While the config/balance are still loading we report `canAfford:
 * true` so we never block a legitimate user mid-load — the server stays the
 * authoritative backstop (402 INSUFFICIENT_CREDITS).
 */
export function useActionCost(action: string): ActionCostInfo {
  const { data: config } = useCreditsConfig();
  const { balance, isLoading } = useCredits();
  const cost = config?.costs?.[action] ?? 0;
  const ready = !!config && !isLoading;
  return {
    cost,
    balance,
    canAfford: !ready || cost <= 0 ? true : balance >= cost,
    ready,
  };
}

interface CreditCostBadgeProps {
  action: string;
  className?: string;
}

/**
 * Small "coin + number" pill shown next to an AI action so the user can see
 * how many credits it costs before they trigger it. Turns red when the user
 * doesn't have enough credits.
 */
export function CreditCostBadge({ action, className }: CreditCostBadgeProps) {
  const { cost, canAfford } = useActionCost(action);

  if (cost <= 0) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ring-1",
        canAfford
          ? "bg-amber-500/10 text-amber-500 ring-amber-500/20"
          : "bg-rose-500/10 text-rose-400 ring-rose-500/20",
        className,
      )}
      title={
        canAfford
          ? `Uses ${cost} credit${cost === 1 ? "" : "s"}`
          : `Not enough credits — this uses ${cost}. Top up to continue.`
      }
      data-testid={`badge-credit-cost-${action}`}
    >
      <Coins className="h-2.5 w-2.5" />
      {cost}
    </span>
  );
}

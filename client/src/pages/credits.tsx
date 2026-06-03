import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCredits, useCreditsConfig, type CreditPack, type CreditAddon } from "@/hooks/use-credits";
import { CreditCheckoutDialog, type CreditCheckoutItem } from "@/components/credit-checkout-dialog";
import {
  ArrowLeft,
  Coins,
  Loader2,
  AlertTriangle,
  Zap,
  Package,
  RefreshCcw,
  History,
} from "lucide-react";

interface CreditTransaction {
  id: string | number;
  amount: number;
  action: string;
  source: string;
  createdAt: string;
}

function humanizeAction(action: string): string {
  if (!action) return "Activity";
  return action
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CreditsPage() {
  const [, setLocation] = useLocation();
  const [checkoutItem, setCheckoutItem] = useState<CreditCheckoutItem | null>(null);

  const { balance, addons: activeAddons, expiringSoon, isLoading: creditsLoading } = useCredits();
  const { data: config, isLoading: configLoading } = useCreditsConfig();

  const { data: transactions = [], isLoading: txLoading } = useQuery<CreditTransaction[]>({
    queryKey: ["/api/credits/transactions"],
  });

  const warningLevel: "urgent" | "strong" | "subtle" | null =
    creditsLoading ? null : balance < 5 ? "urgent" : balance < 10 ? "strong" : balance < 20 ? "subtle" : null;

  const costEntries = config ? Object.entries(config.costs) : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => setLocation("/inbox")}
            data-testid="button-back"
            className="w-9 h-9 rounded-lg bg-black/[0.04] dark:bg-white/[0.04] flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-xl font-semibold text-foreground">Credits</h1>
        </div>

        {/* Balance */}
        <Card className="mb-6" data-testid="card-credit-balance">
          <CardContent className="p-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Coins className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground/60 uppercase tracking-wider">Current balance</p>
                {creditsLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/40 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-foreground" data-testid="text-balance">
                    {balance.toLocaleString()}
                    <span className="text-base font-medium text-muted-foreground/50 ml-2">credits</span>
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const el = document.getElementById("credit-packs");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              data-testid="button-scroll-packs"
            >
              <Zap className="w-4 h-4 mr-2" />
              Top up
            </Button>
          </CardContent>
        </Card>

        {/* Expiring soon / low balance warnings */}
        {expiringSoon && (
          <div
            className="mb-6 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-4 flex items-start gap-3"
            data-testid="banner-expiring-soon"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-foreground/80">
              <span className="font-medium">{expiringSoon.amount.toLocaleString()} credits</span> expire on{" "}
              <span className="font-medium">{formatDate(expiringSoon.date)}</span>. Use them before they're gone.
            </p>
          </div>
        )}

        {warningLevel && (
          <div
            className={`mb-6 rounded-lg border p-4 flex items-start gap-3 ${
              warningLevel === "urgent"
                ? "border-destructive/30 bg-destructive/[0.07]"
                : warningLevel === "strong"
                  ? "border-amber-500/30 bg-amber-500/[0.07]"
                  : "border-amber-500/15 bg-amber-500/[0.04]"
            }`}
            data-testid="banner-low-credits"
          >
            <AlertTriangle
              className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                warningLevel === "urgent" ? "text-destructive" : "text-amber-400"
              }`}
            />
            <p className="text-sm text-foreground/80">
              {warningLevel === "urgent"
                ? "You're almost out of credits. Top up to keep using AI features."
                : warningLevel === "strong"
                  ? "Your credit balance is running low. Consider topping up soon."
                  : "Your credits are getting low. You may want to top up."}
            </p>
          </div>
        )}

        {/* Credit costs */}
        <Card className="mb-6" data-testid="card-credit-costs">
          <CardHeader>
            <CardTitle className="text-base">Credit costs</CardTitle>
            <CardDescription>How many credits each action uses</CardDescription>
          </CardHeader>
          <CardContent>
            {configLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground/50 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : costEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground/50">No pricing information available.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {costEntries.map(([action, cost]) => (
                  <div
                    key={action}
                    className="flex items-center justify-between rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04] px-3 py-2.5"
                    data-testid={`row-cost-${action}`}
                  >
                    <span className="text-sm text-foreground/80">{humanizeAction(action)}</span>
                    <Badge variant="secondary" className="gap-1" data-testid={`text-cost-${action}`}>
                      <Coins className="w-3 h-3" />
                      {cost}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Credit packs */}
        <div id="credit-packs" className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-muted-foreground/60" />
            <h2 className="text-base font-semibold text-foreground">Credit packs</h2>
            <span className="text-xs text-muted-foreground/50">One-time purchase</span>
          </div>
          {configLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground/50 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : !config?.packs?.length ? (
            <p className="text-sm text-muted-foreground/50">No credit packs available.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {config.packs.map((pack: CreditPack) => (
                <Card key={pack.sku} data-testid={`card-pack-${pack.sku}`}>
                  <CardContent className="p-5 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Coins className="w-5 h-5 text-primary" />
                      <span className="text-2xl font-bold text-foreground" data-testid={`text-pack-credits-${pack.sku}`}>
                        {pack.credits.toLocaleString()}
                      </span>
                      <span className="text-sm text-muted-foreground/50">credits</span>
                    </div>
                    <p className="text-lg font-semibold text-foreground" data-testid={`text-pack-price-${pack.sku}`}>
                      ${pack.price}
                    </p>
                    <Button
                      className="w-full"
                      onClick={() => setCheckoutItem({ type: "pack", sku: pack.sku, credits: pack.credits, price: pack.price })}
                      data-testid={`button-buy-pack-${pack.sku}`}
                    >
                      Buy
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Monthly add-ons */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCcw className="w-4 h-4 text-muted-foreground/60" />
            <h2 className="text-base font-semibold text-foreground">Monthly add-ons</h2>
            <span className="text-xs text-muted-foreground/50">Recurring credits every month</span>
          </div>
          {configLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground/50 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : !config?.addons?.length ? (
            <p className="text-sm text-muted-foreground/50">No add-ons available.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {config.addons.map((addon: CreditAddon) => {
                const isActive = activeAddons.some((a) => a.sku === addon.sku);
                return (
                  <Card key={addon.sku} data-testid={`card-addon-${addon.sku}`}>
                    <CardContent className="p-5 flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <Coins className="w-5 h-5 text-primary" />
                        <span className="text-2xl font-bold text-foreground" data-testid={`text-addon-credits-${addon.sku}`}>
                          {addon.credits.toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground/50">/ mo</span>
                      </div>
                      <p className="text-lg font-semibold text-foreground" data-testid={`text-addon-price-${addon.sku}`}>
                        ${addon.price}
                        <span className="text-sm font-medium text-muted-foreground/50">/mo</span>
                      </p>
                      <Button
                        className="w-full"
                        variant={isActive ? "secondary" : "default"}
                        onClick={() => setCheckoutItem({ type: "addon", sku: addon.sku, credits: addon.credits, price: addon.price })}
                        disabled={isActive}
                        data-testid={`button-buy-addon-${addon.sku}`}
                      >
                        {isActive ? "Active" : "Subscribe"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Transaction history */}
        <Card data-testid="card-transactions">
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground/60" />
              <CardTitle className="text-base">Transaction history</CardTitle>
            </div>
            <CardDescription>Your recent credit activity</CardDescription>
          </CardHeader>
          <CardContent>
            {txLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground/50 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground/50">No transactions yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id} data-testid={`row-transaction-${tx.id}`}>
                      <TableCell className="font-medium">{humanizeAction(tx.action || tx.source)}</TableCell>
                      <TableCell className="text-muted-foreground/60">{formatDate(tx.createdAt)}</TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          tx.amount >= 0 ? "text-emerald-400" : "text-destructive"
                        }`}
                        data-testid={`text-amount-${tx.id}`}
                      >
                        {tx.amount >= 0 ? "+" : ""}
                        {tx.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <CreditCheckoutDialog item={checkoutItem} onClose={() => setCheckoutItem(null)} />
    </div>
  );
}

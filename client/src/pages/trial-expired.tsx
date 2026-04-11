import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Check, Clock, Sparkles, Shield, Crown } from "lucide-react";
import logoPath from "@assets/mydraft_logo.png";

const plans = [
  {
    id: "free",
    internalId: "free",
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "Basic email management",
    features: [
      "Connect 1 email account",
      "5 AI drafts per day",
      "Basic inbox management",
      "Standard support",
    ],
    icon: Shield,
    color: "text-muted-foreground",
  },
  {
    id: "pro",
    internalId: "pro",
    name: "Pro",
    monthlyPrice: 10,
    annualPrice: 99,
    annualSavings: 21,
    description: "For professionals who need more",
    features: [
      "Personal writing style memory",
      "100 AI emails per day",
      "Advanced automation & workflows",
      "Custom rules and sequences",
      "Team or shared inboxes",
      "API access & integrations",
      "Priority support",
    ],
    icon: Sparkles,
    color: "text-blue-400",
  },
  {
    id: "business",
    internalId: "premium",
    name: "Business",
    monthlyPrice: 29,
    annualPrice: 299,
    annualSavings: 49,
    description: "For teams and power users",
    features: [
      "Everything in Pro",
      "Enhanced AI quality",
      "Unlimited AI assistance",
      "Voice assistant",
      "Custom AI training",
      "Team collaboration",
      "Dedicated account manager",
    ],
    icon: Crown,
    color: "text-violet-400",
  },
];

export default function TrialExpiredPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("annual");

  const { data: authData } = useQuery<{ user: any }>({
    queryKey: ["/api/auth/me"],
  });

  const selectFreeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/user/plan", { plan: "free" });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/inbox");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to select plan", description: error.message, variant: "destructive" });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ plan, interval }: { plan: string; interval: string }) => {
      const response = await apiRequest("POST", "/api/stripe/checkout", { plan, interval });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({ title: "Failed to start checkout", description: error.message, variant: "destructive" });
    },
  });

  const handlePlanSelect = (planId: string) => {
    if (planId === "free") {
      selectFreeMutation.mutate();
    } else {
      checkoutMutation.mutate({ plan: planId, interval: billingInterval });
    }
  };

  const isLoading = selectFreeMutation.isPending || checkoutMutation.isPending;

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-blue-600/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] right-[15%] w-[400px] h-[400px] bg-violet-600/[0.03] rounded-full blur-[120px]" />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <div className="w-full max-w-3xl">
          <div className="text-center mb-8">
            <img src={logoPath} alt="MyDraft" className="w-10 h-10 mx-auto mb-4" />
            <div className="inline-flex items-center gap-2 bg-orange-500/10 text-orange-400 rounded-full px-3 py-1 text-xs font-medium mb-4" data-testid="badge-trial-expired">
              <Clock className="w-3.5 h-3.5" />
              Free trial ended
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2" data-testid="text-trial-expired-title">
              Your free trial has ended
            </h1>
            <p className="text-muted-foreground/60 text-sm max-w-md mx-auto">
              Choose a plan to continue using MyDraft. You can start with the free plan or upgrade for full access.
            </p>
          </div>

          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] rounded-full p-1" data-testid="billing-toggle">
              <button
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  billingInterval === "monthly" ? "bg-blue-500 text-white" : "text-muted-foreground/60"
                }`}
                onClick={() => setBillingInterval("monthly")}
                data-testid="button-billing-monthly"
              >
                Monthly
              </button>
              <button
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  billingInterval === "annual" ? "bg-blue-500 text-white" : "text-muted-foreground/60"
                }`}
                onClick={() => setBillingInterval("annual")}
                data-testid="button-billing-annual"
              >
                Annual
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const displayPrice = plan.id === "free"
                ? "$0"
                : billingInterval === "annual"
                  ? `$${(plan.annualPrice / 12).toFixed(0)}`
                  : `$${plan.monthlyPrice}`;
              const displayPeriod = plan.id === "free" ? "forever" : "/month";

              return (
                <div
                  key={plan.id}
                  className="rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] p-5 flex flex-col"
                  data-testid={`plan-card-${plan.id}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={`w-4 h-4 ${plan.color}`} />
                    <h3 className="font-semibold text-sm">{plan.name}</h3>
                  </div>

                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-2xl font-bold">{displayPrice}</span>
                    <span className="text-muted-foreground/50 text-xs">{displayPeriod}</span>
                  </div>
                  {billingInterval === "annual" && plan.annualSavings && (
                    <p className="text-[10px] text-green-500 mb-3">Save ${plan.annualSavings}/year</p>
                  )}
                  {(!plan.annualSavings || billingInterval !== "annual") && <div className="mb-3" />}

                  <p className="text-xs text-muted-foreground/60 mb-4">{plan.description}</p>

                  <div className="space-y-2 mb-5 flex-1">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                          <Check className="w-2 h-2 text-emerald-400" />
                        </div>
                        <span className="text-xs text-foreground/70">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    className="w-full"
                    size="sm"
                    variant={plan.id === "free" ? "outline" : "default"}
                    onClick={() => handlePlanSelect(plan.id)}
                    disabled={isLoading}
                    data-testid={`button-select-${plan.id}`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : plan.id === "free" ? (
                      "Continue free"
                    ) : (
                      `Subscribe to ${plan.name}`
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

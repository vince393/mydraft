import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Check, Loader2, Star, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

interface AIPreferences {
  emailVolume?: string;
  automationLevel?: string;
  primaryUse?: string;
}

interface UserData {
  user: {
    aiPreferences?: AIPreferences | null;
    plan?: string;
    stripeCustomerId?: string;
  } | null;
}

function getRecommendedPlan(aiPreferences: AIPreferences | null | undefined): string {
  if (!aiPreferences) return "pro";
  
  const { emailVolume, automationLevel, primaryUse } = aiPreferences;
  
  if (emailVolume === "very-high") return "business";
  if (automationLevel === "high" && primaryUse === "work") return "business";
  if (emailVolume === "high" && automationLevel === "high") return "business";
  if (emailVolume === "low" && automationLevel === "low") return "free";
  
  return "pro";
}

const basePlans = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "Perfect for trying out MyDraft",
    features: [
      "Connect 1 email account",
      "Basic inbox management",
      "Standard support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 19,
    annualPrice: 199,
    annualSavings: 29, // $19 * 12 = $228 - $199 = $29
    description: "For professionals who need more",
    stripeName: "MyDraft Pro",
    features: [
      "Connect 1 email account",
      "Unlimited AI replies",
      "Advanced tone customization",
      "Email scheduling",
      "Priority support",
      "14-day free trial",
    ],
  },
  {
    id: "business",
    name: "Business",
    monthlyPrice: 49,
    annualPrice: 299,
    annualSavings: 289, // $49 * 12 = $588 - $299 = $289
    description: "For teams and power users",
    stripeName: "MyDraft Business",
    features: [
      "Connect 1 email account",
      "Unlimited AI replies",
      "Voice assistant",
      "Custom AI training",
      "Team collaboration",
      "Dedicated support",
      "14-day free trial",
    ],
  },
];

export default function PricingPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [billingInterval, setBillingInterval] = useState<"annual" | "monthly">("annual");

  const { data: userData } = useQuery<UserData>({
    queryKey: ["/api/auth/me"],
  });

  // Check for success/cancel URL params from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      toast({
        title: "Subscription activated!",
        description: "Thank you for subscribing. Your plan is now active.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      // Redirect to email connection after successful subscription
      setLocation("/connect-email");
    } else if (params.get("canceled") === "true") {
      toast({
        title: "Checkout canceled",
        description: "Your subscription was not completed.",
        variant: "destructive",
      });
      setLocation("/select-plan", { replace: true });
    }
  }, [toast, setLocation]);

  // Redirect users who already have a plan to the next step
  useEffect(() => {
    // Only redirect if not coming back from Stripe
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") || params.get("canceled")) return;
    
    if (userData?.user?.plan) {
      // User already has a plan, send them to the next step
      setLocation("/connect-email");
    }
  }, [userData, setLocation]);

  const recommendedPlan = getRecommendedPlan(userData?.user?.aiPreferences);
  const currentPlan = userData?.user?.plan || "free";

  // Free plan selection (no payment)
  const selectFreePlanMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/user/plan", { plan: "free" });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/connect-email");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to select plan",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Stripe checkout for paid plans
  const checkoutMutation = useMutation({
    mutationFn: async ({ plan, interval }: { plan: string; interval: "annual" | "monthly" }) => {
      const response = await apiRequest("POST", "/api/stripe/checkout", { plan, interval });
      return response.json();
    },
    onSuccess: (data: { url: string }) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start checkout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Manage subscription (portal)
  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/stripe/portal", {});
      return response.json();
    },
    onSuccess: (data: { url: string }) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to open billing portal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePlanSelect = (planId: string) => {
    if (planId === "free") {
      selectFreePlanMutation.mutate();
      return;
    }

    // For paid plans, use the plan name and billing interval
    checkoutMutation.mutate({ plan: planId, interval: billingInterval });
  };

  const isLoading = selectFreePlanMutation.isPending || checkoutMutation.isPending || portalMutation.isPending;

  return (
    <div className="min-h-screen bg-background py-8 sm:py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold mb-2 sm:mb-3">Choose your plan</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {currentPlan !== "free" 
              ? `You're currently on the ${currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} plan.`
              : "Based on your preferences, we've highlighted the best plan for you."
            }
          </p>
        </div>

        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="inline-flex items-center bg-muted rounded-full p-1" data-testid="billing-toggle">
            <button
              className={`px-4 sm:px-5 py-2 rounded-full text-sm font-medium transition-all touch-target ${
                billingInterval === "monthly" 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setBillingInterval("monthly")}
              data-testid="button-billing-monthly"
            >
              Monthly
            </button>
            <button
              className={`px-4 sm:px-5 py-2 rounded-full text-sm font-medium transition-all touch-target ${
                billingInterval === "annual" 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setBillingInterval("annual")}
              data-testid="button-billing-annual"
            >
              Annual
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {basePlans.map((plan) => {
            const isRecommended = plan.id === recommendedPlan;
            const isCurrentPlan = plan.id === currentPlan || (plan.id === "business" && currentPlan === "premium");
            
            const displayPrice = plan.id === "free" 
              ? "$0" 
              : billingInterval === "annual" 
                ? `$${plan.annualPrice}` 
                : `$${plan.monthlyPrice}`;
            
            const displayPeriod = plan.id === "free" 
              ? "forever" 
              : billingInterval === "annual" 
                ? "year" 
                : "month";
            
            return (
              <Card 
                key={plan.id} 
                className={`relative ${isRecommended ? "ring-2 ring-primary" : ""}`}
                data-testid={`card-plan-${plan.id}`}
              >
                {isRecommended && !isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      <Star className="w-3 h-3 mr-1" />
                      Recommended for you
                    </Badge>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="secondary">
                      Current Plan
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{displayPrice}</span>
                    <span className="text-muted-foreground">/{displayPeriod}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {isCurrentPlan && userData?.user?.stripeCustomerId ? (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => portalMutation.mutate()}
                      disabled={isLoading}
                      data-testid={`button-manage-plan-${plan.id}`}
                    >
                      {portalMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Manage Subscription
                    </Button>
                  ) : isCurrentPlan ? (
                    <Button
                      className="w-full"
                      variant="secondary"
                      disabled
                      data-testid={`button-current-plan-${plan.id}`}
                    >
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={isRecommended ? "default" : "outline"}
                      onClick={() => handlePlanSelect(plan.id)}
                      disabled={isLoading}
                      data-testid={`button-select-plan-${plan.id}`}
                    >
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {plan.id === "free" ? "Get Started" : "Subscribe"}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Pro and Business plans include a 14-day free trial. Cancel anytime.
        </p>
      </div>
    </div>
  );
}

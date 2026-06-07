import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Check, Loader2, Star, ExternalLink, Sparkles, Zap, Users, ChevronDown, Mail } from "lucide-react";
import { useEffect, useState } from "react";

interface AIPreferences {
  emailVolume?: string;
  automationLevel?: string;
  primaryUse?: string;
  aiFeatures?: string[];
  replyTone?: string;
  referralSource?: string;
}

interface UserData {
  user: {
    aiPreferences?: AIPreferences | null;
    plan?: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    onboardingCompleted?: boolean;
  } | null;
}

function getRecommendedPlan(aiPreferences: AIPreferences | null | undefined): string {
  if (!aiPreferences) return "pro";
  
  const { emailVolume, automationLevel, primaryUse, aiFeatures, referralSource } = aiPreferences;
  
  // Score-based recommendation for more accuracy
  let freeScore = 0;
  let personalScore = 0;
  let proScore = 0;
  let businessScore = 0;
  
  // Email volume scoring
  if (emailVolume === "very-high") {
    businessScore += 4;
    proScore += 2;
  } else if (emailVolume === "high") {
    businessScore += 2;
    proScore += 3;
  } else if (emailVolume === "medium") {
    proScore += 3;
    personalScore += 2;
  } else if (emailVolume === "low") {
    freeScore += 3;
    personalScore += 2;
  }
  
  // Automation level scoring
  if (automationLevel === "high") {
    businessScore += 3;
    proScore += 2;
  } else if (automationLevel === "medium") {
    proScore += 2;
    personalScore += 1;
  } else if (automationLevel === "low") {
    freeScore += 2;
    personalScore += 1;
  }
  
  // Primary use scoring
  if (primaryUse === "work") {
    businessScore += 2;
    proScore += 2;
  } else if (primaryUse === "personal") {
    freeScore += 2;
    personalScore += 3;
  } else if (primaryUse === "both") {
    proScore += 2;
    personalScore += 1;
  }
  
  // AI features scoring - more features = higher plan
  const featureCount = aiFeatures?.length || 0;
  if (featureCount >= 4) {
    businessScore += 2;
    proScore += 1;
  } else if (featureCount >= 2) {
    proScore += 2;
    personalScore += 1;
  } else if (featureCount === 1) {
    freeScore += 1;
    personalScore += 1;
  }
  
  // Check for specific high-end features
  if (aiFeatures?.includes("voice") || aiFeatures?.includes("training")) {
    businessScore += 2;
  }
  
  // Find the plan with highest score
  const scores = [
    { plan: "free", score: freeScore },
    { plan: "personal", score: personalScore },
    { plan: "pro", score: proScore },
    { plan: "business", score: businessScore },
  ];
  
  const recommended = scores.reduce((max, current) => 
    current.score > max.score ? current : max
  );
  
  // Default to pro if scores are tied or too close
  if (recommended.score === 0 || 
      (recommended.plan === "free" && proScore >= freeScore - 1)) {
    return "pro";
  }
  
  return recommended.plan;
}

function getRecommendationReasons(planId: string, aiPreferences: AIPreferences | null | undefined): { title: string; reasons: string[]; benefits: string[] } {
  if (!aiPreferences) {
    return {
      title: "Perfect for most users",
      reasons: ["Balances features and value"],
      benefits: ["Plenty of AI credits every month", "Advanced customization options"]
    };
  }

  const { emailVolume, automationLevel, primaryUse, aiFeatures, replyTone } = aiPreferences;

  if (planId === "free") {
    return {
      title: "Great for getting started",
      reasons: [
        emailVolume === "low" ? "You mentioned receiving a manageable number of emails" : "Perfect for trying out MyDraft",
        automationLevel === "low" ? "You prefer hands-on control over your inbox" : "Basic features to get you started",
      ].filter(Boolean),
      benefits: [
        "No commitment required",
        "Core inbox management features",
        "Upgrade anytime when you need more"
      ]
    };
  }

  if (planId === "personal") {
    const reasons: string[] = [];
    const benefits: string[] = [];

    if (primaryUse === "personal") {
      reasons.push("Ideal for staying on top of your personal email");
    } else if (emailVolume === "low" || emailVolume === "medium") {
      reasons.push("A great fit for your everyday email volume");
    }

    if (automationLevel === "low" || automationLevel === "medium") {
      reasons.push("Just enough AI help without the extras you don't need");
    }

    if (replyTone) {
      benefits.push(`The AI learns your ${replyTone === "professional" ? "professional" : replyTone === "casual" ? "casual" : "personal"} writing style`);
    }

    benefits.push("50 AI credits every month");
    benefits.push("Email scheduling and advanced inbox management");
    benefits.push("Priority support when you need help");

    return {
      title: "Great value for everyday email",
      reasons: reasons.length > 0 ? reasons : ["A simple step up from Free"],
      benefits
    };
  }

  if (planId === "pro") {
    const reasons: string[] = [];
    const benefits: string[] = [];

    if (primaryUse === "work") {
      reasons.push("You use email primarily for work, where efficiency matters most");
    } else if (primaryUse === "personal") {
      reasons.push("Great balance of features for your personal email needs");
    } else if (primaryUse === "both") {
      reasons.push("Handles both work and personal email with ease");
    }

    if (emailVolume === "medium" || emailVolume === "high") {
      reasons.push("With your email volume, AI assistance will save you significant time");
    }

    if (automationLevel === "medium" || automationLevel === "high") {
      reasons.push("You want smart automation to streamline your inbox");
    }

    if (replyTone) {
      benefits.push(`Customize AI to match your ${replyTone === "professional" ? "professional" : replyTone === "casual" ? "casual" : "unique"} communication style`);
    }

    benefits.push("200 AI credits every month");
    benefits.push("Smart scheduling to send at the perfect time");
    benefits.push("Priority support when you need help");

    return {
      title: "The smart choice for you",
      reasons: reasons.length > 0 ? reasons : ["Perfect balance of power and simplicity"],
      benefits
    };
  }

  if (planId === "business") {
    const reasons: string[] = [];
    const benefits: string[] = [];

    if (emailVolume === "very-high") {
      reasons.push("Your high email volume needs enterprise-grade AI assistance");
    }

    if (primaryUse === "work" && automationLevel === "high") {
      reasons.push("Maximum automation for busy professionals like you");
    }

    if (aiFeatures?.includes("voice")) {
      reasons.push("Voice assistant feature matches your preference");
    }

    if (aiFeatures?.includes("training")) {
      reasons.push("Custom AI training learns your unique style");
    }

    benefits.push("Voice assistant for hands-free email management");
    benefits.push("AI that learns and adapts to your writing style");
    benefits.push("Dedicated support team for instant help");
    benefits.push("Perfect for power users who demand the best");

    return {
      title: "Built for power users like you",
      reasons: reasons.length > 0 ? reasons : ["Maximum features for maximum productivity"],
      benefits
    };
  }

  return {
    title: "Recommended for you",
    reasons: ["Matches your email habits"],
    benefits: ["Great value for your needs"]
  };
}

const basePlans = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "Perfect for trying out MyDraft",
    icon: Sparkles,
    color: "text-muted-foreground",
    features: [
      "Connect 1 email account",
      "10 AI credits per month",
      "Basic inbox management",
      "Standard support",
    ],
  },
  {
    id: "personal",
    name: "Personal",
    monthlyPrice: 2.99,
    annualPrice: 28.7,
    annualSavings: 7,
    description: "For everyday personal email",
    icon: Mail,
    color: "text-emerald-500",
    stripeName: "MyDraft Personal",
    features: [
      "50 AI credits per month",
      "Personal writing style memory",
      "Advanced inbox management",
      "Email scheduling",
      "Priority support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 7.99,
    annualPrice: 76.7,
    annualSavings: 19,
    description: "For professionals who need more",
    icon: Zap,
    color: "text-primary",
    stripeName: "MyDraft Pro",
    features: [
      "Everything in Personal",
      "200 AI credits per month",
      "Enhanced AI model (GPT-4o)",
      "Background auto-sort",
      "Priority support",
      "3-day free trial",
    ],
  },
  {
    id: "business",
    name: "Business",
    monthlyPrice: 19.99,
    annualPrice: 191.9,
    annualSavings: 48,
    description: "For teams and power users",
    icon: Users,
    color: "text-amber-500",
    stripeName: "MyDraft Business",
    features: [
      "Everything in Pro",
      "500 AI credits per month",
      "Voice assistant",
      "Custom AI training",
      "Team collaboration (up to 5)",
      "Dedicated support",
      "3-day free trial",
    ],
  },
];

export default function PricingPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [billingInterval, setBillingInterval] = useState<"annual" | "monthly">("annual");
  const [showAllPlans, setShowAllPlans] = useState(false);

  const { data: userData, isLoading: isLoadingUser } = useQuery<UserData>({
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

  // Redirect users who already have a plan to the next step (unless they're changing their plan)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") || params.get("canceled") || params.get("change") || params.get("upgrade")) return;
    
    if (userData?.user?.plan && !userData.user.onboardingCompleted) {
      setLocation("/connect-email");
    }
  }, [userData, setLocation]);

  // Show all plans if user hasn't completed onboarding (no preferences to base recommendation on)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgrade")) {
      setShowAllPlans(true);
      return;
    }
    if (userData?.user && !userData.user.onboardingCompleted && !userData.user.aiPreferences) {
      setShowAllPlans(true);
    }
  }, [userData]);

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

  // Navigate to custom checkout page for paid plans (new subscribers)
  const handleCheckout = (plan: string, interval: "annual" | "monthly") => {
    setLocation(`/checkout?plan=${plan}&interval=${interval}`);
  };

  // Change plan for existing subscribers (upgrade/downgrade between paid plans)
  const changePlanMutation = useMutation({
    mutationFn: async ({ plan, interval }: { plan: string; interval: "annual" | "monthly" }) => {
      const response = await apiRequest("POST", "/api/stripe/change-plan", { plan, interval });
      return response.json();
    },
    onSuccess: (data: { message?: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Plan updated",
        description: data.message || "Your plan has been changed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to change plan",
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

  const hasActiveSubscription = userData?.user?.stripeSubscriptionId && userData?.user?.plan !== "free";

  const handlePlanSelect = (planId: string) => {
    if (planId === "free") {
      selectFreePlanMutation.mutate();
      return;
    }
    
    if (hasActiveSubscription) {
      changePlanMutation.mutate({ plan: planId, interval: billingInterval });
    } else {
      handleCheckout(planId, billingInterval);
    }
  };

  const isLoading = selectFreePlanMutation.isPending || portalMutation.isPending || changePlanMutation.isPending;

  const displayPrice = (plan: typeof basePlans[0]) => {
    if (plan.id === "free") return "$0";
    if (billingInterval === "annual") {
      const monthlyEquivalent = (plan.annualPrice / 12).toFixed(2).replace(/\.00$/, '');
      return `$${monthlyEquivalent}`;
    }
    return `$${plan.monthlyPrice}`;
  };

  const displayPeriod = (plan: typeof basePlans[0]) => {
    if (plan.id === "free") return "forever";
    return "month";
  };

  // Show loading state while fetching user data
  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const recommendedPlan = getRecommendedPlan(userData?.user?.aiPreferences);
  const currentPlan = userData?.user?.plan || "free";
  const recommendedPlanData = basePlans.find(p => p.id === recommendedPlan) || basePlans[2]; // Default to Pro
  const recommendation = getRecommendationReasons(recommendedPlan, userData?.user?.aiPreferences);

  // Recommended Plan View (Single Plan)
  if (!showAllPlans && userData?.user?.onboardingCompleted) {
    const PlanIcon = recommendedPlanData.icon;
    
    return (
      <div className="min-h-screen bg-background py-8 sm:py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              <Star className="w-3 h-3 mr-1" />
              Personalized Recommendation
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-semibold mb-3">We found the perfect plan for you</h1>
            <p className="text-muted-foreground">
              Based on your preferences, here's what we recommend
            </p>
          </div>

          <Card className="relative overflow-hidden border-2 border-primary" data-testid="card-recommended-plan">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full" />
            
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg bg-primary/10 ${recommendedPlanData.color}`}>
                  <PlanIcon className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{recommendedPlanData.name}</CardTitle>
                  <CardDescription>{recommendedPlanData.description}</CardDescription>
                </div>
              </div>
              
              <div className="flex items-baseline gap-1 mt-4">
                <span className="text-5xl font-bold">{displayPrice(recommendedPlanData)}</span>
                <span className="text-muted-foreground text-lg">/{displayPeriod(recommendedPlanData)}</span>
              </div>
              
              {billingInterval === "annual" && recommendedPlanData.id !== "free" && (
                <p className="text-xs text-muted-foreground mt-2">
                  Billed annually at ${recommendedPlanData.annualPrice}/year
                  {recommendedPlanData.annualSavings && (
                    <span className="text-green-500 ml-2">Save ${recommendedPlanData.annualSavings}</span>
                  )}
                </p>
              )}
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Why this plan suits you */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  {recommendation.title}
                </h3>
                <ul className="space-y-2">
                  {recommendation.reasons.slice(0, 3).map((reason, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Key benefits */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  What you'll get
                </h3>
                <ul className="grid gap-2">
                  {recommendation.benefits.slice(0, 4).map((benefit, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Features list */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3 text-muted-foreground">All features included:</h4>
                <ul className="grid grid-cols-2 gap-2">
                  {recommendedPlanData.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-4">
              {/* Billing toggle */}
              {recommendedPlanData.id !== "free" && (
                <div className="flex justify-center w-full mb-2">
                  <div className="inline-flex items-center bg-muted rounded-full p-1" data-testid="billing-toggle">
                    <button
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                        billingInterval === "monthly" 
                          ? "bg-background shadow-sm" 
                          : "text-muted-foreground"
                      }`}
                      onClick={() => setBillingInterval("monthly")}
                      data-testid="button-billing-monthly"
                    >
                      Monthly
                    </button>
                    <button
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                        billingInterval === "annual" 
                          ? "bg-background shadow-sm" 
                          : "text-muted-foreground"
                      }`}
                      onClick={() => setBillingInterval("annual")}
                      data-testid="button-billing-annual"
                    >
                      Annual
                    </button>
                  </div>
                </div>
              )}

              <Button
                className="w-full h-12 text-base"
                size="lg"
                onClick={() => handlePlanSelect(recommendedPlanData.id)}
                disabled={isLoading}
                data-testid="button-select-recommended"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {recommendedPlanData.id === "free"
                  ? "Get Started Free"
                  : recommendedPlanData.id === "personal"
                    ? "Get Personal"
                    : "Start 3-Day Free Trial"}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllPlans(true)}
                className="text-muted-foreground"
                data-testid="button-view-all-plans"
              >
                <ChevronDown className="w-4 h-4 mr-1" />
                View all plans
              </Button>
            </CardFooter>
          </Card>

          {recommendedPlanData.id !== "free" && recommendedPlanData.id !== "personal" && (
            <p className="text-center text-sm text-muted-foreground mt-6">
              Start with a 3-day free trial. Cancel anytime, no questions asked.
            </p>
          )}
          {recommendedPlanData.id === "personal" && (
            <p className="text-center text-sm text-muted-foreground mt-6">
              Billed right away. Cancel anytime, no questions asked.
            </p>
          )}
        </div>
      </div>
    );
  }

  // All Plans View
  return (
    <div className="min-h-screen bg-background py-8 sm:py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold mb-2 sm:mb-3">Choose your plan</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {currentPlan !== "free" 
              ? `You're currently on the ${currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} plan.`
              : "Select the plan that works best for you"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 max-w-6xl mx-auto">
          {basePlans.map((plan) => {
            const isRecommended = plan.id === recommendedPlan;
            const isCurrentPlan = plan.id === currentPlan || (plan.id === "business" && currentPlan === "premium");
            const PlanIcon = plan.icon;
            
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
                      Recommended
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
                  <div className="flex items-center gap-2 mb-1">
                    <PlanIcon className={`w-5 h-5 ${plan.color}`} />
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{displayPrice(plan)}</span>
                    <span className="text-muted-foreground">/{displayPeriod(plan)}</span>
                  </div>
                  {billingInterval === "annual" && plan.id !== "free" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Billed annually at ${plan.annualPrice}/year
                      {plan.annualSavings && (
                        <span className="text-green-500 ml-2">Save ${plan.annualSavings}</span>
                      )}
                    </p>
                  )}
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
                      {(() => {
                        if (plan.id === "free") {
                          return hasActiveSubscription ? "Downgrade to Free" : "Get Started";
                        }
                        if (!hasActiveSubscription) return plan.id === "personal" ? "Choose Personal" : "Start Free Trial";
                        const planRank: Record<string, number> = { free: 0, personal: 1, pro: 2, premium: 3, business: 3 };
                        const targetRank = planRank[plan.id] || 0;
                        const currentRank = planRank[currentPlan] || 0;
                        if (targetRank > currentRank) return "Upgrade";
                        if (targetRank < currentRank) return "Downgrade";
                        return "Switch Plan";
                      })()}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {userData?.user?.onboardingCompleted && (
          <div className="text-center mt-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllPlans(false)}
              className="text-muted-foreground"
              data-testid="button-back-to-recommended"
            >
              Back to recommended plan
            </Button>
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground mt-8">
          Pro and Business plans include a 3-day free trial. Cancel anytime.
        </p>
      </div>
    </div>
  );
}

import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Check, Loader2, Sparkles, Star } from "lucide-react";

interface AIPreferences {
  emailVolume?: string;
  automationLevel?: string;
  primaryUse?: string;
}

interface UserData {
  user: {
    aiPreferences?: AIPreferences | null;
  } | null;
}

function getRecommendedPlan(aiPreferences: AIPreferences | null | undefined): string {
  if (!aiPreferences) return "pro";
  
  const { emailVolume, automationLevel, primaryUse } = aiPreferences;
  
  // Business recommendation: very high email volume OR high automation + work use
  if (emailVolume === "very-high") return "business";
  if (automationLevel === "high" && primaryUse === "work") return "business";
  if (emailVolume === "high" && automationLevel === "high") return "business";
  
  // Free recommendation: low email volume AND low automation
  if (emailVolume === "low" && automationLevel === "low") return "free";
  
  // Pro recommendation: everything else
  return "pro";
}

const basePlans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for trying out MailFlow",
    features: [
      "Connect 1 email account",
      "Basic inbox management",
      "Standard support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$12",
    period: "month",
    description: "For professionals who need more",
    features: [
      "Connect 1 email account",
      "Unlimited AI replies",
      "Advanced tone customization",
      "Email scheduling",
      "Priority support",
    ],
  },
  {
    id: "business",
    name: "Business",
    price: "$29",
    period: "month",
    description: "For teams and power users",
    features: [
      "Connect 1 email account",
      "Unlimited AI replies",
      "Voice assistant",
      "Custom AI training",
      "Team collaboration",
      "API access",
      "Dedicated support",
    ],
  },
];

export default function PricingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: userData } = useQuery<UserData>({
    queryKey: ["/api/auth/me"],
  });

  const recommendedPlan = getRecommendedPlan(userData?.user?.aiPreferences);

  const selectPlanMutation = useMutation({
    mutationFn: async (plan: string) => {
      const response = await apiRequest("POST", "/api/user/plan", { plan });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      // Go to connect-email after plan selection (new flow)
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

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-semibold mb-3">Choose your plan</h1>
          <p className="text-muted-foreground">
            Based on your preferences, we've highlighted the best plan for you.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {basePlans.map((plan) => {
            const isRecommended = plan.id === recommendedPlan;
            return (
              <Card 
                key={plan.id} 
                className={`relative ${isRecommended ? "ring-2 ring-primary" : ""}`}
                data-testid={`card-plan-${plan.id}`}
              >
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      <Star className="w-3 h-3 mr-1" />
                      Recommended for you
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
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
                  <Button
                    className="w-full"
                    variant={isRecommended ? "default" : "outline"}
                    onClick={() => selectPlanMutation.mutate(plan.id)}
                    disabled={selectPlanMutation.isPending}
                    data-testid={`button-select-plan-${plan.id}`}
                  >
                    {selectPlanMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {plan.id === "free" ? "Get Started" : "Subscribe"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          All plans include a 14-day money-back guarantee. No credit card required for free plan.
        </p>
      </div>
    </div>
  );
}

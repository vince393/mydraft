import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Check, Loader2, Sparkles } from "lucide-react";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for trying out MailFlow",
    features: [
      "Connect 1 email account",
      "5 AI replies per day",
      "Basic inbox management",
      "Standard support",
    ],
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$12",
    period: "month",
    description: "For professionals who need more",
    features: [
      "Connect 3 email accounts",
      "Unlimited AI replies",
      "Advanced tone customization",
      "Email scheduling",
      "Priority support",
    ],
    popular: true,
  },
  {
    id: "business",
    name: "Business",
    price: "$29",
    period: "month",
    description: "For teams and power users",
    features: [
      "Connect unlimited accounts",
      "Unlimited AI replies",
      "Custom AI training",
      "Team collaboration",
      "API access",
      "Dedicated support",
    ],
    popular: false,
  },
];

export default function PricingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const selectPlanMutation = useMutation({
    mutationFn: async (plan: string) => {
      const response = await apiRequest("POST", "/api/user/plan", { plan });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/onboarding");
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
            Start free and upgrade as you grow. All plans include core inbox features.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative ${plan.popular ? "ring-2 ring-primary" : ""}`}
              data-testid={`card-plan-${plan.id}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Most Popular
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
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => selectPlanMutation.mutate(plan.id)}
                  disabled={selectPlanMutation.isPending}
                  data-testid={`button-select-plan-${plan.id}`}
                >
                  {selectPlanMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {plan.id === "free" ? "Get Started" : "Subscribe"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          All plans include a 14-day money-back guarantee. No credit card required for free plan.
        </p>
      </div>
    </div>
  );
}

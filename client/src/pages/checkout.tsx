import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Loader2, Shield, Check, Lock, CreditCard, Sparkles } from "lucide-react";
import type { User } from "@shared/schema";

interface AuthResponse {
  user: User | null;
}

const planDetails: Record<string, { name: string; description: string; features: string[] }> = {
  student: {
    name: "Student",
    description: "50% student discount",
    features: ["Unlimited AI replies", "Email humanizer", "Tone customization", "Priority support"],
  },
  pro: {
    name: "Pro",
    description: "For professionals who need more",
    features: ["Personal writing style memory", "100 AI emails per day", "Advanced automation", "API access"],
  },
  business: {
    name: "Business",
    description: "For teams and power users",
    features: ["Unlimited AI assistance", "Voice assistant", "Custom AI training", "Dedicated support"],
  },
};

const pricing: Record<string, Record<string, { amount: number; period: string }>> = {
  student: {
    monthly: { amount: 5, period: "/month" },
    annual: { amount: 45, period: "/year" },
  },
  pro: {
    monthly: { amount: 10, period: "/month" },
    annual: { amount: 99, period: "/year" },
  },
  business: {
    monthly: { amount: 29, period: "/month" },
    annual: { amount: 299, period: "/year" },
  },
};

function CheckoutForm({ plan, interval, onSuccess }: { plan: string; interval: string; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  const setupIntentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/stripe/create-setup-intent", { plan, interval });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to initialize payment");
      }
      return response.json();
    },
    onError: (error: Error) => {
      setSetupError(error.message);
    },
  });

  const confirmSubscriptionMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const response = await apiRequest("POST", "/api/stripe/confirm-subscription", { 
        plan, 
        interval, 
        paymentMethodId 
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create subscription");
      }
      return response.json();
    },
  });

  useEffect(() => {
    setSetupError(null);
    setupIntentMutation.mutate();
  }, [plan, interval]);

  const handleRetrySetup = () => {
    setSetupError(null);
    setupIntentMutation.mutate();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      return;
    }

    setIsProcessing(true);
    setCardError(null);

    try {
      const clientSecret = setupIntentMutation.data?.clientSecret;
      if (!clientSecret) {
        throw new Error("Payment not initialized. Please refresh and try again.");
      }

      const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (error) {
        setCardError(error.message || "Payment failed");
        setIsProcessing(false);
        return;
      }

      if (setupIntent?.payment_method) {
        const result = await confirmSubscriptionMutation.mutateAsync(setupIntent.payment_method as string);
        
        if (result.success) {
          await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
          toast({
            title: "Welcome to MyDraft!",
            description: "Your 14-day free trial has started.",
          });
          onSuccess();
        } else if (result.error) {
          setCardError(result.error);
        }
      }
    } catch (error: any) {
      setCardError(error.message || "Something went wrong");
    } finally {
      setIsProcessing(false);
    }
  };

  if (setupError) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">{setupError}</p>
        <Button onClick={handleRetrySetup} data-testid="button-retry-setup">
          Try again
        </Button>
      </div>
    );
  }

  const planInfo = planDetails[plan];
  const priceInfo = pricing[plan]?.[interval];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Card details</label>
          <div className="p-4 border border-border rounded-lg bg-background">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: "16px",
                    color: "hsl(var(--foreground))",
                    "::placeholder": {
                      color: "hsl(var(--muted-foreground))",
                    },
                    iconColor: "hsl(var(--primary))",
                  },
                  invalid: {
                    color: "hsl(var(--destructive))",
                    iconColor: "hsl(var(--destructive))",
                  },
                },
                hidePostalCode: false,
              }}
              onChange={(e) => {
                if (e.error) {
                  setCardError(e.error.message);
                } else {
                  setCardError(null);
                }
              }}
            />
          </div>
          {cardError && (
            <p className="text-sm text-destructive mt-2">{cardError}</p>
          )}
        </div>
      </div>

      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Plan</span>
          <span className="font-medium">{planInfo?.name}</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Billing</span>
          <span className="font-medium capitalize">{interval}</span>
        </div>
        <div className="h-px bg-border my-3" />
        <div className="flex items-center justify-between">
          <span className="font-medium">Due today</span>
          <div className="text-right">
            <span className="text-lg font-bold text-emerald-500">$0.00</span>
            <p className="text-xs text-muted-foreground">14-day free trial</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          After your trial, you'll be charged ${priceInfo?.amount}{priceInfo?.period}
        </p>
      </div>

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!stripe || isProcessing || setupIntentMutation.isPending}
        data-testid="button-complete-payment"
      >
        {isProcessing || setupIntentMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Processing...
          </>
        ) : (
          <>
            <Lock className="w-4 h-4 mr-2" />
            Start 14-day free trial
          </>
        )}
      </Button>

      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Shield className="w-3 h-3" />
          <span>256-bit encryption</span>
        </div>
        <div className="flex items-center gap-1">
          <Lock className="w-3 h-3" />
          <span>Secure checkout</span>
        </div>
      </div>
    </form>
  );
}

export default function CheckoutPage() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const plan = params.get("plan") || "pro";
  const interval = params.get("interval") || "annual";
  
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);

  const { data: authData, isLoading: authLoading } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const { data: keyData } = useQuery<{ publishableKey: string }>({
    queryKey: ["/api/stripe/publishable-key"],
    retry: false,
  });

  useEffect(() => {
    if (keyData?.publishableKey) {
      setStripePromise(loadStripe(keyData.publishableKey));
    }
  }, [keyData?.publishableKey]);

  useEffect(() => {
    if (!authLoading && !authData?.user) {
      setLocation("/login");
    }
  }, [authData, authLoading, setLocation]);

  const handleSuccess = () => {
    setLocation("/connect-email");
  };

  const planInfo = planDetails[plan];
  const priceInfo = pricing[plan]?.[interval];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!planInfo || !priceInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Invalid plan</h1>
          <Button onClick={() => setLocation("/pricing")}>View plans</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          <div className="order-2 lg:order-1">
            <div className="lg:sticky lg:top-8">
              <h1 className="text-3xl font-bold mb-2">Complete your subscription</h1>
              <p className="text-muted-foreground mb-8">Start your 14-day free trial. Cancel anytime.</p>

              {stripePromise ? (
                <Elements stripe={stripePromise}>
                  <CheckoutForm plan={plan} interval={interval} onSuccess={handleSuccess} />
                </Elements>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <Card className="border-2 border-primary bg-gradient-to-br from-primary/5 via-background to-blue-500/5">
              <CardContent className="p-6 sm:p-8">
                <Badge className="bg-primary text-primary-foreground mb-4">
                  <Sparkles className="w-3 h-3 mr-1" />
                  14-day free trial
                </Badge>

                <h2 className="text-2xl sm:text-3xl font-bold mb-1">{planInfo.name}</h2>
                <p className="text-muted-foreground mb-6">{planInfo.description}</p>

                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-4xl sm:text-5xl font-bold">${priceInfo.amount}</span>
                  <span className="text-muted-foreground text-lg">{priceInfo.period}</span>
                </div>

                <div className="space-y-3 mb-8">
                  {planInfo.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-4 h-4 text-emerald-500" />
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">No charge today</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your card won't be charged until your 14-day trial ends. Cancel anytime with one click.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="mt-6 p-4 rounded-lg border border-border bg-card">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium mb-1">Your payment is secure</p>
                  <p className="text-sm text-muted-foreground">
                    We use Stripe for secure payment processing. Your card information is encrypted and never stored on our servers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Loader2, Shield, Check, Lock, CreditCard, Sparkles, Clock, Zap } from "lucide-react";
import logoPath from "@assets/bd6ad8b0-8b19-4e70-8b55-0ddd333f446e_removalai_preview_1768612163407.png";
import type { User } from "@shared/schema";

interface AuthResponse {
  user: User | null;
}

const planDetails: Record<string, { name: string; description: string; features: string[]; accent: string }> = {
  pro: {
    name: "Pro",
    description: "For professionals who need more",
    features: ["Personal writing style memory", "100 AI emails per day", "Advanced automation", "API access"],
    accent: "blue",
  },
  business: {
    name: "Business",
    description: "For teams and power users",
    features: ["Unlimited AI assistance", "Voice assistant", "Custom AI training", "Dedicated support"],
    accent: "amber",
  },
};

const pricing: Record<string, Record<string, { amount: number; period: string; monthly: number }>> = {
  pro: {
    monthly: { amount: 10, period: "/month", monthly: 10 },
    annual: { amount: 99, period: "/year", monthly: 8.25 },
  },
  business: {
    monthly: { amount: 29, period: "/month", monthly: 29 },
    annual: { amount: 299, period: "/year", monthly: 24.92 },
  },
};

function CheckoutForm({ plan, interval, onSuccess }: { plan: string; interval: string; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [cardNumberComplete, setCardNumberComplete] = useState(false);
  const [cardExpiryComplete, setCardExpiryComplete] = useState(false);
  const [cardCvcComplete, setCardCvcComplete] = useState(false);
  const cardComplete = cardNumberComplete && cardExpiryComplete && cardCvcComplete && fullName.trim().length > 0;

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

    const cardNumberElement = elements.getElement(CardNumberElement);
    if (!cardNumberElement) {
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
          card: cardNumberElement,
          billing_details: {
            name: fullName.trim() || undefined,
            email: billingEmail.trim() || undefined,
            address: {
              line1: address.trim() || undefined,
              city: city.trim() || undefined,
              postal_code: postalCode.trim() || undefined,
              country: country.trim() || undefined,
            },
          },
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
      <div className="text-center py-12">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-5 h-5 text-destructive" />
        </div>
        <p className="text-sm text-destructive mb-4">{setupError}</p>
        <Button onClick={handleRetrySetup} variant="outline" data-testid="button-retry-setup">
          Try again
        </Button>
      </div>
    );
  }

  const planInfo = planDetails[plan];
  const priceInfo = pricing[plan]?.[interval];

  const stripeElementStyle = {
    base: {
      fontSize: "14px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      color: "#e2e8f0",
      letterSpacing: "0.01em",
      "::placeholder": { color: "#64748b" },
      iconColor: "#94a3b8",
    },
    invalid: { color: "#f87171", iconColor: "#f87171" },
  };

  const fieldBoxStyle = (hasError?: boolean) => ({
    background: "rgba(255,255,255,0.03)",
    border: hasError ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(255,255,255,0.08)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3.5">
        <label className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider block">Contact</label>
        <div className="space-y-3">
          <div>
            <Label htmlFor="fullName" className="text-xs text-muted-foreground/60 mb-1.5 block">Full name</Label>
            <Input
              id="fullName"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              data-testid="input-full-name"
            />
          </div>
          <div>
            <Label htmlFor="billingEmail" className="text-xs text-muted-foreground/60 mb-1.5 block">Email</Label>
            <Input
              id="billingEmail"
              type="email"
              placeholder="you@example.com"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              data-testid="input-billing-email"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3.5">
        <label className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider block">Card details</label>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground/60 mb-1.5 block">Card number</Label>
            <div className="p-3 rounded-lg" style={fieldBoxStyle(!!cardError)}>
              <CardNumberElement
                options={{ style: stripeElementStyle, showIcon: true }}
                onChange={(e) => {
                  setCardNumberComplete(e.complete);
                  if (e.error) setCardError(e.error.message);
                  else setCardError(null);
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground/60 mb-1.5 block">Expiry date</Label>
              <div className="p-3 rounded-lg" style={fieldBoxStyle()}>
                <CardExpiryElement
                  options={{ style: stripeElementStyle }}
                  onChange={(e) => {
                    setCardExpiryComplete(e.complete);
                    if (e.error) setCardError(e.error.message);
                    else if (!cardError || cardError.includes("expir")) setCardError(null);
                  }}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground/60 mb-1.5 block">CVC</Label>
              <div className="p-3 rounded-lg" style={fieldBoxStyle()}>
                <CardCvcElement
                  options={{ style: stripeElementStyle }}
                  onChange={(e) => {
                    setCardCvcComplete(e.complete);
                    if (e.error) setCardError(e.error.message);
                    else if (!cardError || cardError.includes("security")) setCardError(null);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        {cardError && (
          <p className="text-xs text-destructive flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-destructive flex-shrink-0" />
            {cardError}
          </p>
        )}
      </div>

      <div className="space-y-3.5">
        <label className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider block">Billing address</label>
        <div className="space-y-3">
          <div>
            <Label htmlFor="address" className="text-xs text-muted-foreground/60 mb-1.5 block">Street address</Label>
            <Input
              id="address"
              placeholder="123 Main St"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              data-testid="input-address"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="city" className="text-xs text-muted-foreground/60 mb-1.5 block">City</Label>
              <Input
                id="city"
                placeholder="New York"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                data-testid="input-city"
              />
            </div>
            <div>
              <Label htmlFor="postalCode" className="text-xs text-muted-foreground/60 mb-1.5 block">Postal code</Label>
              <Input
                id="postalCode"
                placeholder="10001"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                data-testid="input-postal-code"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="country" className="text-xs text-muted-foreground/60 mb-1.5 block">Country</Label>
            <Input
              id="country"
              placeholder="US"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              data-testid="input-country"
            />
          </div>
        </div>
      </div>

      <div 
        className="rounded-xl p-4"
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground/60">Plan</span>
          <span className="text-sm font-medium">{planInfo?.name}</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground/60">Billing cycle</span>
          <span className="text-sm font-medium capitalize">{interval}</span>
        </div>
        <div className="h-px my-3" style={{ background: "rgba(255,255,255,0.06)" }} />
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Due today</span>
          <div className="text-right">
            <span className="text-xl font-bold text-emerald-400">$0.00</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <Clock className="w-3 h-3 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground/50">
            After 14-day trial: ${priceInfo?.amount}{priceInfo?.period}
          </p>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full h-12 text-base font-medium"
        disabled={!stripe || isProcessing || setupIntentMutation.isPending || !cardComplete}
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
            Start free trial
          </>
        )}
      </Button>

      <p className="text-[11px] text-center text-muted-foreground/40 leading-relaxed">
        By subscribing, you agree to our terms. Your card will be charged ${priceInfo?.amount}{priceInfo?.period} after the trial period unless you cancel.
      </p>
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

  const { data: keyData, isError: keyError, error: keyErrorDetails } = useQuery<{ publishableKey: string }>({
    queryKey: ["/api/stripe/publishable-key"],
    retry: 2,
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
          <Button onClick={() => setLocation("/pricing")} data-testid="button-view-plans">View plans</Button>
        </div>
      </div>
    );
  }

  const savingsPercent = interval === "annual" ? Math.round((1 - priceInfo.monthly / pricing[plan].monthly.amount) * 100) : 0;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(59,130,246,0.06) 0%, transparent 70%)",
      }} />

      <div className="relative max-w-5xl mx-auto px-4 py-6 sm:py-10">
        <div className="flex items-center justify-between mb-8 sm:mb-12">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-sm text-muted-foreground/60 hover:text-foreground transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <img src={logoPath} alt="MyDraft" className="h-6 opacity-60" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
          <div className="lg:col-span-3 order-2 lg:order-1">
            <div className="lg:sticky lg:top-10">
              <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Start your free trial</h1>
                <p className="text-muted-foreground/60 text-sm">No charge for 14 days. Cancel anytime with one click.</p>
              </div>

              <div 
                className="rounded-2xl p-6 sm:p-8 mb-6"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.05)",
                }}
              >
                {stripePromise ? (
                  <Elements stripe={stripePromise}>
                    <CheckoutForm plan={plan} interval={interval} onSuccess={handleSuccess} />
                  </Elements>
                ) : keyError ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                      <CreditCard className="w-5 h-5 text-destructive" />
                    </div>
                    <p className="text-sm font-medium mb-1">Payment system unavailable</p>
                    <p className="text-xs text-muted-foreground/50 mb-4">Unable to load the payment form. Please try again.</p>
                    <Button 
                      variant="outline" 
                      onClick={() => window.location.reload()}
                      data-testid="button-retry-checkout"
                    >
                      Retry
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/40" />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground/30">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>256-bit SSL</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>PCI compliant</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Secure payment</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 order-1 lg:order-2">
            <div 
              className="rounded-2xl overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
                border: "1px solid rgba(255,255,255,0.10)",
                boxShadow: "0 12px 40px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    {plan === "business" ? (
                      <Zap className="w-5 h-5 text-amber-400" />
                    ) : (
                      <Sparkles className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{planInfo.name}</h2>
                    <p className="text-xs text-muted-foreground/50">{planInfo.description}</p>
                  </div>
                </div>

                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-4xl font-bold tracking-tight">${priceInfo.amount}</span>
                  <span className="text-muted-foreground/50 text-sm">{priceInfo.period}</span>
                </div>
                {interval === "annual" && savingsPercent > 0 && (
                  <p className="text-xs text-emerald-400/70 mb-6">
                    Save {savingsPercent}% vs monthly
                  </p>
                )}
                {interval === "monthly" && (
                  <div className="mb-6" />
                )}

                <div className="space-y-3">
                  {planInfo.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                        <Check className="w-2.5 h-2.5 text-emerald-400" />
                      </div>
                      <span className="text-sm text-foreground/70">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div 
                className="px-6 sm:px-8 py-4"
                style={{ 
                  background: "rgba(16, 185, 129, 0.04)",
                  borderTop: "1px solid rgba(16, 185, 129, 0.1)",
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-3 h-3 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-emerald-400/80">14-day free trial</p>
                    <p className="text-xs text-muted-foreground/40">No charge until trial ends</p>
                  </div>
                </div>
              </div>
            </div>

            <div 
              className="mt-4 rounded-xl p-4 flex items-start gap-3"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <Shield className="w-4 h-4 text-muted-foreground/30 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground/40 leading-relaxed">
                Your payment information is encrypted and processed securely. We never store your card details on our servers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

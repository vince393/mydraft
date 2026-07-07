import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { trackMetaEvent } from "@/lib/meta-pixel";
import { COUNTRIES, STATE_MAP } from "@/lib/countries";
import { WalletPaymentButton, type PaymentRequestPaymentMethodEvent } from "@/components/wallet-payment-button";
import { ArrowLeft, Loader2, Shield, Check, Lock, CreditCard, Sparkles, Clock, Zap, Ticket, X, CheckCircle2 } from "lucide-react";

function TypeaheadInput({ 
  items, 
  value, 
  onSelect, 
  placeholder, 
  testId 
}: { 
  items: { code: string; name: string }[]; 
  value: string; 
  onSelect: (code: string) => void; 
  placeholder: string; 
  testId: string;
}) {
  const [query, setQuery] = useState(() => items.find(i => i.code === value)?.name || "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useRef(`${testId}-listbox`).current;

  useEffect(() => {
    const name = items.find(i => i.code === value)?.name || "";
    setQuery(name);
  }, [value, items]);

  const filtered = query.length >= 1
    ? items.filter(i => i.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : [];

  const handleSelect = useCallback((code: string) => {
    const name = items.find(i => i.code === code)?.name || "";
    setQuery(name);
    onSelect(code);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
  }, [items, onSelect]);

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      setOpen(false);
      const name = items.find(i => i.code === value)?.name || "";
      setQuery(name);
    }, 200);
  }, [value, items]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open && query.length >= 1) { setOpen(true); return; }
      if (filtered.length > 0) setActiveIndex(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filtered.length > 0) setActiveIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0 && filtered[activeIndex]) {
      e.preventDefault();
      handleSelect(filtered[activeIndex].code);
    } else if (e.key === "Escape") {
      setOpen(false);
      const name = items.find(i => i.code === value)?.name || "";
      setQuery(name);
      inputRef.current?.blur();
    }
  };

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const el = listRef.current.children[activeIndex] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={activeIndex >= 0 && filtered[activeIndex] ? `${testId}-opt-${filtered[activeIndex].code}` : undefined}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(e.target.value.length >= 1);
          setActiveIndex(-1);
          if (!e.target.value) onSelect("");
        }}
        onFocus={() => { if (query.length >= 1) setOpen(true); }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        data-testid={testId}
        autoComplete="off"
      />
      {open && query.length >= 1 && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute z-50 top-full mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-border/40 bg-popover shadow-lg"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground/60">No results found</div>
          ) : filtered.map((item, i) => (
            <button
              key={item.code}
              id={`${testId}-opt-${item.code}`}
              type="button"
              role="option"
              aria-selected={value === item.code}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(item.code)}
              data-testid={`${testId}-option-${item.code}`}
              className={`flex items-center w-full px-3 py-2 text-sm text-left transition-colors cursor-pointer ${
                i === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
              } ${value === item.code ? "font-medium" : ""}`}
            >
              {value === item.code && <Check className="w-3.5 h-3.5 mr-2 text-primary flex-shrink-0" />}
              <span className={value !== item.code ? "ml-[22px]" : ""}>{item.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
import logoPath from "@assets/mydraft_logo.png";
import type { User } from "@shared/schema";

interface AuthResponse {
  user: User | null;
}

const planDetails: Record<string, { name: string; description: string; features: string[]; accent: string }> = {
  personal: {
    name: "Personal",
    description: "For everyday personal email",
    features: ["50 AI credits per month", "Writing style memory", "Advanced inbox management", "Email scheduling"],
    accent: "emerald",
  },
  pro: {
    name: "Pro",
    description: "For professionals who need more",
    features: ["200 AI credits per month", "Enhanced AI model (GPT-4o)", "Background auto-sort", "Priority support"],
    accent: "blue",
  },
  business: {
    name: "Business",
    description: "For teams and power users",
    features: ["500 AI credits per month", "Voice assistant", "Custom AI training", "Dedicated support"],
    accent: "amber",
  },
};

const pricing: Record<string, Record<string, { amount: number; period: string; monthly: number }>> = {
  personal: {
    monthly: { amount: 2.99, period: "/month", monthly: 2.99 },
    annual: { amount: 28.7, period: "/year", monthly: 2.39 },
  },
  pro: {
    monthly: { amount: 7.99, period: "/month", monthly: 7.99 },
    annual: { amount: 76.7, period: "/year", monthly: 6.39 },
  },
  business: {
    monthly: { amount: 19.99, period: "/month", monthly: 19.99 },
    annual: { amount: 191.9, period: "/year", monthly: 15.99 },
  },
};

function trackCheckoutConversion(plan: string, interval: string) {
  const value = pricing[plan]?.[interval]?.amount ?? 0;
  const params = { content_name: plan, interval, value, currency: "USD" };
  trackMetaEvent("Subscribe", params);
  if (plan === "personal") {
    trackMetaEvent("Purchase", { ...params, content_type: "subscription" });
  } else {
    trackMetaEvent("StartTrial", params);
  }
}

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
  const [billingState, setBillingState] = useState("");
  const [cardNumberComplete, setCardNumberComplete] = useState(false);
  const [cardExpiryComplete, setCardExpiryComplete] = useState(false);
  const [cardCvcComplete, setCardCvcComplete] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState<{ code: string; creditMonths: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoValidating, setPromoValidating] = useState(false);
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
        paymentMethodId,
        promoCode: promoApplied?.code,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create subscription");
      }
      return response.json();
    },
  });

  const handleApplyPromo = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    setPromoError(null);
    setPromoValidating(true);
    try {
      const response = await apiRequest("POST", "/api/promo/validate", { code });
      if (!response.ok) {
        const err = await response.json();
        setPromoError(err.error || "Invalid promo code");
        return;
      }
      const data = await response.json();
      setPromoApplied({ code, creditMonths: data.creditMonths });
    } catch {
      setPromoError("Failed to validate promo code");
    } finally {
      setPromoValidating(false);
    }
  };

  const handleRemovePromo = () => {
    setPromoApplied(null);
    setPromoCode("");
    setPromoError(null);
  };

  useEffect(() => {
    setSetupError(null);
    setupIntentMutation.mutate();
  }, [plan, interval]);

  const handleRetrySetup = () => {
    setSetupError(null);
    setupIntentMutation.mutate();
  };

  const handleWalletConfirm = async (ev: PaymentRequestPaymentMethodEvent) => {
    if (!stripe) {
      ev.complete("fail");
      return;
    }
    const clientSecret = setupIntentMutation.data?.clientSecret;
    if (!clientSecret) {
      ev.complete("fail");
      setCardError("Payment not initialized. Please refresh and try again.");
      return;
    }

    setIsProcessing(true);
    setCardError(null);

    try {
      const { error, setupIntent } = await stripe.confirmCardSetup(
        clientSecret,
        { payment_method: ev.paymentMethod.id },
        { handleActions: false },
      );

      if (error) {
        ev.complete("fail");
        setCardError(error.message || "Payment failed");
        setIsProcessing(false);
        return;
      }

      ev.complete("success");

      let confirmed = setupIntent;
      if (confirmed?.status === "requires_action") {
        const next = await stripe.confirmCardSetup(clientSecret);
        if (next.error) {
          setCardError(next.error.message || "Authentication failed");
          setIsProcessing(false);
          return;
        }
        confirmed = next.setupIntent;
      }

      if (confirmed?.payment_method) {
        const result = await confirmSubscriptionMutation.mutateAsync(
          confirmed.payment_method as string,
        );
        if (result.success) {
          trackCheckoutConversion(plan, interval);
          await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
          toast({
            title: "Welcome to MyDraft!",
            description: plan === "personal"
              ? "Your Personal plan is now active."
              : "Your 3-day free trial has started.",
          });
          onSuccess();
        } else if (result.error) {
          setCardError(result.error);
        }
      }
    } catch (err: any) {
      setCardError(err.message || "Something went wrong");
    } finally {
      setIsProcessing(false);
    }
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
              state: billingState.trim() || undefined,
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
          trackCheckoutConversion(plan, interval);
          await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
          toast({
            title: "Welcome to MyDraft!",
            description: plan === "personal"
              ? "Your Personal plan is now active."
              : "Your 3-day free trial has started.",
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
  const isTrialPlan = plan !== "personal";

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
    background: "rgba(var(--overlay-rgb), 0.03)",
    border: hasError ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(var(--overlay-rgb), 0.08)",
    boxShadow: "inset 0 1px 0 rgba(var(--overlay-rgb), 0.04)",
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <WalletPaymentButton
        amountCents={Math.round((priceInfo?.amount || 0) * 100)}
        label={isTrialPlan ? `MyDraft ${planInfo?.name} (after trial)` : `MyDraft ${planInfo?.name}`}
        onWalletConfirm={handleWalletConfirm}
      />

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
            <Label className="text-xs text-muted-foreground/60 mb-1.5 block">Country</Label>
            <TypeaheadInput
              items={COUNTRIES}
              value={country}
              onSelect={(code) => { setCountry(code); setBillingState(""); }}
              placeholder="Type to search country..."
              testId="input-country"
            />
          </div>
          {country && STATE_MAP[country] && (
            <div>
              <Label className="text-xs text-muted-foreground/60 mb-1.5 block">State / Province</Label>
              <TypeaheadInput
                key={country}
                items={STATE_MAP[country] || []}
                value={billingState}
                onSelect={setBillingState}
                placeholder="Type to search state..."
                testId="input-state"
              />
            </div>
          )}
        </div>
      </div>

      <div 
        className="rounded-xl p-4"
        style={{
          background: "rgba(var(--overlay-rgb), 0.02)",
          border: "1px solid rgba(var(--overlay-rgb), 0.06)",
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
        <div className="h-px my-3" style={{ background: "rgba(var(--overlay-rgb), 0.06)" }} />
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Due today</span>
          <div className="text-right">
            <span className="text-xl font-bold text-emerald-400">
              {isTrialPlan ? "$0.00" : `$${priceInfo?.amount}`}
            </span>
          </div>
        </div>
        {isTrialPlan && (
          <div className="flex items-center gap-1.5 mt-2">
            <Clock className="w-3 h-3 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground/50">
              After 3-day trial: ${priceInfo?.amount}{priceInfo?.period}
            </p>
          </div>
        )}
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
            {isTrialPlan ? "Start free trial" : "Subscribe"}
          </>
        )}
      </Button>

      <p className="text-[11px] text-center text-muted-foreground/40 leading-relaxed">
        By subscribing, you agree to our{" "}
        <a href="/terms" target="_blank" className="underline hover:text-muted-foreground/60 transition-colors">Terms of Service</a>,{" "}
        <a href="/privacy" target="_blank" className="underline hover:text-muted-foreground/60 transition-colors">Privacy Policy</a>, and{" "}
        <a href="/refund-policy" target="_blank" className="underline hover:text-muted-foreground/60 transition-colors">Refund Policy</a>.
        {isTrialPlan
          ? ` Your card will be charged $${priceInfo?.amount}${priceInfo?.period} after the trial period unless you cancel.`
          : ` Your card will be charged $${priceInfo?.amount}${priceInfo?.period} today, recurring until you cancel.`}
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
  const isTrialPlan = plan !== "personal";

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
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">{isTrialPlan ? "Start your free trial" : "Complete your subscription"}</h1>
                <p className="text-muted-foreground/60 text-sm">{isTrialPlan ? "No charge for 3 days. Cancel anytime with one click." : "Activate your Personal plan. Cancel anytime with one click."}</p>
              </div>

              <div 
                className="rounded-2xl p-6 sm:p-8 mb-6"
                style={{
                  background: "linear-gradient(135deg, rgba(var(--overlay-rgb), 0.04) 0%, rgba(var(--overlay-rgb), 0.01) 100%)",
                  border: "1px solid rgba(var(--overlay-rgb), 0.08)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(var(--overlay-rgb), 0.05)",
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
                background: "linear-gradient(135deg, rgba(var(--overlay-rgb), 0.05) 0%, rgba(var(--overlay-rgb), 0.02) 100%)",
                border: "1px solid rgba(var(--overlay-rgb), 0.10)",
                boxShadow: "0 12px 40px rgba(0,0,0,0.15), inset 0 1px 0 rgba(var(--overlay-rgb), 0.06)",
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
                    <p className="text-sm font-medium text-emerald-400/80">{isTrialPlan ? "3-day free trial" : "Cancel anytime"}</p>
                    <p className="text-xs text-muted-foreground/40">{isTrialPlan ? "No charge until trial ends" : "Manage your plan from settings"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div 
              className="mt-4 rounded-xl p-4 flex items-start gap-3"
              style={{
                background: "rgba(var(--overlay-rgb), 0.02)",
                border: "1px solid rgba(var(--overlay-rgb), 0.05)",
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

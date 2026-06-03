import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Lock, Coins, CreditCard } from "lucide-react";

export interface CreditCheckoutItem {
  type: "pack" | "addon";
  sku: string;
  credits: number;
  price: number;
}

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
  border: hasError
    ? "1px solid rgba(239,68,68,0.4)"
    : "1px solid rgba(var(--overlay-rgb), 0.08)",
  boxShadow: "inset 0 1px 0 rgba(var(--overlay-rgb), 0.04)",
});

function CreditCheckoutForm({
  item,
  onSuccess,
}: {
  item: CreditCheckoutItem;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [cardNumberComplete, setCardNumberComplete] = useState(false);
  const [cardExpiryComplete, setCardExpiryComplete] = useState(false);
  const [cardCvcComplete, setCardCvcComplete] = useState(false);

  const isAddon = item.type === "addon";
  const cardComplete =
    cardNumberComplete &&
    cardExpiryComplete &&
    cardCvcComplete &&
    fullName.trim().length > 0;

  const initIntent = async () => {
    setInitializing(true);
    setSetupError(null);
    try {
      const endpoint = isAddon
        ? "/api/credits/create-addon-intent"
        : "/api/credits/create-pack-intent";
      const res = await apiRequest("POST", endpoint, { sku: item.sku });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start checkout");
      }
      const data = await res.json();
      setClientSecret(data.clientSecret);
    } catch (err: any) {
      setSetupError(err.message || "Failed to start checkout");
    } finally {
      setInitializing(false);
    }
  };

  useEffect(() => {
    initIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.sku, item.type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;

    const cardNumberElement = elements.getElement(CardNumberElement);
    if (!cardNumberElement) return;

    setIsProcessing(true);
    setCardError(null);

    const billingDetails = { name: fullName.trim() || undefined };

    try {
      if (isAddon) {
        const { error, setupIntent } = await stripe.confirmCardSetup(
          clientSecret,
          { payment_method: { card: cardNumberElement, billing_details: billingDetails } },
        );
        if (error) {
          setCardError(error.message || "Payment failed");
          setIsProcessing(false);
          return;
        }
        if (setupIntent?.payment_method) {
          const res = await apiRequest("POST", "/api/credits/confirm-addon", {
            sku: item.sku,
            paymentMethodId: setupIntent.payment_method as string,
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed to start add-on");
          }
        }
        toast({
          title: "Add-on active",
          description: `${item.credits.toLocaleString()} credits will be added every month.`,
        });
      } else {
        const { error, paymentIntent } = await stripe.confirmCardPayment(
          clientSecret,
          { payment_method: { card: cardNumberElement, billing_details: billingDetails } },
        );
        if (error) {
          setCardError(error.message || "Payment failed");
          setIsProcessing(false);
          return;
        }
        if (paymentIntent?.status === "succeeded") {
          const res = await apiRequest("POST", "/api/credits/confirm-pack", {
            paymentIntentId: paymentIntent.id,
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed to confirm purchase");
          }
        }
        toast({
          title: "Credits added",
          description: `${item.credits.toLocaleString()} credits added to your balance.`,
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/credits"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/credits/transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] }),
      ]);
      onSuccess();
    } catch (err: any) {
      setCardError(err.message || "Something went wrong");
    } finally {
      setIsProcessing(false);
    }
  };

  if (setupError) {
    return (
      <div className="text-center py-10">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-5 h-5 text-destructive" />
        </div>
        <p className="text-sm text-destructive mb-4">{setupError}</p>
        <Button onClick={initIntent} variant="outline" data-testid="button-retry-credit-setup">
          Try again
        </Button>
      </div>
    );
  }

  if (initializing) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label htmlFor="credit-card-name" className="text-xs text-muted-foreground/60 mb-1.5 block">
          Name on card
        </Label>
        <Input
          id="credit-card-name"
          placeholder="John Doe"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          data-testid="input-credit-card-name"
        />
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground/60 mb-1.5 block">Card number</Label>
          <div className="p-3 rounded-lg" style={fieldBoxStyle(!!cardError)}>
            <CardNumberElement
              options={{ style: stripeElementStyle, showIcon: true }}
              onChange={(e) => {
                setCardNumberComplete(e.complete);
                setCardError(e.error ? e.error.message : null);
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
        {cardError && (
          <p className="text-xs text-destructive flex items-center gap-1.5" data-testid="text-credit-card-error">
            <span className="w-1 h-1 rounded-full bg-destructive flex-shrink-0" />
            {cardError}
          </p>
        )}
      </div>

      <div
        className="rounded-xl p-4"
        style={{
          background: "rgba(var(--overlay-rgb), 0.02)",
          border: "1px solid rgba(var(--overlay-rgb), 0.06)",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground/60">
            {isAddon ? "Monthly credits" : "Credits"}
          </span>
          <span className="text-sm font-medium flex items-center gap-1">
            <Coins className="w-3.5 h-3.5 text-primary" />
            {item.credits.toLocaleString()}
            {isAddon && <span className="text-muted-foreground/50"> / mo</span>}
          </span>
        </div>
        <div className="h-px my-3" style={{ background: "rgba(var(--overlay-rgb), 0.06)" }} />
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{isAddon ? "Billed monthly" : "Due today"}</span>
          <span className="text-xl font-bold text-foreground" data-testid="text-credit-due">
            ${item.price}
            {isAddon && <span className="text-sm font-medium text-muted-foreground/50">/mo</span>}
          </span>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full h-12 text-base font-medium"
        disabled={!stripe || isProcessing || !cardComplete}
        data-testid="button-confirm-credit-purchase"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Processing...
          </>
        ) : (
          <>
            <Lock className="w-4 h-4 mr-2" />
            {isAddon ? "Subscribe" : "Pay"} ${item.price}
            {isAddon && "/mo"}
          </>
        )}
      </Button>

      <p className="text-[11px] text-center text-muted-foreground/40 leading-relaxed">
        {isAddon
          ? "You can cancel anytime. Your card will be charged monthly until you cancel."
          : "One-time purchase. Credits expire 30 days after they are added."}
      </p>
    </form>
  );
}

export function CreditCheckoutDialog({
  item,
  onClose,
}: {
  item: CreditCheckoutItem | null;
  onClose: () => void;
}) {
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);

  const { data: keyData } = useQuery<{ publishableKey: string }>({
    queryKey: ["/api/stripe/publishable-key"],
    retry: 2,
  });

  useEffect(() => {
    if (keyData?.publishableKey) {
      setStripePromise(loadStripe(keyData.publishableKey));
    }
  }, [keyData?.publishableKey]);

  const isAddon = item?.type === "addon";

  return (
    <Dialog open={!!item} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-credit-checkout">
        <DialogHeader>
          <DialogTitle>{isAddon ? "Subscribe to add-on" : "Buy credits"}</DialogTitle>
          <DialogDescription>
            {isAddon
              ? "Get a fresh batch of credits automatically every month."
              : "Securely pay with your card. Credits are added instantly."}
          </DialogDescription>
        </DialogHeader>
        {item && stripePromise ? (
          <Elements stripe={stripePromise}>
            <CreditCheckoutForm item={item} onSuccess={onClose} />
          </Elements>
        ) : (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/50" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

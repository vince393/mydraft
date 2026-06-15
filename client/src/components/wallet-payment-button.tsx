import { useEffect, useRef, useState } from "react";
import { useStripe, PaymentRequestButtonElement } from "@stripe/react-stripe-js";
import type {
  PaymentRequest,
  PaymentRequestPaymentMethodEvent,
} from "@stripe/stripe-js";

export type { PaymentRequestPaymentMethodEvent };

/**
 * Apple Pay / Google Pay button backed by the Stripe Payment Request API.
 *
 * Renders nothing unless the visitor's browser/device actually supports a
 * wallet (Apple Pay on Safari/Apple devices, Google Pay on Chrome/Android).
 * That means it stays hidden in the dev preview and only appears for real
 * wallet-capable visitors once the site is live on its registered domain.
 *
 * Must be rendered inside a Stripe `<Elements>` provider. The parent owns the
 * confirm logic via `onWalletConfirm`, which receives the Stripe
 * `paymentmethod` event (call `ev.complete(...)` inside it).
 */
export function WalletPaymentButton({
  amountCents,
  label,
  onWalletConfirm,
  className,
}: {
  amountCents: number;
  label: string;
  onWalletConfirm: (ev: PaymentRequestPaymentMethodEvent) => Promise<void> | void;
  className?: string;
}) {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const handlerRef = useRef(onWalletConfirm);
  handlerRef.current = onWalletConfirm;

  useEffect(() => {
    if (!stripe || !amountCents || amountCents <= 0) {
      setPaymentRequest(null);
      return;
    }

    let cancelled = false;
    const pr = stripe.paymentRequest({
      country: "US",
      currency: "usd",
      total: { label, amount: Math.round(amountCents) },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    const onPaymentMethod = async (ev: PaymentRequestPaymentMethodEvent) => {
      // Track completion so we never call ev.complete() twice (Stripe throws on
      // a second call) and never leave the wallet sheet hanging if the handler
      // throws or returns before resolving the event.
      let completed = false;
      const originalComplete = ev.complete.bind(ev);
      ev.complete = ((status: "success" | "fail") => {
        completed = true;
        return originalComplete(status);
      }) as typeof ev.complete;

      try {
        await handlerRef.current(ev);
      } catch {
        // handler errors are surfaced via its own UI state; ignore here
      } finally {
        if (!completed) {
          try {
            ev.complete("fail");
          } catch {
            /* already resolved */
          }
        }
      }
    };
    pr.on("paymentmethod", onPaymentMethod);

    pr.canMakePayment().then((result) => {
      if (!cancelled && result) {
        setPaymentRequest(pr);
      }
    });

    return () => {
      cancelled = true;
      const maybeOff = (pr as unknown as { off?: (e: string, fn: unknown) => void }).off;
      if (typeof maybeOff === "function") {
        maybeOff.call(pr, "paymentmethod", onPaymentMethod);
      }
    };
  }, [stripe, amountCents, label]);

  if (!paymentRequest) return null;

  return (
    <div className={className} data-testid="wallet-payment-section">
      <PaymentRequestButtonElement
        options={{
          paymentRequest,
          style: {
            paymentRequestButton: {
              type: "default",
              theme: "dark",
              height: "48px",
            },
          },
        }}
      />
      <div className="flex items-center gap-3 my-5">
        <div className="h-px flex-1" style={{ background: "rgba(var(--overlay-rgb), 0.08)" }} />
        <span className="text-xs text-muted-foreground/40">or pay with card</span>
        <div className="h-px flex-1" style={{ background: "rgba(var(--overlay-rgb), 0.08)" }} />
      </div>
    </div>
  );
}

import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';
import { sendPlanPurchaseEmail, sendBillingReceiptEmail } from './email';
import {
  PLAN_PRICES,
  grantPlanMonthlyCredits,
  grantCredits,
  createCreditAddon,
  cancelCreditAddon,
  getAddonBySubscriptionId,
} from './credits';

const KNOWN_PRICE_AMOUNTS: Record<number, 'pro' | 'premium'> = {
  [PLAN_PRICES.pro.monthly]: 'pro',         // Pro monthly: $4.99/mo
  [PLAN_PRICES.pro.annual]: 'pro',          // Pro annual
  [PLAN_PRICES.premium.monthly]: 'premium', // Business monthly: $14.99/mo
  [PLAN_PRICES.premium.annual]: 'premium',  // Business annual
  // Legacy prices (so existing subs map correctly until migrated)
  1000: 'pro',
  9900: 'pro',
  2900: 'premium',
  29900: 'premium',
};

function determinePlanFromAmount(amount: number): 'free' | 'pro' | 'premium' {
  return KNOWN_PRICE_AMOUNTS[amount] || 'free';
}

function determinePlanFromMetadataOrAmount(metadata: any, amount: number): 'free' | 'pro' | 'premium' {
  const planFromMetadata = metadata?.plan;
  if (planFromMetadata === 'pro') return 'pro';
  if (planFromMetadata === 'premium' || planFromMetadata === 'business') return 'premium';
  return determinePlanFromAmount(amount);
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (webhookSecret) {
      const stripe = await getUncachableStripeClient();
      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      await WebhookHandlers.handleStripeEvent(event);
    } else if (process.env.NODE_ENV === 'development') {
      console.warn('[Webhook] No STRIPE_WEBHOOK_SECRET set — processing unverified event (dev only)');
      const event = JSON.parse(payload.toString());
      await WebhookHandlers.handleStripeEvent(event);
    } else {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured. Cannot verify webhook signature.');
    }
  }

  static async handleStripeEvent(event: any): Promise<void> {
    const { type, data } = event;

    switch (type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = data.object;
        const customerId = subscription.customer;
        const subscriptionId = subscription.id;
        const status = subscription.status;
        
        const user = await storage.getUserByStripeCustomerId(customerId);
        if (!user) {
          console.log(`[Webhook] No user found for customer ${customerId}`);
          return;
        }

        const priceId = subscription.items?.data?.[0]?.price?.id;
        let plan: 'free' | 'pro' | 'premium' = 'free';
        let priceMeta: any = {};

        if (priceId) {
          const stripe = await getUncachableStripeClient();
          const price = await stripe.prices.retrieve(priceId);
          priceMeta = price.metadata || {};
          plan = determinePlanFromMetadataOrAmount(price.metadata, price.unit_amount || 0);
        }

        // Recurring credit add-ons are separate subscriptions — never touch the user's plan.
        if (priceMeta.type === 'addon') {
          const credits = parseInt(priceMeta.credits || '0', 10);
          if (type === 'customer.subscription.created' && credits > 0) {
            const existing = await getAddonBySubscriptionId(subscriptionId);
            if (!existing) {
              await createCreditAddon({ userId: user.id, stripeSubscriptionId: subscriptionId, creditsPerMonth: credits });
              console.log(`[Webhook] Recorded ${credits}/mo add-on for user ${user.id}`);
            }
          }
          if (status === 'canceled' || status === 'incomplete_expired') {
            await cancelCreditAddon(subscriptionId);
          }
          break;
        }

        if (status === 'active' || status === 'trialing') {
          await storage.updateUser(user.id, {
            stripeSubscriptionId: subscriptionId,
            plan,
            trialEndsAt: null,
          });
          console.log(`[Webhook] Updated user ${user.id} to plan ${plan} (status: ${status})`);

          if (type === 'customer.subscription.created' && plan !== 'free') {
            try {
              const planLabel = plan === 'premium' ? 'Business' : 'Pro';
              const price = subscription.items?.data?.[0]?.price;
              const amt = price?.unit_amount ? `$${(price.unit_amount / 100).toFixed(2)}` : '';
              const interval = price?.recurring?.interval === 'year' ? 'annually' : 'monthly';
              await sendPlanPurchaseEmail(user.email, planLabel, amt, interval);
            } catch (emailErr) { console.error("[Webhook] Failed to send plan purchase email:", emailErr); }
          }
        } else if (status === 'past_due' || status === 'unpaid') {
          console.log(`[Webhook] Subscription ${subscriptionId} is ${status} for user ${user.id} — keeping current plan but flagging`);
          await storage.createActivityLog(
            user.id,
            user.email,
            "payment_issue",
            `Subscription status changed to ${status}. Payment retry in progress.`,
          );
        } else if (status === 'canceled' || status === 'incomplete_expired') {
          await storage.updateUser(user.id, {
            stripeSubscriptionId: null,
            plan: 'free',
          });
          console.log(`[Webhook] Downgraded user ${user.id} to free (subscription ${status})`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = data.object;
        const customerId = subscription.customer;

        // If this subscription is a recurring credit add-on, just cancel the add-on
        // and leave the user's plan untouched.
        const addon = await getAddonBySubscriptionId(subscription.id);
        if (addon) {
          await cancelCreditAddon(subscription.id);
          console.log(`[Webhook] Canceled credit add-on ${subscription.id}`);
          break;
        }

        const user = await storage.getUserByStripeCustomerId(customerId);
        if (!user) return;

        await storage.updateUser(user.id, {
          stripeSubscriptionId: null,
          plan: 'free',
        });

        await storage.createActivityLog(
          user.id,
          user.email,
          "subscription_ended",
          `Subscription ${subscription.id} deleted. Plan downgraded to free.`,
        );

        console.log(`[Webhook] Downgraded user ${user.id} to free plan (subscription deleted)`);
        break;
      }

      case 'checkout.session.completed': {
        const session = data.object;
        const subscriptionId = session.subscription;
        const customerId = session.customer;

        // Resolve the user: prefer explicit metadata, fall back to customer lookup.
        let userId = session.metadata?.userId as string | undefined;
        if (!userId && customerId) {
          const u = await storage.getUserByStripeCustomerId(customerId as string);
          userId = u?.id;
        }

        // Link the PLAN subscription to the user (credits granted via invoice.paid).
        // Add-on subscriptions (type=addon) must NOT overwrite the primary plan
        // subscription id, or cancellation/downgrade logic keyed on it will break.
        const isAddonCheckout = session.metadata?.type === 'addon';
        if (userId && subscriptionId && !isAddonCheckout) {
          const updates: any = { stripeSubscriptionId: subscriptionId };
          if (customerId) updates.stripeCustomerId = customerId;
          await storage.updateUser(userId, updates);
          console.log(`[Webhook] Linked subscription ${subscriptionId} to user ${userId}`);
        } else if (userId && customerId && isAddonCheckout) {
          // Still ensure the customer id is linked for add-on purchases.
          await storage.updateUser(userId, { stripeCustomerId: customerId } as any);
        }

        // One-time credit pack purchase (payment mode → no invoice.paid). Granted
        // here from session metadata. Add-ons (subscription mode) are recorded by
        // the subscription.created handler and granted via invoice.paid.
        if (userId && session.metadata?.type === 'pack' && session.mode === 'payment') {
          try {
            const credits = parseInt(session.metadata.credits || '0', 10);
            if (credits > 0) {
              await grantCredits({
                userId,
                amount: credits,
                source: 'pack',
                action: 'pack_purchase',
                reference: session.id,
                idempotencyKey: `pack:${session.id}`,
                metadata: { stripeSessionId: session.id, packCredits: credits, note: session.metadata.sku },
              });
              console.log(`[Webhook] Granted ${credits} pack credits to user ${userId}`);
            }
          } catch (packErr) {
            console.error('[Webhook] Failed to grant pack credits:', packErr);
          }
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = data.object;
        const customerId = invoice.customer;
        const amountPaid = invoice.amount_paid || 0;
        const invoiceId = invoice.id;
        
        if (amountPaid <= 0) break;
        
        const user = await storage.getUserByStripeCustomerId(customerId);

        // Note: referral rewards are granted when the referred user connects an email
        // account (grantReferralRewardOnConnect), not on subscription payment.

        let plan: 'free' | 'pro' | 'premium' = 'free';
        const lines = invoice.lines?.data || [];
        for (const line of lines) {
          const price = line.price;
          if (price) {
            plan = determinePlanFromMetadataOrAmount(price.metadata, price.unit_amount || 0);
            if (plan !== 'free') break;
          }
        }
        
        await storage.createRevenue({
          userId: user?.id,
          userEmail: user?.email || invoice.customer_email,
          plan,
          amount: amountPaid,
          type: 'subscription',
          stripePaymentId: invoice.payment_intent as string,
          stripeInvoiceId: invoiceId,
          description: `Invoice ${invoice.number || invoiceId}`,
        });
        
        console.log(`[Webhook] Recorded revenue: $${(amountPaid / 100).toFixed(2)} from ${user?.email || 'unknown'} (${plan} plan)`);

        // Grant credits for this invoice (covers both initial purchase and renewals).
        if (user) {
          for (const line of lines) {
            const price = line.price;
            if (!price) continue;
            const meta = price.metadata || {};
            const credits = parseInt(meta.credits || '0', 10);
            try {
              if (meta.type === 'addon' && credits > 0) {
                await grantCredits({
                  userId: user.id,
                  amount: credits,
                  source: 'addon',
                  action: 'addon_grant',
                  reference: invoiceId,
                  idempotencyKey: `invoice:${invoiceId}:${price.id}`,
                  metadata: { stripeInvoiceId: invoiceId, stripeSubscriptionId: invoice.subscription as string },
                });
                console.log(`[Webhook] Granted ${credits} add-on credits to user ${user.id}`);
              } else {
                const linePlan = determinePlanFromMetadataOrAmount(meta, price.unit_amount || 0);
                if (linePlan !== 'free') {
                  await grantPlanMonthlyCredits({
                    userId: user.id,
                    plan: linePlan,
                    stripeInvoiceId: invoiceId,
                    stripeSubscriptionId: invoice.subscription as string,
                  });
                  console.log(`[Webhook] Granted monthly ${linePlan} credits to user ${user.id}`);
                }
              }
            } catch (creditErr) {
              console.error('[Webhook] Failed to grant credits for invoice line:', creditErr);
            }
          }
        }

        if (user && amountPaid > 0) {
          try {
            const planLabel = plan === 'premium' ? 'Business' : plan === 'pro' ? 'Pro' : 'Free';
            const amtStr = `$${(amountPaid / 100).toFixed(2)}`;
            const dateStr = new Date((invoice.created || Date.now() / 1000) * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            await sendBillingReceiptEmail(user.email, planLabel, amtStr, dateStr, invoice.number || invoiceId);
          } catch (emailErr) { console.error("[Webhook] Failed to send receipt email:", emailErr); }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = data.object;
        const customerId = invoice.customer;
        const attemptCount = invoice.attempt_count || 1;
        
        const user = customerId ? await storage.getUserByStripeCustomerId(customerId as string) : null;
        if (!user) break;

        await storage.createActivityLog(
          user.id,
          user.email,
          "payment_failed",
          `Payment failed (attempt ${attemptCount}). Stripe will retry automatically.`,
        );

        console.log(`[Webhook] Payment failed for user ${user.id} (attempt ${attemptCount})`);
        break;
      }

      case 'charge.refunded': {
        const charge = data.object;
        const amountRefunded = charge.amount_refunded || 0;
        const customerId = charge.customer;
        
        if (amountRefunded <= 0) break;
        
        const user = customerId ? await storage.getUserByStripeCustomerId(customerId as string) : null;
        
        await storage.createRevenue({
          userId: user?.id,
          userEmail: user?.email || charge.billing_details?.email,
          plan: user?.plan || 'free',
          amount: -amountRefunded,
          type: 'refund',
          stripePaymentId: charge.id,
          description: `Refund for charge ${charge.id}`,
        });
        
        console.log(`[Webhook] Recorded refund: $${(amountRefunded / 100).toFixed(2)}`);
        break;
      }
    }
  }
}

import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';
import { sendPlanPurchaseEmail, sendBillingReceiptEmail } from './email';

const KNOWN_PRICE_AMOUNTS: Record<number, 'pro' | 'premium'> = {
  1000: 'pro',     // Pro monthly: $10/mo
  9900: 'pro',     // Pro annual: $99/yr
  2900: 'premium', // Business monthly: $29/mo
  29900: 'premium', // Business annual: $299/yr
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
        
        if (priceId) {
          const stripe = await getUncachableStripeClient();
          const price = await stripe.prices.retrieve(priceId);
          plan = determinePlanFromMetadataOrAmount(price.metadata, price.unit_amount || 0);
        }

        if (status === 'active' || status === 'trialing') {
          await storage.updateUser(user.id, {
            stripeSubscriptionId: subscriptionId,
            plan,
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
        const userId = session.metadata?.userId;
        const subscriptionId = session.subscription;
        const customerId = session.customer;
        
        if (userId && subscriptionId) {
          const updates: any = { stripeSubscriptionId: subscriptionId };
          if (customerId) {
            updates.stripeCustomerId = customerId;
          }
          await storage.updateUser(userId, updates);
          console.log(`[Webhook] Linked subscription ${subscriptionId} to user ${userId}`);
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

        if (user) {
          try {
            await storage.markReferralSubscribed(user.id);
          } catch (refErr) {
            console.error("[Webhook] Error marking referral subscribed:", refErr);
          }
        }
        
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

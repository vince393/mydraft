import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';

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

    // Let stripe-replit-sync handle the webhook and sync to database
    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    // Also handle custom business logic for subscription events
    try {
      const stripe = await getUncachableStripeClient();
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );

      await WebhookHandlers.handleStripeEvent(event);
    } catch (err) {
      // If webhook secret not set, try to parse event directly for handling
      // This is a fallback for development - managed webhooks handle signature verification
      const event = JSON.parse(payload.toString());
      await WebhookHandlers.handleStripeEvent(event);
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
        
        // Find user by stripe customer ID
        const user = await storage.getUserByStripeCustomerId(customerId);
        if (!user) {
          console.log(`No user found for customer ${customerId}`);
          return;
        }

        // Get the price to determine the plan
        const priceId = subscription.items?.data?.[0]?.price?.id;
        let plan: 'free' | 'pro' | 'premium' = 'free';
        
        if (priceId) {
          // Look up price metadata to determine plan
          const stripe = await getUncachableStripeClient();
          const price = await stripe.prices.retrieve(priceId);
          const planFromMetadata = price.metadata?.plan;
          
          if (planFromMetadata === 'pro') {
            plan = 'pro';
          } else if (planFromMetadata === 'premium' || planFromMetadata === 'business') {
            plan = 'premium';
          } else {
            // Determine by price amount
            const amount = price.unit_amount || 0;
            if (amount >= 4900) {
              plan = 'premium';
            } else if (amount >= 2400) {
              plan = 'pro';
            }
          }
        }

        // Only update plan if subscription is active
        if (status === 'active' || status === 'trialing') {
          await storage.updateUser(user.id, {
            stripeSubscriptionId: subscriptionId,
            plan,
          });
          console.log(`Updated user ${user.id} to plan ${plan}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = data.object;
        const customerId = subscription.customer;
        
        const user = await storage.getUserByStripeCustomerId(customerId);
        if (!user) return;

        // Downgrade to free plan
        await storage.updateUser(user.id, {
          stripeSubscriptionId: null,
          plan: 'free',
        });
        console.log(`Downgraded user ${user.id} to free plan`);
        break;
      }

      case 'checkout.session.completed': {
        const session = data.object;
        const userId = session.metadata?.userId;
        const subscriptionId = session.subscription;
        
        if (userId && subscriptionId) {
          await storage.updateUser(userId, {
            stripeSubscriptionId: subscriptionId,
          });
          console.log(`Linked subscription ${subscriptionId} to user ${userId}`);
        }
        break;
      }
    }
  }
}

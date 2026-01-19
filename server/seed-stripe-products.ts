// Stripe Products Seed Script for MyDraft Payment Plans
// Run with: npx tsx server/seed-stripe-products.ts

import { getUncachableStripeClient } from './stripeClient';

async function seedProducts() {
  console.log('Creating Stripe products for MyDraft...\n');
  
  const stripe = await getUncachableStripeClient();
  
  // Check if products already exist
  const existingProducts = await stripe.products.search({ query: "active:'true'" });
  const existingNames = existingProducts.data.map(p => p.name);
  
  // Pro Plan - $19/month or $199/year
  if (!existingNames.includes('MyDraft Pro')) {
    console.log('Creating Pro Plan...');
    const proProduct = await stripe.products.create({
      name: 'MyDraft Pro',
      description: 'Professional email management with AI-powered features',
      metadata: {
        plan: 'pro',
        features: 'AI draft generation, Priority support, Advanced filters, Unlimited emails'
      }
    });
    
    const proPrice = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 1900, // $19.00
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { plan: 'pro' }
    });
    
    console.log(`  Created: ${proProduct.name} (${proProduct.id})`);
    console.log(`  Price: $19/month (${proPrice.id})\n`);
  } else {
    console.log('Pro Plan already exists, skipping...\n');
  }
  
  // Business Plan - $49/month
  if (!existingNames.includes('MyDraft Business')) {
    console.log('Creating Business Plan...');
    const businessProduct = await stripe.products.create({
      name: 'MyDraft Business',
      description: 'Enterprise-grade email management for teams',
      metadata: {
        plan: 'premium',
        features: 'All Pro features, Team management, Priority queue, Custom integrations, Dedicated support'
      }
    });
    
    const businessPrice = await stripe.prices.create({
      product: businessProduct.id,
      unit_amount: 4900, // $49.00
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { plan: 'premium' }
    });
    
    console.log(`  Created: ${businessProduct.name} (${businessProduct.id})`);
    console.log(`  Price: $49/month (${businessPrice.id})\n`);
  } else {
    console.log('Business Plan already exists, skipping...\n');
  }
  
  console.log('Done! Products will be synced to the database via webhooks.');
  console.log('You can verify them at: https://dashboard.stripe.com/products');
}

seedProducts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error seeding products:', error);
    process.exit(1);
  });
